import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft, BookOpenCheck, Camera, CheckCircle2, ChevronDown, ChevronRight,
  Clock, ExternalLink, FileImage, FileText, GraduationCap, Pencil, RotateCcw,
  Search, ShieldAlert, Sparkles, X,
} from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Field, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { useEstudiantes } from '@/modules/materias/hooks';
import { getEvaluacion, listEvaluaciones } from '@/modules/evaluaciones/api';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/lib/analytics';
import { routes } from '@/config/routes';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  ajustarNota, ajustarNotaBatch, confirmarNota, confirmarNotaBatch,
  crearIncidencia, getBandejaDocente, getCalificacionDetalle, listarIncidencias,
  establecerNotaManual, listCalificaciones, publicarNota, publicarNotaBatch,
  marcarRevisionManual, resolverIncidencia, setAnswersReleased, solicitarReemplazoEvidencia, updateGradeBreakdown,
} from './api';
import { RevisionGuide } from './RevisionGuide';
import { GradeBreakdown } from './components/GradeBreakdown';
import { GradeComponentEditor } from './components/GradeComponentEditor';
import { GradeGlobalAdjustmentEditor } from './components/GradeGlobalAdjustmentEditor';
import { GradeBreakdownHistory } from './components/GradeBreakdownHistory';
import { formatAIModelSource } from './aiPipelineLabels';
import { formatTimelineScore } from './timeline';
import type { BatchResult, Calificacion, CalificacionDetalle, GradeComponentChange, GradeFilter } from '@/types/api';

const CONFIRMADA = 'confirmada';
const AJUSTADA = 'ajustada';
const PUBLICADA = 'publicada';


/* States considered "teacher approved" */
const DONE_STATES = new Set([CONFIRMADA, AJUSTADA, PUBLICADA]);

