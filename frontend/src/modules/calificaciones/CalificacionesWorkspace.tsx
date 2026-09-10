import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useParams, useSearchParams, useLocation, Link, Navigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, BookOpenCheck, Camera, CheckCircle2, ChevronDown, ChevronRight,
  Clock, ExternalLink, FileImage, FileText, Pencil, RotateCcw,
  LoaderCircle, Pause, Play, Search, ShieldAlert, Sparkles, Square, X,
} from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { useEstudiantes } from '@/modules/materias/hooks';
import { getEvaluacion, listEvaluaciones } from '@/modules/evaluaciones/api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  elapsedFromMonotonic,
  listTeacherWorkSessions,
  sendTeacherWorkCommand,
  startTeacherWorkSession,
  trackEvent,
  type TeacherWorkCondition,
  type TeacherWorkPhase,
  type TeacherWorkSession,
} from '@/lib/analytics';
import { routes } from '@/config/routes';
import { useAuth } from '@/stores/auth';
import { GradingUploadPanel } from '@/modules/materias/MateriaCalificar';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  ajustarNota, ajustarNotaBatch, confirmarNota, confirmarNotaBatch,
  crearIncidencia, getEvaluationReview, getCalificacionDetalle, listarIncidencias,
  establecerNotaManual, publicarNota, publicarNotaBatch,
  marcarRevisionManual, resolverIncidencia, setAnswersReleased, solicitarReemplazoEvidencia, updateGradeBreakdown,
  reintentarCalificacionFoto,
} from './api';
import { addPendingGrading } from './gradingJobs';
import { GradingJobMonitor } from './GradingJobMonitor';
import { RevisionGuide } from './RevisionGuide';
import { GradeBreakdown } from './components/GradeBreakdown';
import { GradeComponentEditor } from './components/GradeComponentEditor';
import { GradeGlobalAdjustmentEditor } from './components/GradeGlobalAdjustmentEditor';
import { GradeBreakdownHistory } from './components/GradeBreakdownHistory';
import { formatAIModelSource } from './aiPipelineLabels';
import { effectiveGradeScore, gradePresentation, isGradeProcessing } from './gradePresentation';
import { formatTimelineScore } from './timeline';
import type { BatchResult, Calificacion, CalificacionDetalle, GradeBreakdownData, GradeComponentChange, ReviewFilter } from '@/types/api';

type WorkspaceGrade = Pick<Calificacion, 'id' | 'estudiante_id' | 'nota_sugerida' | 'nota_confirmada' | 'estado' | 'resultado_json'>;

export function GradingLegacyRedirect() {
  const location = useLocation();
  const { id, evaluacionId } = useParams();
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  if (id) next.set('materia', id);
  if (evaluacionId) next.set('evaluacion', evaluacionId);
  if (location.pathname.endsWith('/calificaciones/foto')) next.set('modo', 'carga');
  return <Navigate to={`${routes.calificacionesWorkspace}?${next}`} replace />;
}

const CONFIRMADA = 'confirmada';
const AJUSTADA = 'ajustada';
const PUBLICADA = 'publicada';

// Las banderas de investigación son independientes de la revisión docente.
const gradingFeatureFlags = Object.freeze({
  teacherWorkTiming: import.meta.env.VITE_TEACHER_WORK_TIMING_ENABLED === 'true',
  impactStudy: import.meta.env.VITE_IMPACT_STUDY_ENABLED === 'true',
});


/* States considered "teacher approved" */
const DONE_STATES = new Set([CONFIRMADA, AJUSTADA, PUBLICADA]);

/* ─── Helper ─── */
function studentLabel(
  c: Pick<Calificacion, 'estudiante_id'>,
  studentMap: Map<string, { nombre: string; email?: string }>,
) {
  const s = studentMap.get(c.estudiante_id);
  return s?.nombre ?? `ID ${c.estudiante_id.slice(0, 8)}`;
}