/* ─── Helper ─── */
function studentLabel(
  c: Calificacion,
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

function IncidenciasSection({ calificacionId }: { calificacionId: string }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newTipo, setNewTipo] = useState('confianza_baja');
  const [newDesc, setNewDesc] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveText, setResolveText] = useState('');

  const { data: incidencias, isLoading, refetch } = useQuery({
    queryKey: ['incidencias', calificacionId],
    queryFn: () => listarIncidencias(calificacionId),
  });
  const createMut = useMutation({
    mutationFn: () => crearIncidencia(calificacionId, { tipo: newTipo, descripcion: newDesc }),
    onSuccess: () => { refetch(); setShowCreate(false); setNewDesc(''); toast.success('Incidencia creada'); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const resolveMut = useMutation({
    mutationFn: () => resolverIncidencia(resolveId!, resolveText),
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['bandeja-docente'] });
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
                  <button type="button" onClick={() => setResolveId(inc.id)} className="focus-ring shrink-0 text-brand-600 hover:text-brand-700">Resolver</button>
                )}
              </div>
              {inc.tipo === 'solicitud_revision' && (
                <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Motivo: {String(inc.metadata_json?.motivo ?? 'revisión general').replace(/_/g, ' ')}
                </p>
              )}
              <p className="mt-1 text-muted">{inc.descripcion}</p>
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
  confirmPending: boolean;
  adjustPending: boolean;
  publishPending: boolean;
}) {
  const [adjNota, setAdjNota] = useState(Number(cal.nota_confirmada ?? cal.nota_sugerida ?? 0));
  const [adjFeedback, setAdjFeedback] = useState(cal.feedback ?? '');
  const [showAjustar, setShowAjustar] = useState(cal.estado === 'requiere_revision');
  const [adjError, setAdjError] = useState('');
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [replacementReason, setReplacementReason] = useState('');
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editingComponentDirty, setEditingComponentDirty] = useState(false);
  const [pendingEditorAction, setPendingEditorAction] = useState<string | 'close' | null>(null);
  const [showGlobalAdjustment, setShowGlobalAdjustment] = useState(false);
  const pendingClose = useRef<(() => void) | null>(null);

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
    mutationFn: (change: GradeComponentChange) => {
      if (!cal.desglose) throw new Error('No hay desglose vigente');
      return updateGradeBreakdown(cal.id, {
        version_esperada: cal.desglose.version,
        cambios_componentes: [change],
      });
    },
    onSuccess: () => {
      setEditingComponentDirty(false);
      setEditingComponentId(null);
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      void queryClient.invalidateQueries({ queryKey: ['calificaciones', cal.evaluacion_id] });
      void queryClient.invalidateQueries({ queryKey: ['grade-breakdown-history', cal.id] });
      toast.success('Puntaje actualizado y nota recalculada.');
    },
    onError: (error) => {
      const parsed = toApiError(error);
      if (parsed.status === 409) {
        setEditingComponentDirty(false);
        setEditingComponentId(null);
        void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
        toast.error('La calificación cambió en otra revisión. Recargamos la versión vigente sin sobrescribirla.');
        return;
      }
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
  const originalNota = Number(cal.nota_confirmada ?? cal.nota_sugerida ?? 0);
  const originalFeedback = cal.feedback ?? '';
  const isDirty = adjNota !== originalNota || adjFeedback !== originalFeedback;

  // Reset dirty state when cal changes
  useEffect(() => {
    setAdjNota(Number(cal.nota_confirmada ?? cal.nota_sugerida ?? 0));
    setAdjFeedback(cal.feedback ?? '');
    setShowAjustar(cal.estado === 'requiere_revision');
    setAdjError('');
    setShowDirtyWarning(false);
    pendingClose.current = null;
  }, [cal.id, cal.estado, cal.nota_confirmada, cal.nota_sugerida, cal.feedback]);

  // Notify parent about dirty state
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function requestComponentEdit(componentId: string) {
    if (editingComponentId && editingComponentId !== componentId && editingComponentDirty) {
      setPendingEditorAction(componentId);
      return;
    }
    setEditingComponentDirty(false);
    setEditingComponentId(componentId);
  }

  function requestComponentClose() {
    if (editingComponentDirty) {
      setPendingEditorAction('close');
      return;
    }
    setEditingComponentId(null);
  }

  function discardComponentChanges() {
    const action = pendingEditorAction;
    setPendingEditorAction(null);
    setEditingComponentDirty(false);
    setEditingComponentId(action && action !== 'close' ? action : null);
  }
  function handleClose() {
    if (isDirty) {
      setShowDirtyWarning(true);
    } else {
      onClose();
    }
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

  function submitAjuste() {
    const n = Number(adjNota);
    if (isNaN(n) || n < 0) { setAdjError('Nota inválida'); return; }
    if (notaMaxima != null && n > notaMaxima) { setAdjError(`Máximo ${notaMaxima}`); return; }
    setAdjError('');
    onAjustar(cal.id, n, adjFeedback || undefined);
  }

  return (
    <>
    <div className="flex h-full min-h-0 flex-col">
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

      <div className="min-h-0 flex-1 touch-pan-y space-y-5 overflow-x-hidden overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
        {/* Nota principal */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">
              {done ? (published ? 'Nota publicada' : 'Nota confirmada') : 'Nota sugerida'}
            </p>
            <p className="font-display text-4xl font-extrabold text-fg">
              {Number(cal.nota_confirmada ?? cal.nota_sugerida ?? 0).toFixed(1)}
              {notaMaxima != null && <span className="ml-2 text-lg font-semibold text-muted">/ {notaMaxima.toFixed(1)}</span>}
            </p>
          </div>
          <Badge tone={done ? (published ? 'brand' : 'success') : 'warning'}>
            {published ? 'Publicada' : done ? 'Confirmada' : manualReview ? 'Revisión manual' : 'Por revisar'}
          </Badge>
        </div>

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
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)] xl:items-start">
          <div className="space-y-4">
            {evidenceUrl ? (
              <section aria-labelledby="evidence-title" className="rounded-xl border border-border bg-surface-2">
                <div className="flex items-center justify-between border-b border-border px-4 py-3 text-sm font-semibold text-muted">
                  <h2 id="evidence-title" className="flex items-center gap-2 text-base font-bold text-fg">
                    {isPdfEvidence ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                    Evidencia del estudiante
                    <Badge tone="neutral">{evidencePages} {evidencePages === 1 ? 'hoja' : 'hojas'}</Badge>
                  </h2>
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-brand-700 hover:bg-brand-50 hover:text-brand-800 dark:text-brand-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-100"
                  >
                    Abrir en grande <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {isPdfEvidence ? (
                  <iframe
                    src={evidenceUrl}
                    title="Evidencia PDF del estudiante"
                    className="h-[34rem] w-full bg-white"
                  />
                ) : (
                  <img
                    src={evidenceUrl}
                    alt="Evidencia del estudiante"
                    className="max-h-[34rem] w-full bg-white object-contain p-2"
                  />
                )}
                <div className="flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-muted">Si falta una página o no corresponde, solicita el paquete completo otra vez.</p>
                  <Button type="button" size="sm" variant="outline" onClick={() => setReplacementOpen(true)}>
                    <RotateCcw className="h-4 w-4" /> Solicitar reemplazo
                  </Button>
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

          <RevisionGuide items={cal.guia_revision ?? []} />
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
        {criterios.length > 0 && (
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
              <Button type="button" variant="outline" onClick={() => answerReleaseMutation.mutate(!cal.respuestas_liberadas)} loading={answerReleaseMutation.isPending}>
                {cal.respuestas_liberadas ? 'Ocultar respuestas' : 'Liberar respuestas'}
              </Button>
            </div>
            <GradeBreakdown
              breakdown={cal.desglose}
              onEdit={requestComponentEdit}
              editingComponentId={editingComponentId}
              renderEditor={(component) => (
                <GradeComponentEditor
                  component={component}
                  formula={cal.desglose!.formula}
                  saving={breakdownMutation.isPending}
                  onDirtyChange={setEditingComponentDirty}
                  onCancel={requestComponentClose}
                  onSave={(change) => breakdownMutation.mutate(change)}
                />
              )}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">Si un caso excepcional cambia la nota completa, quedará separado de los puntos por respuesta.</p>
              <Button type="button" variant="outline" onClick={() => setShowGlobalAdjustment((value) => !value)}>
                {showGlobalAdjustment ? 'Cancelar ajuste global' : 'Registrar ajuste global'}
              </Button>
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
        <Field label="Retroalimentación">
          <Textarea
            value={adjFeedback}
            onChange={(e) => setAdjFeedback(e.target.value)}
            placeholder="Escribe o edita el feedback para el estudiante…"
            rows={4}
          />
        </Field>

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {alertas.map((a, i) => <p key={i}>⚠️ {a}</p>)}
          </div>
        )}

        {/* Acciones */}
        {!done && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => onConfirm(cal.id, adjNota)}
              loading={confirmPending}
              disabled={confirmPending}
            >
              <CheckCircle2 className="h-4 w-4" /> Confirmar nota
            </Button>
            <Button variant="outline" onClick={() => setShowAjustar(!showAjustar)}>
              <Pencil className="h-4 w-4" /> Ajustar
            </Button>
            {!manualReview && (
              <Button variant="ghost" onClick={() => onRechazar(cal.id)}>
                <RotateCcw className="h-4 w-4" /> Revisar manualmente
              </Button>
            )}
          </div>
        )}
        {done && !published && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onPublish(cal.id)} loading={publishPending} disabled={publishPending}>
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

        {showAjustar && (
          <Card className="space-y-3 p-4">
            <Field label="Nota" hint={notaMaxima != null ? `0 - ${notaMaxima}` : undefined}>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={notaMaxima}
                value={adjNota}
                onChange={(e) => { setAdjNota(Number(e.target.value)); setAdjError(''); }}
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
        <IncidenciasSection calificacionId={cal.id} />
      </div>
    </div>
    <ConfirmDialog
      open={showDirtyWarning}
      onClose={() => setShowDirtyWarning(false)}
      onConfirm={() => { setShowDirtyWarning(false); onClose(); }}
      title="Cambios sin guardar"
      confirmLabel="Descartar cambios"
      cancelLabel="Volver"
      tone="primary"
      description="Tienes cambios en la nota o retroalimentación que no se han guardado. Si cierras sin guardar, se perderán."
    >
      <div className="mt-3 flex flex-col gap-2">
        <Button
          size="sm"
          onClick={() => {
            setShowDirtyWarning(false);
            if (!done) {
              onConfirm(cal.id, adjNota);
            } else {
              onAjustar(cal.id, adjNota, adjFeedback || undefined);
            }
          }}
          loading={confirmPending || adjustPending}
        >
          Guardar cambios
        </Button>
      </div>
    </ConfirmDialog>
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
}: {
  selected: Calificacion[];
  notaMaxima: number | undefined;
  onConfirmBatch: (items: { calificacion_id: string; nota_confirmada: number }[]) => void;
  onAjustarBatch: (items: { calificacion_id: string; nota_confirmada: number }[]) => void;
  onPublishBatch: (ids: string[]) => void;
  onClear: () => void;
  batchPending: boolean;
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
              nota_confirmada: Number(c.nota_sugerida ?? 0),
            })))}
            loading={batchPending}
            disabled={batchPending}
          >
            <CheckCircle2 className="h-4 w-4" /> Confirmar todos
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowBulk(!showBulk)} disabled={batchPending}>
            <Pencil className="h-4 w-4" /> Ajustar nota común
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onPublishBatch(selected.map((c) => c.id))} disabled={batchPending}>
            <CheckCircle2 className="h-4 w-4" /> Publicar seleccionados
          </Button>
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
  grades: Calificacion[];
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

  useEffect(() => {
    if (!open) return;
    const preferred = students.find((student) => !gradedIds.has(student.id)) ?? students[0];
    setStudentId(preferred?.id ?? '');
    setScore(0);
    setReason('No presentó la actividad');
    setFeedback('');
  }, [gradedIds, open, students]);

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