/* ─── Sub-componente: Timeline ─── */
export function Timeline({ events }: { events: CalificacionDetalle['timeline'] }) {
  const [open, setOpen] = useState(false);
  if (!events || events.length === 0) return null;
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="focus-ring flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted" />
          Historial de cambios ({events.length})
        </span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border px-4 pb-3 pt-2">
          {events.map((ev, i) => (
            <div key={i} className="flex items-start gap-3 text-xs">
              <div className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                ev.tipo === 'confirmada' ? 'bg-emerald-500' : ev.tipo === 'ajustada' ? 'bg-amber-500' : 'bg-sky-500'
              }`}>
                {i + 1}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {ev.tipo === 'confirmada' ? 'Confirmada' : ev.tipo === 'ajustada' ? 'Ajustada' : ev.tipo}
                  {formatTimelineScore(ev.nota_anterior) != null && formatTimelineScore(ev.nota_nueva) != null && (
                    <>: {formatTimelineScore(ev.nota_anterior)} → {formatTimelineScore(ev.nota_nueva)}</>
                  )}
                </p>
                {ev.detalle && <p className="text-muted">{ev.detalle}</p>}
                {ev.feedback && <p className="mt-0.5 italic text-muted">"{ev.feedback}"</p>}
                <div className="mt-0.5 flex gap-2 text-muted">
                  {ev.actor_nombre && <span>{ev.actor_nombre}</span>}
                  {ev.timestamp && <span>{new Date(ev.timestamp).toLocaleString('es-CO')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-componente: Resumen IA ─── */
function AIPipelineSummary({
  confianza,
  graderA,
  graderB,
  comparator,
  vision,
  answerKeyIncomplete,
  timings,
  strategy,
}: {
  confianza: number | null;
  graderA: Record<string, unknown> | undefined;
  graderB: Record<string, unknown> | undefined;
  comparator: Record<string, unknown> | undefined;
  vision: Record<string, unknown> | undefined;
  answerKeyIncomplete: boolean;
  timings?: Record<string, number>;
  strategy?: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);

  const graderAError = Boolean(graderA?.error);
  const graderBError = Boolean(graderB?.error);
  const discrepancia = Boolean(comparator?.discrepancia);
  const confianzaAlta = confianza != null && confianza >= 0.7;
  const confianzaMedia = confianza != null && confianza >= 0.4 && confianza < 0.7;
  const arbiterInvoked = Boolean(strategy?.arbiter_invoked);

  let summary: { label: string; tone: string; icon: string };
  if (answerKeyIncomplete) {
    summary = { label: 'La clave de respuestas está incompleta. Valida las respuestas antes de confirmar.', tone: 'rose', icon: '⚠' };
  } else if (graderAError && graderBError) {
    summary = { label: 'Error en análisis automático. Se requiere revisión docente.', tone: 'rose', icon: '⚠️' };
  } else if (discrepancia) {
    summary = { label: 'El verificador detectó diferencias y se solicitó arbitraje. Revisa los criterios.', tone: 'amber', icon: '⚡' };
  } else if (confianzaAlta) {
    summary = { label: 'La calificación y su verificación coincidieron. Confianza alta.', tone: 'emerald', icon: '✓' };
  } else if (confianzaMedia) {
    summary = { label: 'Confianza media. Revisa los criterios detenidamente.', tone: 'amber', icon: '→' };
  } else {
    summary = { label: 'Confianza baja. Se recomienda revisión detallada.', tone: 'rose', icon: '⚠' };
  }

  const toneBorder = {
    emerald: 'border-emerald-200 dark:border-emerald-500/30',
    amber: 'border-amber-200 dark:border-amber-500/30',
    rose: 'border-rose-200 dark:border-rose-500/30',
  }[summary.tone] ?? 'border-border';

  return (
    <div className={`rounded-xl border ${toneBorder}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="focus-ring flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <span>{summary.icon} {summary.label}</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted">
          {expanded ? 'Ocultar detalles' : 'Ver detalles'}
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border px-4 py-3 text-xs">
          {timings?.total ? (
            <div className="mb-2 rounded-lg bg-surface-2 px-3 py-2 text-muted">
              Tiempo total: <strong className="text-fg">{Math.round(timings.total / 1000)} s</strong>
              {timings.extraction ? ' · lectura ' + Math.round(timings.extraction / 1000) + ' s' : ''}
              {timings.primary ? ' · evaluación ' + Math.round(timings.primary / 1000) + ' s' : ''}
              {timings.secondary ? ' · verificación ' + Math.round(timings.secondary / 1000) + ' s' : ''}
              {timings.consolidation ? ' · arbitraje ' + Math.round(timings.consolidation / 1000) + ' s' : ''}
            </div>
          ) : null}
          {vision && (
            <div className="flex items-center justify-between">
              <span>Visión ({formatAIModelSource(vision)})</span>
              <span className={vision.usable !== false ? 'text-emerald-600' : 'text-rose-600'}>
                {vision.usable !== false ? '✓' : '✗'} {vision.tiempo_ms ? `${vision.tiempo_ms}ms` : ''}
              </span>
            </div>
          )}
          {graderA && (
            <div className="flex items-center justify-between">
              <span>Calificador ({formatAIModelSource(graderA)})</span>
              <span className={graderA.error ? 'text-rose-600' : 'text-fg'}>
                {graderA.nota != null ? Number(graderA.nota).toFixed(1) : '—'}{graderA.tiempo_ms ? ' · ' + Math.round(Number(graderA.tiempo_ms) / 1000) + 's' : ''}
              </span>
            </div>
          )}
          {graderB && (
            <div className="flex items-center justify-between">
              <span>
                {strategy?.secondary_mode === 'pro_recovery' ? 'Recuperación Pro' : 'Verificador rápido'}
                {' '}({formatAIModelSource(graderB)})
              </span>
              <span className={graderB.error ? 'text-rose-600' : 'text-fg'}>
                {graderB.nota != null ? Number(graderB.nota).toFixed(1) : '—'}{graderB.tiempo_ms ? ' · ' + Math.round(Number(graderB.tiempo_ms) / 1000) + 's' : ''}
              </span>
            </div>
          )}
          {comparator && (
            <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
              <span>
                {strategy?.secondary_mode === 'pro_recovery'
                  ? 'Consolidado con recuperación Pro'
                  : arbiterInvoked
                    ? `Árbitro Pro (${formatAIModelSource(comparator)})`
                    : 'Consolidado'}
                {discrepancia ? ' ⚠️' : ''}
              </span>
              <span>{comparator.nota_final != null ? Number(comparator.nota_final).toFixed(1) : '—'}</span>
            </div>
          )}
          {!!comparator?.analisis && (
            <p className="pt-1 italic text-muted">{String(comparator.analisis)}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-componente: Incidencias ─── */

function IncidenciasSection({ calificacionId, onOpenComponent }: { calificacionId: string; onOpenComponent?: (componentId: string) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTipo, setNewTipo] = useState('confianza_baja');
  const [newDesc, setNewDesc] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveText, setResolveText] = useState('');

  const { data: incidencias, isLoading, isError, refetch } = useQuery({
    queryKey: ['incidencias', calificacionId],
    queryFn: () => listarIncidencias(calificacionId),
  });
  const createMut = useMutation({
    mutationFn: () => crearIncidencia(calificacionId, { tipo: newTipo, descripcion: newDesc }),
    onSuccess: () => { refetch(); void queryClient.invalidateQueries({ queryKey: ['evaluation-review'] }); setShowCreate(false); setNewDesc(''); toast.success('Incidencia creada'); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const resolveMut = useMutation({
    mutationFn: () => resolverIncidencia(resolveId!, resolveText),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['bandeja-docente'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-review'] });
      setResolveId(null);
      setResolveText('');
      toast.success('Incidencia resuelta');
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted">
          <ShieldAlert className="h-4 w-4" /> Incidencias y solicitudes {incidencias && incidencias.length > 0 && `(${incidencias.length})`}
        </p>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="focus-ring min-h-11 rounded-lg px-3 text-xs font-semibold text-brand-600 hover:text-brand-700">
          + Nueva
        </button>
      </div>

      {showCreate && (
        <div className="space-y-3 border-b border-border px-4 py-3">
          <Field label="Tipo">
            <select value={newTipo} onChange={(e) => setNewTipo(e.target.value)} className="focus-ring h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
              <option value="imagen_no_usable">Imagen no utilizable</option>
              <option value="vision_failed">Error de visión</option>
              <option value="grader_error">Error de calificación</option>
              <option value="discrepancia_alta">Discrepancia alta</option>
              <option value="confianza_baja">Confianza baja</option>
              <option value="docente_rechazo">Docente rechazó</option>
            </select>
          </Field>
          <Field label="Descripción">
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3}
              className="focus-ring w-full rounded-lg border border-border bg-surface-2 p-2 text-sm" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => createMut.mutate()} loading={createMut.isPending} disabled={!newDesc.trim()}>
              Crear incidencia
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : isError ? (
        <div role="alert" className="space-y-2 p-4 text-sm"><p>No se pudieron consultar las incidencias.</p><Button variant="outline" onClick={() => void refetch()}>Reintentar consulta</Button></div>
      ) : !incidencias || incidencias.length === 0 ? (
        <p className="p-4 text-center text-xs text-muted">Sin incidencias registradas.</p>
      ) : (
        <div className="space-y-2 p-3">
          {incidencias.map((inc) => (
            <div key={inc.id} className={cn('rounded-lg border bg-surface-2 p-3 text-xs', inc.tipo === 'solicitud_revision' ? 'border-amber-300 dark:border-amber-500/35' : 'border-border')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge tone={inc.estado === 'abierta' ? 'warning' : 'success'}>{inc.estado === 'abierta' ? 'Abierta' : 'Resuelta'}</Badge>
                  <span className="ml-2 font-semibold text-fg">{inc.tipo === 'solicitud_revision' ? 'Solicitud del estudiante' : inc.tipo.replace(/_/g, ' ')}</span>
                </div>
                {inc.estado === 'abierta' && (
                  <button type="button" onClick={() => setResolveId(inc.id)} className="focus-ring min-h-11 shrink-0 px-2 text-brand-600 hover:text-brand-700">Resolver</button>
                )}
              </div>
              {inc.tipo === 'solicitud_revision' && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Motivo: {String(inc.metadata_json?.motivo ?? 'revisión general').replace(/_/g, ' ')}
                </p>
              )}
              <p className="mt-1 text-muted">{inc.descripcion}</p>
              {(inc.componente_clave || inc.componente_id) && onOpenComponent && <Button size="sm" variant="outline" onClick={() => onOpenComponent(inc.componente_clave || inc.componente_id!)}>Ver pregunta vinculada · versión {inc.desglose_version ?? 'no registrada'}</Button>}
              {inc.resolucion && <p className="mt-1 italic text-muted">Resolución: {inc.resolucion}</p>}

              {resolveId === inc.id && (
                <div className="mt-2 space-y-2">
                  <textarea value={resolveText} onChange={(e) => setResolveText(e.target.value)} rows={2} placeholder="¿Cómo se resolvió?"
                    className="focus-ring w-full rounded-lg border border-border bg-surface p-2 text-xs" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setResolveId(null)}>Cancelar</Button>
                    <Button size="sm" onClick={() => resolveMut.mutate()} loading={resolveMut.isPending} disabled={!resolveText.trim()}>
                      Guardar resolución
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-componente: PanelDetalle ─── */
function PanelDetalle({
  cal,
  notaMaxima,
  studentMap,
  onClose,
  onConfirm,
  onAjustar,
  onPublish,
  onRechazar,
  onDirtyChange,
  onSaved,
  captureNextGrade,
  canGrade,
  canReviewClaims,
  canPublish,
  confirmPending,
  adjustPending,
  publishPending,
}: {
  cal: CalificacionDetalle;
  notaMaxima: number | undefined;
  studentMap: Map<string, { nombre: string; email?: string }>;
  onClose: () => void;
  onConfirm: (id: string, nota: number) => void;
  onAjustar: (id: string, nota: number, feedback?: string) => void;
  onPublish: (id: string) => void;
  onRechazar: (id: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSaved: () => void;
  captureNextGrade?: () => () => void;
  canGrade: boolean;
  canReviewClaims: boolean;
  canPublish: boolean;
  confirmPending: boolean;
  adjustPending: boolean;
  publishPending: boolean;
}) {
  const [adjNota, setAdjNota] = useState<number | ''>(effectiveGradeScore(cal) ?? '');
  const [adjFeedback, setAdjFeedback] = useState(cal.feedback ?? '');
  const [showAjustar, setShowAjustar] = useState(cal.estado === 'requiere_revision');
  const [adjError, setAdjError] = useState('');
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState('');
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editingSnapshot, setEditingSnapshot] = useState<GradeBreakdownData | null>(null);
  const [editingComponentDirty, setEditingComponentDirty] = useState(false);
  const [breakdownSaveError, setBreakdownSaveError] = useState('');
  const [pendingEditorAction, setPendingEditorAction] = useState<string | 'close' | null>(null);
  const [showGlobalAdjustment, setShowGlobalAdjustment] = useState(false);
  const [detailParams, setDetailParams] = useSearchParams();
  const evidencePage = Math.max(1, Math.min(cal.entrega_evidencia_paginas || 1, Number(detailParams.get('hoja')) || 1));
  const setEvidencePage = (page: number) => setDetailParams((previous) => { const next = new URLSearchParams(previous); next.set('hoja', String(page)); return next; }, { replace: true });
  const [mobileTab, setMobileTab] = useState<'evidencia' | 'revision'>('revision');
  const activeBreakdown = editingSnapshot ?? cal.desglose;
  const selectedQuestion = activeBreakdown?.componentes.find((component) => component.id === detailParams.get('pregunta') || component.clave === detailParams.get('pregunta')) ?? activeBreakdown?.componentes[0];
  const selectQuestion = (componentId: string) => {
    const component = activeBreakdown?.componentes.find((item) => item.id === componentId || item.clave === componentId);
    if (!component) return;
    setDetailParams((previous) => { const next = new URLSearchParams(previous); next.set('pregunta', component.clave); if (component.evidencia_paginas[0]) next.set('hoja', String(component.evidencia_paginas[0])); return next; });
  };
  const [evidenceLoadError, setEvidenceLoadError] = useState(false);
  const evidenceSectionRef = useRef<HTMLElement | null>(null);
  const retryMutation = useMutation({
    mutationFn: () => reintentarCalificacionFoto(cal.id),
    onSuccess: (grade) => {
      const jobId = grade.resultado_json?.job_id;
      if (typeof jobId === 'string') addPendingGrading({ jobId, evaluacionId: grade.evaluacion_id, materiaId: grade.materia_id, estudianteId: grade.estudiante_id, estudianteNombre: cal.estudiante_nombre || 'Estudiante' });
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      void queryClient.invalidateQueries({ queryKey: ['evaluation-review', cal.evaluacion_id] });
      toast.success('Reintento en cola. Puedes revisar otro estudiante.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const replacementMutation = useMutation({
    mutationFn: () => solicitarReemplazoEvidencia(cal.id, replacementReason.trim()),
    onSuccess: () => {
      setReplacementOpen(false);
      setReplacementReason('');
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', cal.evaluacion_id] });
      toast.success('Reemplazo solicitado. El estudiante deberá reenviar todas las hojas.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const answerReleaseMutation = useMutation({
    mutationFn: (released: boolean) => setAnswersReleased(cal.evaluacion_id, released),
    onSuccess: (_, released) => {
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      toast.success(released ? 'Respuestas de referencia liberadas.' : 'Respuestas de referencia ocultas.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const breakdownMutation = useMutation({
    mutationFn: ({ change }: { change: GradeComponentChange; afterSave?: () => void }) => {
      if (!editingSnapshot) throw new Error('No hay desglose vigente');
      return updateGradeBreakdown(cal.id, {
        version_esperada: editingSnapshot.version,
        cambios_componentes: [change],
      });
    },
    onSuccess: (_data, variables) => {
      onSaved();
      setBreakdownSaveError('');
      setEditingComponentDirty(false);
      setEditingComponentId(null);
      setEditingSnapshot(null);
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', cal.evaluacion_id] });
      void queryClient.invalidateQueries({ queryKey: ['evaluation-review', cal.evaluacion_id] });
      void queryClient.invalidateQueries({ queryKey: ['grade-breakdown-history', cal.id] });
      toast.success('Puntaje actualizado y nota recalculada.');
      variables.afterSave?.();
    },
    onError: (error) => {
      const parsed = toApiError(error);
      if (parsed.status === 409) {
        setBreakdownSaveError('La calificación cambió en otra revisión.');
        toast.error('La calificación cambió en otra revisión. Conservamos tu borrador para que puedas compararlo.');
        return;
      }
      setBreakdownSaveError(parsed.detail);
      toast.error(parsed.detail);
    },
  });
  const globalAdjustmentMutation = useMutation({
    mutationFn: (adjustment: { valor: number; motivo_interno: string; explicacion_estudiante: string }) => {
      if (!cal.desglose) throw new Error('No hay desglose vigente');
      return updateGradeBreakdown(cal.id, {
        version_esperada: cal.desglose.version,
        cambios_componentes: [],
        ajuste_global: adjustment,
      });
    },
    onSuccess: () => {
      setShowGlobalAdjustment(false);
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', cal.evaluacion_id] });
      void queryClient.invalidateQueries({ queryKey: ['grade-breakdown-history', cal.id] });
      toast.success('Ajuste global registrado y nota recalculada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const done = DONE_STATES.has(cal.estado);
  const published = cal.estado === PUBLICADA;
  const presentation = gradePresentation(cal);
  const originalNota = effectiveGradeScore(cal) ?? '';
  const originalFeedback = cal.feedback ?? '';
  const isDirty = adjNota !== originalNota || adjFeedback !== originalFeedback;

  // Reset dirty state when cal changes
  useEffect(() => {
    setAdjNota(originalNota);
    setAdjFeedback(originalFeedback);
    setShowAjustar(cal.estado === 'requiere_revision');
    setAdjError('');
    setBreakdownSaveError('');
    setEvidenceLoadError(false);
  }, [cal.id, cal.estado, originalNota, originalFeedback]);

  // Notify parent about dirty state
  useEffect(() => {
    onDirtyChange?.(isDirty || editingComponentDirty || showGlobalAdjustment || breakdownMutation.isPending);
  }, [isDirty, editingComponentDirty, showGlobalAdjustment, breakdownMutation.isPending, onDirtyChange]);

  function requestComponentEdit(componentId: string) {
    if (editingComponentId && editingComponentId !== componentId && editingComponentDirty) {
      setPendingEditorAction(componentId);
      return;
    }
    setEditingComponentDirty(false);
    setBreakdownSaveError('');
    setEditingComponentId(componentId);
    setEditingSnapshot(cal.desglose ?? null);
  }

  function requestComponentClose() {
    if (editingComponentDirty) {
      setPendingEditorAction('close');
      return;
    }
    setEditingComponentId(null);
    setEditingSnapshot(null);
  }

  function discardComponentChanges() {
    const action = pendingEditorAction;
    setPendingEditorAction(null);
    setEditingComponentDirty(false);
    setEditingComponentId(action && action !== 'close' ? action : null);
    setEditingSnapshot(action && action !== 'close' ? cal.desglose ?? null : null);
    if (action === 'close') void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
  }
  function handleClose() {
    onClose();
  }
  const estudiante = studentMap.get(cal.estudiante_id);
  const pipeline = cal.resultado_json as Record<string, unknown>;
  const vision = pipeline?.vision as Record<string, unknown> | undefined;
  const graderA = pipeline?.grader_a as Record<string, unknown> | undefined;
  const graderB = pipeline?.grader_b as Record<string, unknown> | undefined;
  const comparator = pipeline?.comparator as Record<string, unknown> | undefined;
  const timings = pipeline?.timings_ms as Record<string, number> | undefined;
  const strategy = pipeline?.strategy as Record<string, unknown> | undefined;
  const answerKey = pipeline?.answer_key as Record<string, unknown> | undefined;
  const answerKeyIncomplete = answerKey?.complete === false;
  const evidenciaConsolidada = pipeline?.evidencia_consolidada as Record<string, unknown> | undefined;
  const secciones = evidenciaConsolidada?.secciones as Record<string, Record<string, unknown>> | undefined;
  const criterios = (graderA?.criterios ?? []) as Array<Record<string, unknown>>;
  const alertas = (graderA?.alertas ?? []) as string[];
  const evidenceUrl = cal.entrega_archivo_url;
  const evidencePages = Math.max(1, cal.entrega_evidencia_paginas || 1);
  const isPdfEvidence = Boolean(evidenceUrl) && (
    cal.entrega_evidencia_tipo?.toLowerCase() === 'pdf'
    || cal.entrega_tipo?.toLowerCase() === 'pdf'
    || /\.pdf(?:$|[?#])/i.test(evidenceUrl ?? '')
  );
  const manualReview = cal.estado === 'requiere_revision';
  const evidencePageUrl = evidenceUrl ? `${evidenceUrl}/paginas/${evidencePage}` : null;

  function showEvidencePage(page: number) {
    const normalized = Math.min(evidencePages, Math.max(1, page));
    setEvidencePage(normalized);
    setEvidenceLoadError(false);
    setMobileTab('evidencia');
    evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submitAjuste() {
    if (adjNota === '') { setAdjError('Escribe la nota que deseas asignar.'); return; }
    const n = Number(adjNota);
    if (isNaN(n) || n < 0) { setAdjError('Nota inválida'); return; }
    if (notaMaxima != null && n > notaMaxima) { setAdjError(`Máximo ${notaMaxima}`); return; }
    setAdjError('');
    onAjustar(cal.id, n, adjFeedback || undefined);
  }

  const questionReview = activeBreakdown ? (
    <GradeBreakdown
      breakdown={activeBreakdown}
      selectedComponentId={selectedQuestion?.id}
      onSelectComponent={selectQuestion}
      onEdit={canGrade ? requestComponentEdit : undefined}
      onEvidencePage={evidenceUrl ? showEvidencePage : undefined}
      editingComponentId={editingComponentId}
      renderEditor={(component) => (
        <GradeComponentEditor
          key={`${activeBreakdown.version}-${component.id}`}
          component={component}
          formula={activeBreakdown.formula}
          saving={breakdownMutation.isPending}
          saveError={breakdownSaveError}
          onDirtyChange={setEditingComponentDirty}
          onCancel={requestComponentClose}
          onReload={() => setPendingEditorAction('close')}
          onSave={(change) => breakdownMutation.mutate({ change })}
          onSaveAndNextQuestion={(change) => {
            const next = activeBreakdown.componentes[activeBreakdown.componentes.findIndex((item) => item.id === component.id) + 1];
            breakdownMutation.mutate({ change, afterSave: () => {
              if (!next) { toast.success('Última pregunta guardada. Puedes continuar con el siguiente estudiante.'); return; }
              setDetailParams((previous) => { const params = new URLSearchParams(previous); params.set('pregunta', next.clave); if (next.evidencia_paginas[0]) params.set('hoja', String(next.evidencia_paginas[0])); return params; });
            } });
          }}
          onSaveAndNext={captureNextGrade ? (change) => {
            const afterSave = captureNextGrade();
            breakdownMutation.mutate({ change, afterSave });
          } : undefined}
        />
      )}
    />
  ) : <RevisionGuide items={cal.guia_revision ?? []} />;

  return (
    <>
    <div className="flex min-h-0 min-w-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-lg font-bold">{cal.estudiante_nombre || estudiante?.nombre || 'Estudiante'}</p>
            {isDirty && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Sin guardar</span>}
          </div>
          <p className="text-xs text-muted">{cal.evaluacion_nombre} · {cal.materia_nombre}</p>
        </div>
        <button type="button" onClick={handleClose} aria-label="Cerrar detalle de calificación" title="Cerrar detalle" className="focus-ring ml-2 grid min-h-11 min-w-11 place-items-center rounded-lg text-muted hover:text-fg lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-w-0 flex-1 space-y-5 p-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-5">
        {/* Nota principal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">{presentation.label}</p>
            {presentation.score == null ? (
              <div className="mt-2 flex items-center gap-2 font-semibold text-brand-600 dark:text-brand-300">
                {presentation.processing && <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />}
                <span>{presentation.processing ? 'Analizando evidencia…' : 'Sin nota automática'}</span>
              </div>
            ) : (
              <p className="font-display text-4xl font-extrabold text-fg">
                {presentation.score.toFixed(1)}
                {notaMaxima != null && <span className="ml-2 text-lg font-semibold text-muted">/ {notaMaxima.toFixed(1)}</span>}
              </p>
            )}
          </div>
          <Badge tone={presentation.processing ? 'brand' : done ? (published ? 'brand' : 'success') : 'warning'}>
            {published ? 'Publicada' : done ? 'Confirmada' : presentation.processing ? 'Calificando' : manualReview ? 'Revisión manual' : 'Por revisar'}
          </Badge>
        </div>

        {presentation.processing && (
          <Card className="flex items-start gap-3 border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand-600" />
            <div>
              <p className="font-semibold">Calificando en segundo plano</p>
              <p className="mt-1 text-sm text-muted">La evidencia está segura. Esta vista se actualizará cuando la sugerencia esté lista.</p>
            </div>
          </Card>
        )}

        {answerKeyIncomplete && (
          <Card className="flex items-start gap-3 border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
            <div>
              <p className="font-semibold text-rose-900 dark:text-rose-100">Clave de respuestas incompleta</p>
              <p className="mt-1 text-sm leading-6 text-rose-800 dark:text-rose-200">
                Faltan respuestas de referencia para las preguntas {((answerKey?.missing_questions as unknown[]) ?? []).join(', ') || 'indicadas'}. La confianza automática se limita y debes validar la clave antes de confirmar.
              </p>
            </div>
          </Card>
        )}

        {manualReview && (
          <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">Sugerencia de IA pendiente de revisión manual</p>
              <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-200">
                No se asignó cero ni se publicó la nota. Comprueba la evidencia y guarda abajo la nota correcta.
              </p>
            </div>
          </Card>
        )}

        {/* Confianza */}
        {activeBreakdown && (activeBreakdown.requiere_revision || activeBreakdown.bloqueos?.length || activeBreakdown.cobertura_estado !== 'completa') ? <Card className="space-y-2 border-amber-300 p-4 dark:border-amber-500/40">
          <p className="font-bold">Puntos que necesitan revisión</p>
          {activeBreakdown.cobertura_estado !== 'completa' && <p className="text-sm text-muted">La cobertura registrada es {activeBreakdown.cobertura_estado}. Comprueba que se incluyeron todas las preguntas y hojas.</p>}
          <div className="flex flex-wrap gap-2">{activeBreakdown.componentes.filter((component) => component.requiere_revision || ['ilegible', 'no_evaluable'].includes(component.estado)).map((component) => <Button key={component.id} variant="outline" size="sm" onClick={() => { selectQuestion(component.id); setMobileTab('revision'); }}>{component.tipo === 'pregunta' ? 'Pregunta' : 'Criterio'} {component.numero ?? component.orden + 1}: revisar</Button>)}</div>
          <p className="text-xs text-muted">Son señales registradas, no una conclusión automática de error. La confirmación mantiene las validaciones del servidor.</p>
        </Card> : null}
        {canGrade && manualReview && presentation.score == null && evidenceUrl && <Button variant="outline" loading={retryMutation.isPending} disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}><RotateCcw className="h-4 w-4" /> Reintentar con la evidencia guardada</Button>}
        {(() => {
          if (cal.confianza == null || cal.confianza <= 0) return null;
          return <p className="text-xs text-muted">Confianza: {(cal.confianza * 100).toFixed(0)}%</p>;
        })()}

        {/* Evidencia */}
        {evidenciaConsolidada?.modalidad === 'mixta' && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-500/30 dark:bg-sky-500/10">
            <p className="font-semibold text-sky-900 dark:text-sky-100">Calificación mixta consolidada</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p className="rounded-lg bg-white/70 p-2 dark:bg-surface">
                <strong>Online:</strong> preguntas {((secciones?.online?.preguntas as unknown[]) ?? []).join(', ') || 'sin identificar'}
              </p>
              <p className="rounded-lg bg-white/70 p-2 dark:bg-surface">
                <strong>Física:</strong> preguntas {((secciones?.fisica?.preguntas as unknown[]) ?? []).join(', ') || 'sin identificar'}
              </p>
            </div>
            <p className="mt-2 text-xs text-sky-800 dark:text-sky-200">Revisa el texto y la imagen por separado antes de confirmar la nota única.</p>
          </div>
        )}
        <div className="flex gap-2 xl:hidden" aria-label="Vista de la revisión">
          <Button variant={mobileTab === 'evidencia' ? 'primary' : 'outline'} onClick={() => setMobileTab('evidencia')} aria-pressed={mobileTab === 'evidencia'}>Evidencia</Button>
          <Button variant={mobileTab === 'revision' ? 'primary' : 'outline'} onClick={() => setMobileTab('revision')} aria-pressed={mobileTab === 'revision'}>Revisar respuestas</Button>
        </div>
        <div className="grid min-w-0 gap-4 xl:grid-cols-2 xl:items-start">
          <div className={cn('min-w-0 space-y-4 xl:sticky xl:top-4', mobileTab !== 'evidencia' && 'hidden xl:block')}>
            {evidenceUrl ? (
              <section ref={evidenceSectionRef} aria-labelledby="evidence-title" className="scroll-mt-4 rounded-xl border border-border bg-surface-2 xl:sticky xl:top-4">
                <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-muted">
                  <h2 id="evidence-title" className="flex items-center gap-2 text-base font-bold text-fg">
                    {isPdfEvidence ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                    Evidencia del estudiante
                    <Badge tone="neutral">{evidencePages} {evidencePages === 1 ? 'hoja' : 'hojas'}</Badge>
                  </h2>
                  <a
                    href={evidencePageUrl ?? evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-brand-700 hover:bg-brand-50 hover:text-brand-800 dark:text-brand-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-100"
                  >
                    Abrir en grande <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <Button type="button" size="sm" variant="ghost" disabled={evidencePage <= 1} onClick={() => showEvidencePage(evidencePage - 1)}>Anterior</Button>
                  <div className="flex max-w-full gap-1 overflow-x-auto py-1" aria-label="Páginas de evidencia">
                    {Array.from({ length: evidencePages }, (_, index) => index + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => showEvidencePage(page)}
                        aria-current={page === evidencePage ? 'page' : undefined}
                        className={cn('focus-ring min-h-11 min-w-11 rounded-lg px-2 text-xs font-bold', page === evidencePage ? 'bg-brand-600 text-white' : 'bg-surface text-muted hover:text-fg')}
                      >{page}</button>
                    ))}
                  </div>
                  <Button type="button" size="sm" variant="ghost" disabled={evidencePage >= evidencePages} onClick={() => showEvidencePage(evidencePage + 1)}>Siguiente</Button>
                </div>
                {evidenceLoadError ? (
                  <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-3 bg-surface p-5 text-center">
                    <FileImage className="h-8 w-8 text-muted" />
                    <p className="text-sm text-muted">No se pudo mostrar esta hoja. Puedes abrir la evidencia completa.</p>
                    <a href={evidenceUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 dark:text-brand-200">Abrir evidencia completa</a>
                  </div>
                ) : (
                  <img
                    key={evidencePageUrl}
                    src={evidencePageUrl ?? evidenceUrl}
                    alt={`Hoja ${evidencePage} de la evidencia del estudiante`}
                    onError={() => setEvidenceLoadError(true)}
                    className="max-h-[34rem] w-full bg-white object-contain p-2"
                  />
                )}
                <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted">Si falta una página o no corresponde, solicita el paquete completo otra vez.</p>
                  {canReviewClaims && <Button type="button" size="sm" variant="outline" onClick={() => setReplacementOpen(true)}>
                    <RotateCcw className="h-4 w-4" /> Solicitar reemplazo
                  </Button>}
                </div>
              </section>
            ) : (
              <section className="rounded-xl border border-border bg-surface-2 p-5">
                <h2 className="text-base font-bold text-fg">Evidencia del estudiante</h2>
                <p className="mt-2 text-base text-muted">Esta entrega no tiene una foto o PDF asociado.</p>
              </section>
            )}

            {cal.entrega_respuesta_texto && (
              <section className="rounded-xl border border-border bg-surface-2 p-4">
                <h2 className="mb-2 text-base font-bold text-fg">Respuesta escrita del estudiante</h2>
                <p className="whitespace-pre-wrap text-base leading-7 text-fg">{cal.entrega_respuesta_texto}</p>
              </section>
            )}
          </div>

          <div className={cn('min-w-0', mobileTab !== 'revision' && 'hidden xl:block')}>
            {detailParams.has('pregunta') && !activeBreakdown?.componentes.some((component) => [component.id, component.clave].includes(detailParams.get('pregunta')!)) && <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">La referencia corresponde a otra versión. Se muestra la primera pregunta vigente; consulta el historial para comparar.</p>}
            {questionReview}
          </div>
        </div>

        {/* Pipeline — resumen colapsable */}
        {!!pipeline?.orchestrator && (
          <AIPipelineSummary
            confianza={cal.confianza}
            graderA={graderA}
            graderB={graderB}
            comparator={comparator}
            vision={vision}
            answerKeyIncomplete={answerKeyIncomplete}
            timings={timings}
            strategy={strategy}
          />
        )}

        {/* Criterios */}
        {!cal.desglose && criterios.length > 0 && (
          <div className="rounded-xl border border-border">
            <p className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-semibold text-muted">
              <ShieldAlert className="h-4 w-4" /> Criterios de evaluación
            </p>
            <div className="space-y-2 px-4 py-3">
              {criterios.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{String(c.nombre ?? '')}</span>
                  <span className="font-semibold text-fg">
                    {Number(c.puntaje ?? 0).toFixed(1)} / {Number(c.maximo ?? 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cal.desglose ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold">Respuestas de referencia para estudiantes</p>
                <p className="mt-1 text-sm text-muted">{cal.respuestas_liberadas ? 'Los estudiantes pueden comparar sus respuestas.' : 'Permanecen ocultas mientras las entregas están abiertas.'}</p>
              </div>
              {canPublish && <Button type="button" variant="outline" onClick={() => answerReleaseMutation.mutate(!cal.respuestas_liberadas)} loading={answerReleaseMutation.isPending}>
                {cal.respuestas_liberadas ? 'Ocultar respuestas' : 'Liberar respuestas'}
              </Button>}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Si un caso excepcional cambia la nota completa, quedará separado de los puntos por respuesta.</p>
              {canGrade && <Button type="button" variant="outline" onClick={() => setShowGlobalAdjustment((value) => !value)}>
                {showGlobalAdjustment ? 'Cancelar ajuste global' : 'Registrar ajuste global'}
              </Button>}
            </div>
            {showGlobalAdjustment && (
              <GradeGlobalAdjustmentEditor
                formula={cal.desglose.formula}
                saving={globalAdjustmentMutation.isPending}
                onCancel={() => setShowGlobalAdjustment(false)}
                onSave={(adjustment) => globalAdjustmentMutation.mutate(adjustment)}
              />
            )}
            <GradeBreakdownHistory calificacionId={cal.id} />
          </div>
        ) : cal.desglose_heredado ? (
          <Card className="border-border p-4">
            <p className="font-bold">Calificación anterior al desglose explicable</p>
            <p className="mt-1 text-sm leading-6 text-muted">La nota y los criterios históricos se conservan. No se inventaron puntajes por pregunta para esta entrega.</p>
          </Card>
        ) : null}
        {/* Feedback */}
        {!presentation.processing && <Field label="Retroalimentación">
          <Textarea
            readOnly={!canGrade}
            value={adjFeedback}
            onChange={(e) => setAdjFeedback(e.target.value)}
            placeholder="Escribe o edita el feedback para el estudiante…"
            rows={4}
          />
        </Field>}

        {/* Alertas */}
        {!cal.desglose && alertas.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {alertas.map((a, i) => <p key={i}>⚠️ {a}</p>)}
          </div>
        )}

        {/* Acciones */}
        {canGrade && !done && !presentation.processing && (
          <div className="flex flex-wrap gap-2">
            {presentation.score != null && <Button
              onClick={() => onConfirm(cal.id, Number(adjNota))}
              loading={confirmPending}
              disabled={confirmPending || adjNota === '' || isDirty || editingComponentDirty || showGlobalAdjustment}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirmar nota
            </Button>}
            <Button variant="outline" onClick={() => setShowAjustar(!showAjustar)}>
              <Pencil className="h-4 w-4" /> {presentation.score == null ? 'Establecer nota' : 'Ajustar'}
            </Button>
            {!manualReview && (
              <Button variant="ghost" onClick={() => onRechazar(cal.id)}>
                <RotateCcw className="h-4 w-4" /> Revisar manualmente
              </Button>
            )}
          </div>
        )}
        {canPublish && done && !published && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onPublish(cal.id)} loading={publishPending} disabled={publishPending || isDirty || editingComponentDirty || showGlobalAdjustment}>
              <CheckCircle2 className="h-4 w-4" /> Publicar al estudiante
            </Button>
          </div>
        )}
        {published && (
          <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Resultados publicados</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">El estudiante ya puede ver su nota y retroalimentación.</p>
            </div>
          </Card>
        )}

        {canGrade && showAjustar && !presentation.processing && (
          <Card className="space-y-3 p-4">
            <Field label="Nota" hint={notaMaxima != null ? `0 - ${notaMaxima}` : undefined}>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={notaMaxima}
                value={adjNota}
                onChange={(e) => { setAdjNota(e.target.value === '' ? '' : Number(e.target.value)); setAdjError(''); }}
              />
              {adjError && <span className="mt-1 block text-xs text-rose-500">{adjError}</span>}
            </Field>
            <Button onClick={submitAjuste} loading={adjustPending} className="w-full">
              Guardar ajuste
            </Button>
          </Card>
        )}

        {/* Timeline */}
        <Timeline events={cal.timeline} />

        {/* Incidencias */}
        {canReviewClaims && <IncidenciasSection calificacionId={cal.id} onOpenComponent={(id) => {
          const component = activeBreakdown?.componentes.find((item) => item.id === id || item.clave === id);
          if (component) { selectQuestion(component.id); setMobileTab('revision'); document.getElementById('grade-breakdown-title')?.scrollIntoView({ block: 'start' }); }
          else { setDetailParams((previous) => { const next = new URLSearchParams(previous); next.set('pregunta', id); return next; }); toast('La pregunta pertenece a una versión anterior y no tiene equivalencia vigente.'); }
        }} />}
      </div>
    </div>
    <ConfirmDialog
      open={pendingEditorAction !== null}
      onClose={() => setPendingEditorAction(null)}
      onConfirm={discardComponentChanges}
      title="Cambios de respuesta sin guardar"
      confirmLabel="Descartar y continuar"
      cancelLabel="Seguir editando"
      tone="danger"
      description="Cambiaste el puntaje o la explicación de esta respuesta. Puedes seguir editando o descartar esos cambios antes de abrir otra respuesta."
    />    <ConfirmDialog
      open={replacementOpen}
      onClose={() => !replacementMutation.isPending && setReplacementOpen(false)}
      onConfirm={() => replacementMutation.mutate()}
      loading={replacementMutation.isPending}
      title="Solicitar reemplazo de toda la entrega"
      description="El estudiante deberá volver a seleccionar y enviar el paquete completo. La evidencia actual se conservará hasta que llegue la nueva."
      confirmLabel="Solicitar reemplazo"
    >
      <Field label="Motivo para el estudiante" required hint="Indica qué hoja falta o qué debe corregir.">
        <Textarea
          value={replacementReason}
          onChange={(event) => setReplacementReason(event.target.value)}
          placeholder="Ejemplo: Falta la hoja 2 donde continúa el ejercicio 4."
          className="min-h-28"
          maxLength={1000}
        />
      </Field>
      {replacementReason.trim().length < 10 && <p className="text-xs text-amber-700 dark:text-amber-300">Escribe al menos 10 caracteres para explicar el reemplazo.</p>}
    </ConfirmDialog>
    </>
  );
}

/* ─── Sub-componente: BatchActions ─── */
function BatchActions({
  selected,
  notaMaxima,
  onConfirmBatch,
  onAjustarBatch,
  onPublishBatch,
  onClear,
  batchPending,
  canPublish,
}: {
  selected: WorkspaceGrade[];
  notaMaxima: number | undefined;
  onConfirmBatch: (items: { calificacion_id: string; nota_confirmada: number }[]) => void;
  onAjustarBatch: (items: { calificacion_id: string; nota_confirmada: number }[]) => void;
  onPublishBatch: (ids: string[]) => void;
  onClear: () => void;
  batchPending: boolean;
  canPublish: boolean;
}) {
  const [bulkNota, setBulkNota] = useState(notaMaxima ?? 5);
  const [showBulk, setShowBulk] = useState(false);

  if (selected.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 60 }}
      animate={{ y: 0 }}
      className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-surface px-4 py-3 shadow-lg sm:-mx-6 sm:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {selected.length} seleccionado{selected.length > 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => onConfirmBatch(selected.map((c) => ({
              calificacion_id: c.id,
              nota_confirmada: effectiveGradeScore(c)!,
            })))}
            loading={batchPending}
            disabled={batchPending}
          >
            <CheckCircle2 className="h-4 w-4" /> Confirmar todos
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBulk(!showBulk)} disabled={batchPending}>
            <Pencil className="h-4 w-4" /> Ajustar nota común
          </Button>
          {canPublish && <Button size="sm" variant="secondary" onClick={() => onPublishBatch(selected.map((c) => c.id))} disabled={batchPending}>
            <CheckCircle2 className="h-4 w-4" /> Publicar seleccionados
          </Button>}
          <Button size="sm" variant="ghost" onClick={onClear}>
            <X className="h-4 w-4" /> Limpiar
          </Button>
        </div>
      </div>
      {showBulk && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
          <Field label="Nota común">
            <div className="w-32">
              <Input
              type="number"
              step="0.1"
              min={0}
              max={notaMaxima}
              value={bulkNota}
              onChange={(e) => setBulkNota(Number(e.target.value))}
            />
            </div>
          </Field>
          <Button
            size="sm"
            onClick={() => {
              onAjustarBatch(selected.map((c) => ({
                calificacion_id: c.id,
                nota_confirmada: bulkNota,
              })));
              setShowBulk(false);
            }}
            loading={batchPending}
            disabled={batchPending}
          >
            Aplicar a {selected.length}
          </Button>
        </div>
      )}
    </motion.div>
  );
}

function ManualGradeModal({
  preferredStudentId,
  open,
  students,
  grades,
  notaMaxima,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  students: { id: string; nombre: string; email?: string }[];
  grades: WorkspaceGrade[];
  preferredStudentId?: string | null;
  notaMaxima: number;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    estudiante_id: string;
    nota_confirmada: number;
    motivo: string;
    feedback?: string;
  }) => void;
}) {
  const gradedIds = useMemo(
    () => new Set(grades.map((grade) => grade.estudiante_id)),
    [grades],
  );
  const [studentId, setStudentId] = useState('');
  const [score, setScore] = useState(0);
  const [reason, setReason] = useState('No presentó la actividad');
  const [feedback, setFeedback] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    if (!open) { initialized.current = false; return; }
    if (initialized.current || students.length === 0) return;
    initialized.current = true;
    const preferred = students.find((student) => student.id === preferredStudentId) ?? students.find((student) => !gradedIds.has(student.id)) ?? students[0];
    setStudentId(preferred?.id ?? '');
    setScore(0);
    setReason('No presentó la actividad');
    setFeedback('');
  }, [gradedIds, open, preferredStudentId, students]);

  return (
    <Modal open={open} onClose={onClose} title="Establecer nota sin documento" className="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!studentId || score < 0 || score > notaMaxima) return;
          onSubmit({
            estudiante_id: studentId,
            nota_confirmada: score,
            motivo: reason,
            feedback: feedback.trim() || undefined,
          });
        }}
      >
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          Úsalo cuando el estudiante no entregó, presentó fuera de plazo o la valoración se realizó directamente. No necesitas subir una foto o PDF.
        </div>
        <Field label="Estudiante" required>
          <Select value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre}{gradedIds.has(student.id) ? ' · ya tiene nota' : ' · sin nota'}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Nota (máximo ${notaMaxima})`} required>
            <Input
              type="number"
              min={0}
              max={notaMaxima}
              step="0.1"
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
              required
            />
          </Field>
          <Field label="Motivo" required>
            <Select value={reason} onChange={(event) => setReason(event.target.value)} required>
              <option value="No presentó la actividad">No presentó</option>
              <option value="Entrega presentada fuera de plazo">Fuera de plazo</option>
              <option value="Valoración directa del docente">Valoración directa</option>
              <option value="Acuerdo o ajuste pedagógico">Ajuste pedagógico</option>
            </Select>
          </Field>
        </div>
        <Field label="Retroalimentación" hint="Opcional; será visible inmediatamente para el estudiante.">
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Explica brevemente la razón o el acuerdo realizado."
          />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!studentId || score < 0 || score > notaMaxima}
          >
            Guardar nota
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const WORK_TIMER_STORAGE_KEY = 'xcalificator.teacher-work-session.v1';
const TAKEOVER_TOKEN = '0'.repeat(64);

function formatWorkDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function TeacherWorkTimer({ evaluacionId }: { evaluacionId: string }) {
  const [session, setSession] = useState<TeacherWorkSession | null>(null);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [condition, setCondition] = useState<TeacherWorkCondition>('asistida');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [, setTick] = useState(0);
  const lastAcknowledgedAt = useRef(performance.now());
  const automaticRequest = useRef(false);

  const persistOwner = useCallback((nextSession: TeacherWorkSession, token: string) => {
    sessionStorage.setItem(WORK_TIMER_STORAGE_KEY, JSON.stringify({
      id: nextSession.id,
      ownerToken: token,
    }));
  }, []);

  const applyResponse = useCallback((response: TeacherWorkSession) => {
    const nextSession = response.rollover && response.continuation
      ? response.continuation
      : response;
    const nextToken = response.owner_token ?? ownerToken;
    setSession(nextSession);
    if (nextToken) {
      setOwnerToken(nextToken);
      persistOwner(nextSession, nextToken);
    }
    if (nextSession.estado === 'completed' || nextSession.estado === 'incomplete') {
      sessionStorage.removeItem(WORK_TIMER_STORAGE_KEY);
      setOwnerToken(null);
    }
    lastAcknowledgedAt.current = performance.now();
  }, [ownerToken, persistOwner]);

  const recover = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listTeacherWorkSessions();
      const open = page.items.find((item) => item.estado === 'active' || item.estado === 'paused') ?? null;
      setSession(open);
      setOwnerToken(null);
      if (open) {
        const raw = sessionStorage.getItem(WORK_TIMER_STORAGE_KEY);
        if (raw) {
          try {
            const stored = JSON.parse(raw) as { id?: string; ownerToken?: string };
            if (stored.id === open.id && stored.ownerToken) setOwnerToken(stored.ownerToken);
          } catch {
            sessionStorage.removeItem(WORK_TIMER_STORAGE_KEY);
          }
        }
      } else {
        sessionStorage.removeItem(WORK_TIMER_STORAGE_KEY);
      }
      lastAcknowledgedAt.current = performance.now();
    } catch (error) {
      setMessage(toApiError(error).detail);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void recover();
  }, [recover]);

  useEffect(() => {
    if (session?.estado !== 'active' || !ownerToken) return undefined;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [ownerToken, session?.estado]);

  const send = useCallback(async (
    accion: 'heartbeat' | 'pausar' | 'reanudar' | 'cambiar_fase' | 'finalizar' | 'traspasar',
    options: { automatic?: boolean; fase?: TeacherWorkPhase } = {},
  ) => {
    if (!session || automaticRequest.current) return;
    const token = accion === 'traspasar' ? (ownerToken ?? TAKEOVER_TOKEN) : ownerToken;
    if (!token) return;
    const accumulates = session.estado === 'active'
      && ['heartbeat', 'pausar', 'cambiar_fase', 'finalizar'].includes(accion);
    const elapsedMs = accumulates
      ? elapsedFromMonotonic(lastAcknowledgedAt.current, performance.now())
      : 0;
    automaticRequest.current = true;
    if (!options.automatic) setSending(true);
    setMessage('');
    try {
      const response = await sendTeacherWorkCommand({
        sessionId: session.id,
        expectedVersion: session.version,
        ownerToken: token,
        accion,
        elapsedMs,
        fase: options.fase,
      });
      applyResponse(response);
    } catch (error) {
      const apiError = toApiError(error);
      setMessage(apiError.detail);
      if (apiError.status === 409) {
        setOwnerToken(null);
        sessionStorage.removeItem(WORK_TIMER_STORAGE_KEY);
        await recover();
      }
    } finally {
      automaticRequest.current = false;
      if (!options.automatic) setSending(false);
    }
  }, [applyResponse, ownerToken, recover, session]);

  useEffect(() => {
    if (session?.estado !== 'active' || !ownerToken) return undefined;
    const interval = window.setInterval(() => {
      void send('heartbeat', { automatic: true });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [ownerToken, send, session?.estado]);

  const start = async () => {
    if (!evaluacionId) return;
    setSending(true);
    setMessage('');
    try {
      const response = await startTeacherWorkSession({
        condicion: condition,
        fase: 'revision',
        evaluacion_id: evaluacionId,
      });
      applyResponse(response);
    } catch (error) {
      setMessage(toApiError(error).detail);
      await recover();
    } finally {
      setSending(false);
    }
  };

  const liveElapsed = session?.estado === 'active' && ownerToken
    ? elapsedFromMonotonic(lastAcknowledgedAt.current, performance.now())
    : 0;
  const displayedDuration = (session?.duracion_confirmada_ms ?? 0) + liveElapsed;

  if (loading) {
    return <Card className="mx-4 mb-4 h-16 animate-pulse" aria-label="Cargando medición de tiempo" />;
  }

  if (!session) {
    return (
      <Card className="mx-4 mb-4 flex flex-col gap-3 border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-fg">Medir mi tiempo de revisión</p>
            <p className="text-sm text-muted">Opcional. Separa tu trabajo activo de la espera de la IA.</p>
            {message && <p className="mt-1 text-xs text-rose-600">{message}</p>}
          </div>
        </div>
        <div className="flex flex-col gap-2 xs:flex-row">
          <Select value={condition} onChange={(event) => setCondition(event.target.value as TeacherWorkCondition)} aria-label="Condición de trabajo">
            <option value="asistida">Con asistencia de IA</option>
            <option value="manual">Trabajo manual</option>
          </Select>
          <Button type="button" onClick={() => void start()} loading={sending}>
            <Play className="h-4 w-4" /> Iniciar voluntariamente
          </Button>
        </div>
      </Card>
    );
  }

  const ownsSession = Boolean(ownerToken);
  return (
    <Card className="mx-4 mb-4 flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between" aria-live="polite">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${session.estado === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300'}`}>
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-fg">Tiempo observado</p>
            <Badge tone={session.estado === 'active' ? 'success' : 'warning'}>
              {session.estado === 'active' ? 'En curso' : 'En pausa'}
            </Badge>
            <span className="font-mono text-lg font-bold tabular-nums text-fg">{formatWorkDuration(displayedDuration)}</span>
          </div>
          <p className="text-xs text-muted">
            {session.condicion === 'asistida' ? 'Con asistencia de IA' : 'Trabajo manual'}
            {session.incertidumbre_ms > 0 && ` · ${formatWorkDuration(session.incertidumbre_ms)} por revisar`}
            {session.evaluacion_id !== evaluacionId && ' · vinculada a otra evaluación'}
          </p>
          {message && <p className="mt-1 text-xs text-rose-600">{message}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {ownsSession ? (
          <>
            <Select
              value={session.fase}
              disabled={sending}
              aria-label="Fase del trabajo"
              onChange={(event) => void send('cambiar_fase', { fase: event.target.value as TeacherWorkPhase })}
            >
              <option value="preparacion">Preparación</option>
              <option value="revision">Revisión</option>
              <option value="correccion">Corrección</option>
              <option value="finalizacion">Finalización</option>
            </Select>
            {session.estado === 'active' ? (
              <Button type="button" variant="outline" disabled={sending} onClick={() => void send('pausar')}>
                <Pause className="h-4 w-4" /> Pausar
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={sending} onClick={() => void send('reanudar')}>
                <Play className="h-4 w-4" /> Reanudar
              </Button>
            )}
            <Button type="button" variant="outline" disabled={sending} onClick={() => void send('finalizar')}>
              <Square className="h-4 w-4" /> Finalizar
            </Button>
          </>
        ) : (
          <Button type="button" disabled={sending} onClick={() => void send('traspasar')}>
            Continuar en este dispositivo
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ─── Componente principal ─── */
export function CalificacionesWorkspace() {
  const user = useAuth((state) => state.user);
  if (user?.rol === 'estudiante') return <Navigate to={routes.forbidden} replace />;
  return <GradingCenter />;
}

function GradingCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const evalId = searchParams.get('evaluacion') ?? '';
  const evalIdParam = evalId;
  const selectedId = searchParams.get('calificacion');
  const selectedStudentId = searchParams.get('estudiante');
  const mode = searchParams.get('modo') ?? 'revision';
  const previousReview = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== 'carga') previousReview.current = searchParams.toString();
  }, [mode, searchParams]);
  const permissions = useAuth((state) => state.user?.permissions ?? []);
  const isTeacher = useAuth((state) => state.user?.rol === 'profesor');
  const canGrade = permissions.includes('grading.grade');
  const canReviewClaims = permissions.includes('submissions.review');
  const canPublish = permissions.includes('grading.publish');
  const changeContext = useCallback((patch: Record<string, string | null>, replace = false) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(patch).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
      return next;
    }, { replace });
  }, [setSearchParams]);
  const returnToReview = () => {
    if (previousReview.current !== null) setSearchParams(previousReview.current);
    else changeContext({ modo: null });
  };
  const setSelectedId = (id: string | null) => changeContext({ calificacion: id, estudiante: null, pregunta: null, hoja: null });
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const requestedFilter = searchParams.get('filtro') ?? 'todas';
  const gradeFilter: ReviewFilter = ['pendientes', 'alertas', 'procesando', 'publicadas'].includes(requestedFilter) ? requestedFilter as ReviewFilter : 'todas';
  const [confirmingSingle, setConfirmingSingle] = useState<WorkspaceGrade | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [mobileDirty, setMobileDirty] = useState(false);
  const dirtyRef = useRef(false);
  const updateDirty = useCallback((dirty: boolean) => { dirtyRef.current = dirty; setMobileDirty(dirty); }, []);
  const [manualGradeOpen, setManualGradeOpen] = useState(false);
  const [reviewCompleted, setReviewCompleted] = useState(false);
  const [savedStudents, setSavedStudents] = useState<Record<string, string[]>>({});
  const [discardVersion, setDiscardVersion] = useState(0);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const current = new URLSearchParams(currentLocation.search);
    const next = new URLSearchParams(nextLocation.search);
    current.delete('hoja'); next.delete('hoja');
    return dirtyRef.current && (currentLocation.pathname !== nextLocation.pathname || current.toString() !== next.toString());
  });
  useEffect(() => {
    if (!mobileDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [mobileDirty]);

  const { data: materias } = useMaterias();
  const directEvaluation = useQuery({
    queryKey: ['evaluacion', evalIdParam],
    queryFn: () => getEvaluacion(evalIdParam!),
    enabled: Boolean(evalIdParam),
    retry: false,
  });

  const materiaId = directEvaluation.data?.materia_id ?? searchParams.get('materia') ?? '';

  useBodyScrollLock(Boolean(selectedId) && mode !== 'carga');


  useEffect(() => {
    if (!materiaId && !evalIdParam && materias?.[0]) changeContext({ materia: materias[0].id }, true);
  }, [changeContext, evalIdParam, materias, materiaId]);

  const { data: evals } = useQuery({
    queryKey: ['evaluaciones', materiaId],
    queryFn: () => listEvaluaciones(materiaId),
    enabled: !!materiaId,
  });
  useEffect(() => {
    if (!evalId && evals?.[0]) changeContext({ evaluacion: evals[0].id }, true);
  }, [changeContext, evalId, evals]);

  // Track workspace opened
  useEffect(() => {
    if (evalId) trackEvent('workspace_opened', { evaluacion_id: evalId, metadata_json: { materia_id: materiaId } });
  }, [evalId, materiaId]);

  const reviewQuery = useInfiniteQuery({
    queryKey: ['evaluation-review', evalId, gradeFilter, searchTerm],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => getEvaluationReview(evalId, { filtro: gradeFilter, q: searchTerm, cursor: pageParam }, signal),
    getNextPageParam: (lastPage) => lastPage.siguiente_cursor ?? undefined,
    enabled: !!directEvaluation.data,
    refetchInterval: (query) => {
      return query.state.data?.pages[0]?.contadores.procesando ? 5_000 : false;
    },
    retry: false,
  });
  const reviewRows = useMemo(() => reviewQuery.data?.pages.flatMap((page) => page.alumnos) ?? [], [reviewQuery.data]);
  const isLoading = reviewQuery.isLoading;
  const cals = useMemo<WorkspaceGrade[]>(() => reviewRows.flatMap((row) => row.calificacion_id ? [{
    id: row.calificacion_id, estudiante_id: row.estudiante_id,
    estado: row.estado === 'error' ? 'requiere_revision' : row.estado as Calificacion['estado'],
    nota_sugerida: row.nota == null ? null : Number(row.nota), nota_confirmada: DONE_STATES.has(row.estado) && row.nota != null ? Number(row.nota) : null,
    resultado_json: {},
  }] : []), [reviewRows]);
  const selectedEval = directEvaluation.data;
  const notaMaxima = selectedEval?.nota_maxima != null ? Number(selectedEval.nota_maxima) : undefined;

  // Student map
  const { estudiantes } = useEstudiantes(materiaId);
  const studentMap = useMemo(
    () => new Map(estudiantes.map((s) => [s.id, s])),
    [estudiantes],
  );
  const selectedStudentReference = useQuery({
    queryKey: ['review-student', evalId, selectedStudentId],
    queryFn: ({ signal }) => getEvaluationReview(evalId, { estudiante_id: selectedStudentId! }, signal),
    enabled: !!directEvaluation.data && !!selectedStudentId && !selectedId && mode !== 'carga',
  });
  const selectedRow = reviewRows.find((row) => row.estudiante_id === selectedStudentId) ?? selectedStudentReference.data?.alumnos[0];

  useEffect(() => {
    if (!selectedStudentId || selectedId || mode === 'carga') return;
    const row = selectedRow;
    if (row?.calificacion_id) changeContext({ calificacion: row.calificacion_id }, true);
  }, [changeContext, mode, selectedRow, selectedId, selectedStudentId]);

  // Detail query
  const detalleQuery = useQuery({
    queryKey: ['calificacion-detalle', selectedId],
    queryFn: () => getCalificacionDetalle(selectedId!),
    enabled: !!selectedId && !!directEvaluation.data,
    refetchInterval: (query) => {
      const grade = query.state.data as CalificacionDetalle | undefined;
      return grade && isGradeProcessing(grade) ? 5_000 : false;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calificaciones', evalId] });
    queryClient.invalidateQueries({ queryKey: ['evaluation-review', evalId] });
    queryClient.invalidateQueries({ queryKey: ['bandeja-docente'] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', selectedId] });
  }, [evalId, selectedId]);

  // Mutations
  const confirmarMut = useMutation({
    mutationFn: (c: WorkspaceGrade) => {
      if (c.nota_sugerida == null) throw new Error('La calificación todavía está en proceso.');
      return confirmarNota(c.id, Number(c.nota_sugerida));
    },
    onSuccess: (_data, grade) => { invalidate(); toast.success('Nota confirmada'); setConfirmingSingle(null); trackEvent('calificacion_confirmed', { evaluacion_id: evalId, calificacion_id: grade.id }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const ajustarMut = useMutation({
    mutationFn: (args: { id: string; nota: number; feedback?: string }) => ajustarNota(args.id, args.nota, args.feedback),
    onSuccess: (_data, args) => { invalidate(); toast.success('Nota ajustada'); trackEvent('grade_adjusted', { evaluacion_id: evalId, calificacion_id: args.id }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const revisionMut = useMutation({
    mutationFn: (args: { id: string; motivo: string }) => marcarRevisionManual(args.id, args.motivo),
    onSuccess: (cal) => {
      setRejectId(null);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      toast.success('Sugerencia de IA descartada. Revisa y guarda la nota correcta.');
      trackEvent('grade_marked_manual_review', { evaluacion_id: evalId, calificacion_id: cal.id });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const confirmBatchMut = useMutation({
    mutationFn: (items: { calificacion_id: string; nota_confirmada: number }[]) => confirmarNotaBatch(items),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.exitosos} nota(s) confirmada(s)`);
      if (res.fallidos > 0) toast.error(`${res.fallidos} fallaron`);
      setBatchResult(res);
      setSelectedBatch(new Set(res.results.filter((item) => !item.success).map((item) => item.calificacion_id)));
      trackEvent('batch_confirmed', { evaluacion_id: evalId, metadata_json: { batch_size: res.exitosos } });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const ajustarBatchMut = useMutation({
    mutationFn: (items: { calificacion_id: string; nota_confirmada: number }[]) => ajustarNotaBatch(items),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.exitosos} nota(s) ajustada(s)`);
      if (res.fallidos > 0) toast.error(`${res.fallidos} fallaron`);
      setBatchResult(res);
      setSelectedBatch(new Set(res.results.filter((item) => !item.success).map((item) => item.calificacion_id)));
      trackEvent('batch_adjusted', { evaluacion_id: evalId, metadata_json: { batch_size: res.exitosos } });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => publicarNota(id),
    onSuccess: (_data, gradeId) => { invalidate(); toast.success('Nota publicada al estudiante'); trackEvent('calificacion_published', { evaluacion_id: evalId, calificacion_id: gradeId }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const publishBatchMut = useMutation({
    mutationFn: (ids: string[]) => publicarNotaBatch(ids),
    onSuccess: (res: BatchResult) => {
      invalidate();
      toast.success(`${res.exitosos} nota(s) publicada(s)`);
      if (res.fallidos > 0) toast.error(`${res.fallidos} no pudieron publicarse`);
      setBatchResult(res);
      setSelectedBatch(new Set(res.results.filter((item) => !item.success).map((item) => item.calificacion_id)));
      trackEvent('batch_published', { evaluacion_id: evalId, metadata_json: { batch_size: res.exitosos } });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });

  const manualGradeMut = useMutation({
    mutationFn: (payload: {
      estudiante_id: string;
      nota_confirmada: number;
      motivo: string;
      feedback?: string;
    }) => establecerNotaManual(evalId, payload),
    onSuccess: (calificacion) => {
      invalidate();
      setManualGradeOpen(false);
      setSelectedId(calificacion.id);
      toast.success('Nota guardada y publicada al estudiante');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  // Derived
  const counters = reviewQuery.data?.pages[0]?.contadores;
  const captureNextGrade = useCallback(() => {
    const currentIndex = reviewRows.findIndex((row) => row.calificacion_id === selectedId);
    const nextStudent = currentIndex >= 0 ? reviewRows[currentIndex + 1] : undefined;
    const hasMore = reviewQuery.hasNextPage;
    return () => {
    updateDirty(false);
    if (nextStudent) {
      changeContext({ calificacion: nextStudent.calificacion_id, estudiante: nextStudent.estudiante_id, pregunta: null, hoja: null });
      setReviewCompleted(false);
      return;
    }
    changeContext({ calificacion: null, estudiante: null, pregunta: null, hoja: null });
    setReviewCompleted(!hasMore);
    if (hasMore) toast.success('Ajuste guardado. Carga más estudiantes para continuar la revisión.');
    };
  }, [changeContext, reviewQuery.hasNextPage, reviewRows, selectedId, updateDirty]);

  function toggleSelect(id: string) {
    setSelectedBatch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedArray = useMemo(
    () => (cals ?? []).filter((c) => selectedBatch.has(c.id) && effectiveGradeScore(c) != null),
    [cals, selectedBatch],
  );

  return (
    <div className="flex min-h-full min-w-0 flex-col">
      {/* Header */}
      <PageHeader
        title="Calificaciones"
        eyebrow="Centro de calificación"
        subtitle="Un examen, sus estudiantes y cada respuesta en el mismo lugar."
        action={
          <div className="flex flex-wrap gap-2">
            {materiaId && (
              <Link
                to={routes.materiaBoletin(materiaId)}
                className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
              >
                <BookOpenCheck className="h-4 w-4" /> Libro de notas
              </Link>
            )}
            {canGrade && evalId && estudiantes.length > 0 && (
              <Button type="button" variant="outline" disabled={mobileDirty} onClick={() => setManualGradeOpen(true)}>
                <Pencil className="h-4 w-4" /> Establecer nota
              </Button>
            )}
            {canGrade && <Button variant="outline" disabled={!evalId} onClick={() => mode === 'carga' ? returnToReview() : changeContext({ modo: 'carga' })}>
              <Camera className="h-4 w-4" /> {mode === 'carga' ? 'Volver a revisión' : 'Añadir entregas'}
            </Button>}
            {canPublish && <Button variant="outline" disabled={!evalId} onClick={() => changeContext({ modo: mode === 'publicacion' ? null : 'publicacion', calificacion: null, estudiante: null, pregunta: null, hoja: null })}>
              {mode === 'publicacion' ? 'Volver a revisión' : 'Resumen y publicación'}
            </Button>}
          </div>
        }
      />

      {gradingFeatureFlags.teacherWorkTiming && evalId && (
        <TeacherWorkTimer key={evalId} evaluacionId={evalId} />
      )}

      {/* Selectores */}
      <Card className="mx-4 mb-4 grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Materia">
          <Select value={materiaId} onChange={(e) => { changeContext({ materia: e.target.value, evaluacion: null, calificacion: null, estudiante: null, pregunta: null, hoja: null }); setSelectedBatch(new Set()); }}>
            {materias?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Evaluación">
          <Select value={evalId} onChange={(e) => { changeContext({ evaluacion: e.target.value, calificacion: null, estudiante: null, pregunta: null, hoja: null }); setSelectedBatch(new Set()); }}>
            {(!evals || evals.length === 0) && <option value="">Sin evaluaciones</option>}
            {evals?.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.tipo_actividad ? `${ev.tipo_actividad} · ` : ''}{ev.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* Main split view */}
      {isTeacher && canGrade && <GradingJobMonitor embedded />}
      {mode === 'publicacion' && <Card className="mx-4 mb-4 space-y-2 p-4">
        <h2 className="font-bold">Resumen de notas del examen</h2>
        <p className="text-sm text-muted">{counters?.todas ?? 0} alumnos · {counters?.pendientes ?? 0} por revisar · {counters?.procesando ?? 0} calificando · {counters?.publicadas ?? 0} publicadas.</p>
        <p className="text-sm text-muted">Selecciona las notas que ya revisaste. Confirmar guarda tu decisión; publicar permite al estudiante verla. Los casos con bloqueos deben resolverse primero.</p>
      </Card>}
      {selectedStudentId && !selectedId && mode !== 'carga' && <Card className="mx-4 mb-4 space-y-3 p-4">
        <h2 className="text-lg font-bold">{studentMap.get(selectedStudentId)?.nombre ?? 'Estudiante seleccionado'}</h2>
        <p role="status" className="text-sm text-muted">{selectedStudentReference.isLoading ? 'Consultando entrega…' : selectedStudentReference.error ? 'No se pudo consultar la entrega. Actualiza la lista.' : selectedRow ? 'Aún no tiene una calificación. Puedes añadir su entrega o establecer una nota manual.' : 'Este estudiante no pertenece a la evaluación seleccionada.'}</p>
        {canGrade && selectedRow && <div className="flex flex-wrap gap-2"><Button onClick={() => changeContext({ modo: 'carga' })}>Añadir su entrega</Button><Button variant="outline" onClick={() => setManualGradeOpen(true)}>Establecer nota</Button></div>}
      </Card>}
      {mode === 'carga' && canGrade && selectedEval && <GradingUploadPanel
        key={`${evalId}-${selectedStudentId ?? ''}-${discardVersion}`}
        evaluationId={evalId} students={estudiantes} studentId={selectedStudentId ?? ''}
        onStudentChange={(id) => changeContext({ estudiante: id, calificacion: null, pregunta: null, hoja: null })}
        onDirtyChange={updateDirty}
        onClose={returnToReview}
      />}
      {directEvaluation.error && <p role="alert" className="p-4 text-rose-600">No se pudo abrir esta evaluación. Comprueba el acceso o selecciona otra.</p>}
      <div className={cn('min-w-0 flex-1 flex-col gap-4 lg:flex-row', mode === 'carga' ? 'hidden' : 'flex')}>
        {/* Left panel — list */}
        <div className={`min-w-0 flex-col border-border ${selectedId ? 'hidden lg:flex lg:w-64 lg:shrink-0 lg:border-r' : 'flex flex-1'} ${!evalId ? 'flex-1' : ''}`}>
          {/* Summary + filters */}
          {evalId && counters && (
            <div className="space-y-3 border-b border-border px-4 pb-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div><p className="text-lg font-extrabold text-amber-600">{counters.pendientes}</p><p className="text-xs text-muted">Por revisar</p></div>
                  <div><p className="text-lg font-extrabold text-emerald-600">{counters.publicadas}</p><p className="text-xs text-muted">Publicadas</p></div>
                  <div><p className="text-lg font-extrabold text-fg">{counters.todas}</p><p className="text-xs text-muted">Alumnos</p></div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    aria-label="Buscar estudiante"
                    placeholder="Buscar estudiante…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus-ring h-11 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <div className="flex flex-wrap rounded-lg bg-surface-2 p-0.5">
                  {(['todas', 'pendientes', 'alertas', 'procesando', 'publicadas'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => changeContext({ filtro: f })}
                      aria-pressed={gradeFilter === f}
                      className={`focus-ring min-h-11 rounded-md px-2.5 text-xs font-semibold capitalize transition ${gradeFilter === f ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                    >
                      {f} ({counters[f]})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student list */}
          <div className="flex-1 px-4 pb-4">
            {!evalId ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                Selecciona materia y evaluación para comenzar.
              </div>
            ) : isLoading ? (
              <div className="space-y-2 pt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : reviewQuery.error ? (
              <div role="alert" className="space-y-3 py-6 text-sm">
                <p>{toApiError(reviewQuery.error).detail}</p>
                <Button variant="outline" onClick={() => { void queryClient.resetQueries({ queryKey: ['evaluation-review', evalId] }); }}>Actualizar lista</Button>
              </div>
            ) : counters?.todas === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                No hay estudiantes matriculados en esta materia.
              </div>
            ) : reviewRows.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                No hay resultados con ese filtro.
              </div>
            ) : (
              <div className="space-y-1 pt-3">
                {reviewRows.map((row) => {
                  const selected = selectedId ? selectedId === row.calificacion_id : selectedStudentId === row.estudiante_id;
                  const summary = row.resumen_revision;
                  return (
                    <div
                      key={row.estudiante_id}
                      className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                        selected ? 'border-brand-300 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      {canGrade && row.calificacion_id && <button type="button" role="checkbox" aria-label={`Seleccionar nota de ${row.nombre}`} aria-checked={selectedBatch.has(row.calificacion_id)} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg disabled:opacity-40" disabled={row.nota == null} onClick={() => toggleSelect(row.calificacion_id!)}>
                        <span aria-hidden="true" className={cn('grid h-5 w-5 place-items-center rounded border border-muted', selectedBatch.has(row.calificacion_id) && 'border-brand-600 bg-brand-600 text-white')}>{selectedBatch.has(row.calificacion_id) ? '✓' : ''}</span>
                      </button>}
                      <button type="button" className="focus-ring flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left" onClick={() => {
                        changeContext({ calificacion: row.calificacion_id, estudiante: row.estudiante_id, pregunta: null, hoja: null });
                        setReviewCompleted(false);
                      }}>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{row.nombre}</p>
                          <p className="text-xs capitalize text-muted">{row.estado === 'procesando' ? 'Calificando' : row.estado.replace(/_/g, ' ')}</p>
                          {summary.tiene_alertas && <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Revisar alertas{summary.pqrs_abiertas ? ` · ${summary.pqrs_abiertas} reclamo(s)` : ''}</p>}
                          {row.calificacion_id && summary.version == null && row.estado !== 'procesando' && <p className="text-xs text-muted">Sin desglose disponible</p>}
                        </div>
                        <span className="shrink-0 text-lg font-bold">{row.estado === 'procesando' ? <LoaderCircle className="h-5 w-5 animate-spin" aria-label="Calificando" /> : row.nota == null ? '—' : Number(row.nota).toFixed(1)}</span>
                      </button>
                    </div>
                  );
                })}
                {reviewQuery.hasNextPage && <Button variant="outline" className="w-full" loading={reviewQuery.isFetchingNextPage} onClick={() => void reviewQuery.fetchNextPage()}>Más estudiantes</Button>}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        <div
          className={`min-h-0 min-w-0 flex-1 ${
            selectedId
              ? 'fixed inset-0 z-30 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-surface lg:static lg:z-auto lg:h-auto lg:max-h-none'
              : 'hidden lg:flex lg:items-center lg:justify-center'
          }`}
        >
          {selectedId && mode !== 'carga' ? (
            <>
              {/* Mobile overlay close */}
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
                <button type="button" onClick={() => setSelectedId(null)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted">
                  <ArrowLeft className="h-4 w-4" /> Volver a lista
                </button>
                {mobileDirty && <span className="text-[10px] font-semibold text-amber-600">Sin guardar</span>}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-visible">
                {detalleQuery.isLoading ? (
                  <div className="h-full space-y-4 overflow-y-auto p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
                ) : detalleQuery.error ? (
                  <div className="p-5 text-sm text-rose-600">Error al cargar detalle.</div>
                ) : detalleQuery.data && detalleQuery.data.evaluacion_id === evalId && (!selectedStudentId || detalleQuery.data.estudiante_id === selectedStudentId) ? (
                  <PanelDetalle
                    key={`${selectedId}-${discardVersion}`}
                    cal={detalleQuery.data}
                    notaMaxima={notaMaxima}
                    studentMap={studentMap}
                    onClose={() => { setSelectedId(null); }}
                    onConfirm={(id, _nota) => {
                      const cal = detalleQuery.data?.id === id ? detalleQuery.data : cals?.find((c) => c.id === id);
                      if (cal) { setConfirmingSingle(cal); }
                    }}
                    onAjustar={(id, nota, feedback) => ajustarMut.mutate({ id, nota, feedback })}
                    onPublish={(id) => publishMut.mutate(id)}
                    onRechazar={(id) => setRejectId(id)}
                    onDirtyChange={updateDirty}
                    onSaved={() => {
                      updateDirty(false);
                      const studentId = detalleQuery.data?.estudiante_id;
                      if (studentId) setSavedStudents((previous) => ({ ...previous, [evalId]: [...new Set([...(previous[evalId] ?? []), studentId])] }));
                    }}
                    captureNextGrade={captureNextGrade}
                    canGrade={canGrade}
                    canReviewClaims={canReviewClaims}
                    canPublish={canPublish}
                    confirmPending={confirmarMut.isPending}
                    adjustPending={ajustarMut.isPending}
                    publishPending={publishMut.isPending}
                  />
                ) : (
                  <div role="alert" className="flex h-full items-center justify-center p-5 text-sm text-muted">La calificación no corresponde a la evaluación o al estudiante seleccionado.</div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center justify-center p-5 text-sm text-muted lg:flex">
              {reviewCompleted ? (
                <Card className="max-w-md border-emerald-200 p-6 text-center dark:border-emerald-500/30">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="mt-3 text-lg font-bold text-fg">Revisión completada</p>
                  <p className="mt-1 text-sm text-muted">{savedStudents[evalId]?.length ?? 0} alumnos con ajustes guardados en esta sesión. Las notas no se publicaron automáticamente. {counters?.pendientes ?? 0} alumnos continúan por revisar en el examen.</p>
                </Card>
              ) : 'Selecciona un estudiante para ver el detalle.'}
            </div>
          )}
        </div>
      </div>

      {batchResult && <Card className="m-4 space-y-2 p-4" role="status">
        <p className="font-semibold">{batchResult.exitosos} operaciones completadas · {batchResult.fallidos} pendientes</p>
        {batchResult.results.filter((item) => !item.success).map((item) => <p key={item.calificacion_id} className="text-sm text-rose-700 dark:text-rose-300">{studentMap.get(cals.find((grade) => grade.id === item.calificacion_id)?.estudiante_id ?? '')?.nombre ?? 'Calificación'}: {item.error || 'No se pudo completar.'}</p>)}
        {batchResult.fallidos > 0 && <p className="text-sm text-muted">Solo quedaron seleccionados los casos fallidos. Corrígelos antes de volver a ejecutar la acción.</p>}
      </Card>}
      {/* Batch actions */}
      {canGrade && !mobileDirty && mode !== 'carga' && <BatchActions
        selected={selectedArray}
        notaMaxima={notaMaxima}
        onConfirmBatch={(items) => confirmBatchMut.mutate(items)}
        onAjustarBatch={(items) => ajustarBatchMut.mutate(items)}
        onPublishBatch={(ids) => publishBatchMut.mutate(ids)}
        onClear={() => setSelectedBatch(new Set())}
        batchPending={confirmBatchMut.isPending || ajustarBatchMut.isPending || publishBatchMut.isPending}
        canPublish={canPublish}
      />}

      <ManualGradeModal
        preferredStudentId={selectedStudentId}
        open={manualGradeOpen}
        students={estudiantes}
        grades={cals ?? []}
        notaMaxima={notaMaxima ?? 5}
        loading={manualGradeMut.isPending}
        onClose={() => setManualGradeOpen(false)}
        onSubmit={(payload) => manualGradeMut.mutate(payload)}
      />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={!!confirmingSingle}
        onClose={() => setConfirmingSingle(null)}
        onConfirm={() => confirmingSingle && confirmarMut.mutate(confirmingSingle)}
        title="Confirmar nota"
        confirmLabel="Confirmar"
        loading={confirmarMut.isPending}
        description={
          <span>
            Vas a confirmar la nota de <strong>{confirmingSingle ? studentLabel(confirmingSingle, studentMap) : ''}</strong>
            {confirmingSingle?.nota_sugerida != null && <> con <strong>{Number(confirmingSingle.nota_sugerida).toFixed(1)}</strong></>}.
          </span>
        }
      />

      <ConfirmDialog
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={() => rejectId && revisionMut.mutate({
          id: rejectId,
          motivo: 'El docente descartó la sugerencia automática para comprobar la evidencia personalmente.',
        })}
        title="Revisar la nota manualmente"
        confirmLabel="Abrir revisión manual"
        tone="primary"
        loading={revisionMut.isPending}
        description="La sugerencia de IA se conservará como referencia. No se asignará cero ni se publicará nada; se abrirá la edición para que verifiques y guardes la nota correcta."
      />

      {/* Mobile dirty state confirm */}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.state === 'blocked' && blocker.reset()}
        onConfirm={() => { if (blocker.state !== 'blocked') return; updateDirty(false); setDiscardVersion((version) => version + 1); blocker.proceed(); }}
        title="Cambios sin guardar"
        confirmLabel="Descartar y continuar"
        cancelLabel="Seguir editando"
        tone="danger"
        description="Guarda el ajuste desde su editor o descártalo explícitamente antes de cambiar de estudiante, pregunta o pantalla."
      />
    </div>
  );
}