/* ─── Componente principal ─── */
export function CalificacionesWorkspace() {
  const navigate = useNavigate();
  const { evaluacionId: evalIdParam } = useParams<{ evaluacionId: string }>();
  const [searchParams] = useSearchParams();
  const requestedCalificacionId = searchParams.get('calificacion');
  const [materiaId, setMateriaId] = useState('');
  const [evalId, setEvalId] = useState(evalIdParam ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(requestedCalificacionId);
  const [selectedBatch, setSelectedBatch] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('todas');
  const [confirmingSingle, setConfirmingSingle] = useState<Calificacion | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [mobileDirty, setMobileDirty] = useState(false);
  const [mobileDirtyConfirm, setMobileDirtyConfirm] = useState(false);
  const [manualGradeOpen, setManualGradeOpen] = useState(false);

  const { data: materias } = useMaterias();
  const directEvaluation = useQuery({
    queryKey: ['evaluacion', evalIdParam],
    queryFn: () => getEvaluacion(evalIdParam!),
    enabled: Boolean(evalIdParam),
    retry: false,
  });

  useEffect(() => {
    if (!directEvaluation.data) return;
    setMateriaId(directEvaluation.data.materia_id);
    setEvalId(directEvaluation.data.id);
  }, [directEvaluation.data]);

  useEffect(() => {
    if (requestedCalificacionId) setSelectedId(requestedCalificacionId);
  }, [requestedCalificacionId]);

  useBodyScrollLock(Boolean(selectedId));


  useEffect(() => {
    if (!materiaId && !evalIdParam && materias?.[0]) setMateriaId(materias[0].id);
  }, [evalIdParam, materias, materiaId]);

  const { data: evals } = useQuery({
    queryKey: ['evaluaciones', materiaId],
    queryFn: () => listEvaluaciones(materiaId),
    enabled: !!materiaId,
  });
  useEffect(() => {
    if (evalIdParam && directEvaluation.data) {
      if (directEvaluation.data.materia_id !== materiaId) return;
      if (evals?.some((evaluation) => evaluation.id === evalIdParam)) {
        setEvalId(evalIdParam);
        return;
      }
    }
    if (evalIdParam && directEvaluation.isLoading) return;

    if (evals && evals.length > 0 && !evals.find((evaluation) => evaluation.id === evalId)) {
      setEvalId(evals[0].id);
    }
    if (evals?.length === 0) setEvalId('');
  }, [directEvaluation.data, directEvaluation.isLoading, evalId, evalIdParam, evals, materiaId]);

  // Track workspace opened
  useEffect(() => {
    if (evalId) trackEvent('workspace_opened', { evaluacion_id: evalId, metadata_json: { materia_id: materiaId } });
  }, [evalId, materiaId]);

  const { data: cals, isLoading } = useQuery({
    queryKey: ['calificaciones', evalId],
    queryFn: () => listCalificaciones(evalId),
    enabled: !!evalId,
  });
  const { data: teacherInbox } = useQuery({
    queryKey: ['bandeja-docente'],
    queryFn: getBandejaDocente,
  });
  const openClaimGradeIds = useMemo(
    () => new Set((teacherInbox?.reclamos ?? []).map((item) => item.calificacion_id)),
    [teacherInbox],
  );
  const selectedEval = evals?.find((e) => e.id === evalId);
  const notaMaxima = selectedEval?.nota_maxima != null ? Number(selectedEval.nota_maxima) : undefined;

  // Student map
  const { estudiantes } = useEstudiantes(materiaId);
  const studentMap = useMemo(
    () => new Map(estudiantes.map((s) => [s.id, s])),
    [estudiantes],
  );

  // Detail query
  const detalleQuery = useQuery({
    queryKey: ['calificacion-detalle', selectedId],
    queryFn: () => getCalificacionDetalle(selectedId!),
    enabled: !!selectedId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calificaciones', evalId] });
    queryClient.invalidateQueries({ queryKey: ['bandeja-docente'] });
    if (selectedId) queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', selectedId] });
  }, [evalId, selectedId]);

  // Mutations
  const confirmarMut = useMutation({
    mutationFn: (c: Calificacion) => confirmarNota(c.id, Number(c.nota_sugerida ?? 0)),
    onSuccess: () => { invalidate(); toast.success('Nota confirmada'); setConfirmingSingle(null); trackEvent('calificacion_confirmed', { evaluacion_id: evalId }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const ajustarMut = useMutation({
    mutationFn: (args: { id: string; nota: number; feedback?: string }) => ajustarNota(args.id, args.nota, args.feedback),
    onSuccess: () => { invalidate(); toast.success('Nota ajustada'); trackEvent('grade_adjusted', { evaluacion_id: evalId }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const revisionMut = useMutation({
    mutationFn: (args: { id: string; motivo: string }) => marcarRevisionManual(args.id, args.motivo),
    onSuccess: (cal) => {
      setRejectId(null);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ['calificacion-detalle', cal.id] });
      toast.success('Sugerencia de IA descartada. Revisa y guarda la nota correcta.');
      trackEvent('grade_marked_manual_review', { evaluacion_id: evalId });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const confirmBatchMut = useMutation({
    mutationFn: (items: { calificacion_id: string; nota_confirmada: number }[]) => confirmarNotaBatch(items),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.exitosos} nota(s) confirmada(s)`);
      if (res.fallidos > 0) toast.error(`${res.fallidos} fallaron`);
      setSelectedBatch(new Set());
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
      setSelectedBatch(new Set());
      trackEvent('batch_adjusted', { evaluacion_id: evalId, metadata_json: { batch_size: res.exitosos } });
    },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => publicarNota(id),
    onSuccess: () => { invalidate(); toast.success('Nota publicada al estudiante'); trackEvent('calificacion_published', { evaluacion_id: evalId }); },
    onError: (e) => toast.error(toApiError(e).detail),
  });
  const publishBatchMut = useMutation({
    mutationFn: (ids: string[]) => publicarNotaBatch(ids),
    onSuccess: (res: BatchResult) => {
      invalidate();
      toast.success(`${res.exitosos} nota(s) publicada(s)`);
      if (res.fallidos > 0) toast.error(`${res.fallidos} no pudieron publicarse`);
      setSelectedBatch(new Set());
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
  const displayedCals = useMemo(() => {
    const items = [...(cals ?? [])].sort((a, b) => {
      const aConfirmed = DONE_STATES.has(a.estado);
      const bConfirmed = DONE_STATES.has(b.estado);
      if (aConfirmed !== bConfirmed) return aConfirmed ? 1 : -1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const filtered = gradeFilter === 'pendientes'
      ? items.filter((c) => !DONE_STATES.has(c.estado))
      : gradeFilter === 'confirmadas'
        ? items.filter((c) => DONE_STATES.has(c.estado))
        : gradeFilter === 'incidencias'
          ? items.filter((c) => c.estado === 'requiere_revision' || openClaimGradeIds.has(c.id))
        : items;
    if (!searchTerm) return filtered;
    const q = searchTerm.toLowerCase();
    return filtered.filter((c) => {
      const s = studentMap.get(c.estudiante_id);
      return s?.nombre?.toLowerCase().includes(q) || s?.email?.toLowerCase().includes(q) || c.estudiante_id.includes(q);
    });
  }, [cals, gradeFilter, openClaimGradeIds, searchTerm, studentMap]);

  const gradeSummary = useMemo(() => {
    const items = cals ?? [];
    const confirmed = items.filter((c) => DONE_STATES.has(c.estado)).length;
    return { total: items.length, confirmed, pending: items.length - confirmed };
  }, [cals]);

  function toggleSelect(id: string) {
    setSelectedBatch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedArray = useMemo(
    () => (cals ?? []).filter((c) => selectedBatch.has(c.id)),
    [cals, selectedBatch],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <PageHeader
        title="Calificaciones"
        eyebrow="Workspace de revisión"
        subtitle="Revisa, confirma o ajusta las calificaciones sugeridas por la IA."
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
            {evalId && estudiantes.length > 0 && (
              <Button type="button" variant="outline" onClick={() => setManualGradeOpen(true)}>
                <Pencil className="h-4 w-4" /> Establecer nota
              </Button>
            )}
            <Link
              to={routes.materiasPara('calificar')}
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"
            >
              <Camera className="h-4 w-4" /> Calificar foto
            </Link>
          </div>
        }
      />

      {/* Selectores */}
      <Card className="mx-4 mb-4 grid gap-4 p-4 sm:grid-cols-2">
        <Field label="Materia">
          <Select value={materiaId} onChange={(e) => { navigate(routes.calificacionesWorkspace, { replace: true }); setMateriaId(e.target.value); setEvalId(''); setSelectedId(null); setSelectedBatch(new Set()); }}>
            {materias?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Evaluación">
          <Select value={evalId} onChange={(e) => { const id = e.target.value; setEvalId(id); navigate(id ? routes.calificacionesEvaluacion(id) : routes.calificacionesWorkspace, { replace: true }); setSelectedId(null); setSelectedBatch(new Set()); }}>
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
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left panel — list */}
        <div className={`flex flex-col border-border ${selectedId ? 'hidden lg:flex lg:w-1/3 lg:border-r' : 'flex-1'} ${!evalId ? 'flex-1' : ''}`}>
          {/* Summary + filters */}
          {evalId && cals && cals.length > 0 && (
            <div className="space-y-3 border-b border-border px-4 pb-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div><p className="text-lg font-extrabold text-amber-600">{gradeSummary.pending}</p><p className="text-xs text-muted">Por revisar</p></div>
                  <div><p className="text-lg font-extrabold text-emerald-600">{gradeSummary.confirmed}</p><p className="text-xs text-muted">Confirmadas</p></div>
                  <div><p className="text-lg font-extrabold text-fg">{gradeSummary.total}</p><p className="text-xs text-muted">Total</p></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar estudiante…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="focus-ring h-9 w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <div className="flex rounded-lg bg-surface-2 p-0.5">
                  {(['todas', 'pendientes', 'confirmadas', 'incidencias'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setGradeFilter(f)}
                      className={`focus-ring min-h-8 rounded-md px-2.5 text-xs font-semibold capitalize transition ${gradeFilter === f ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Student list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {!evalId ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                Selecciona materia y evaluación para comenzar.
              </div>
            ) : isLoading ? (
              <div className="space-y-2 pt-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : !cals || cals.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                Sin calificaciones aún. Cuando los estudiantes entreguen o subas fotos, aparecerán aquí.
              </div>
            ) : displayedCals.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-12 text-sm text-muted">
                No hay resultados con ese filtro.
              </div>
            ) : (
              <div className="space-y-1 pt-3">
                {displayedCals.map((c) => {
                  const done = DONE_STATES.has(c.estado);
                  const published = c.estado === PUBLICADA;
                  const selected = selectedId === c.id;
                  const checked = selectedBatch.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelectedId(c.id); trackEvent('calificacion_opened', { calificacion_id: c.id, evaluacion_id: evalId }); if (window.innerWidth < 1024) setSelectedBatch(new Set()); }}
                      className={`focus-ring flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        selected ? 'border-brand-300 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface hover:bg-surface-2'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          onClick={(e) => { e.stopPropagation(); toggleSelect(c.id); }}
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition ${
                            checked ? 'border-brand-500 bg-brand-500 text-white' : 'border-muted'
                          }`}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={-1}
                        >
                          {checked && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{studentLabel(c, studentMap)}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone={done ? (published ? 'brand' : 'success') : 'warning'}>{published ? 'Publicada' : done ? 'Confirmada' : 'Pendiente'}</Badge>
                            {Number(c.confianza ?? 0) < 0.5 && Number(c.confianza ?? 0) > 0 && (
                              <Badge tone="error">Conf. baja</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`ml-auto shrink-0 font-display text-xl font-extrabold ${done && !published ? 'text-fg' : done ? 'text-brand-600' : 'text-amber-600'}`}>
                        {Number(c.nota_confirmada ?? c.nota_sugerida ?? 0).toFixed(1)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — detail */}
        <div
          className={`min-h-0 flex-1 overflow-hidden ${
            selectedId
              ? 'fixed inset-0 z-30 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-surface lg:static lg:z-auto lg:h-auto lg:max-h-none'
              : 'hidden lg:flex lg:items-center lg:justify-center'
          }`}
        >
          {selectedId ? (
            <>
              {/* Mobile overlay close */}
              <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
                <button type="button" onClick={() => { if (mobileDirty) setMobileDirtyConfirm(true); else setSelectedId(null); }} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted">
                  <ArrowLeft className="h-4 w-4" /> Volver a lista
                </button>
                {mobileDirty && <span className="text-[10px] font-semibold text-amber-600">Sin guardar</span>}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                {detalleQuery.isLoading ? (
                  <div className="h-full space-y-4 overflow-y-auto p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
                ) : detalleQuery.error ? (
                  <div className="p-5 text-sm text-rose-600">Error al cargar detalle.</div>
                ) : detalleQuery.data ? (
                  <PanelDetalle
                    cal={detalleQuery.data}
                    notaMaxima={notaMaxima}
                    studentMap={studentMap}
                    onClose={() => { setSelectedId(null); }}
                    onConfirm={(id, _nota) => {
                      const cal = cals?.find((c) => c.id === id);
                      if (cal) { setConfirmingSingle(cal); }
                    }}
                    onAjustar={(id, nota, feedback) => ajustarMut.mutate({ id, nota, feedback })}
                    onPublish={(id) => publishMut.mutate(id)}
                    onRechazar={(id) => setRejectId(id)}
                    onDirtyChange={setMobileDirty}
                    confirmPending={confirmarMut.isPending}
                    adjustPending={ajustarMut.isPending}
                    publishPending={publishMut.isPending}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-5 text-sm text-muted">Sin datos.</div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden items-center justify-center p-5 text-sm text-muted lg:flex">
              Selecciona un estudiante para ver el detalle.
            </div>
          )}
        </div>
      </div>

      {/* Batch actions */}
      <BatchActions
        selected={selectedArray}
        notaMaxima={notaMaxima}
        onConfirmBatch={(items) => confirmBatchMut.mutate(items)}
        onAjustarBatch={(items) => ajustarBatchMut.mutate(items)}
        onPublishBatch={(ids) => publishBatchMut.mutate(ids)}
        onClear={() => setSelectedBatch(new Set())}
        batchPending={confirmBatchMut.isPending || ajustarBatchMut.isPending || publishBatchMut.isPending}
      />

      <ManualGradeModal
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
            {' '}con <strong>{Number(confirmingSingle?.nota_sugerida ?? 0).toFixed(1)}</strong>.
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
        open={mobileDirtyConfirm}
        onClose={() => setMobileDirtyConfirm(false)}
        onConfirm={() => { setMobileDirtyConfirm(false); setMobileDirty(false); setSelectedId(null); }}
        title="Cambios sin guardar"
        confirmLabel="Descartar cambios"
        cancelLabel="Volver"
        tone="danger"
        description="Tienes cambios en la nota o retroalimentación que no se han guardado. Si vuelves a la lista sin guardar, se perderán."
      />
    </div>
  );
}
