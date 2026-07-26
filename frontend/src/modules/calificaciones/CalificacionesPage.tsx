import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { GraduationCap, CheckCircle2, Pencil, ShieldCheck, AlertTriangle, Camera, Sparkles, HelpCircle } from 'lucide-react';
import { Button, Card, Badge, statusTone, Select, Skeleton, EmptyState, Modal, ConfirmDialog, GuidedTour, Input, Field, Textarea, RichContent } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { getMateriaEstudiantes } from '@/modules/materias/api';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { listCalificaciones, confirmarNota, ajustarNota } from './api';
import { calificacionesTour } from './tourSteps';
import { queryClient } from '@/lib/queryClient';
import { toApiError } from '@/lib/api';
import type { Calificacion } from '@/types/api';

export function CalificacionesPage() {
  const { data: materias } = useMaterias();
  const [materiaId, setMateriaId] = useState('');
  const [evalId, setEvalId] = useState('');
  const [editing, setEditing] = useState<Calificacion | null>(null);
  const [adjForm, setAdjForm] = useState({ nota: 0, feedback: '' });
  const [adjError, setAdjError] = useState('');
  const [confirming, setConfirming] = useState<Calificacion | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<'todas' | 'pendientes' | 'confirmadas'>('todas');

  useEffect(() => { if (!materiaId && materias?.[0]) setMateriaId(materias[0].id); }, [materias, materiaId]);

  const { data: evals } = useQuery({ queryKey: ['evaluaciones', materiaId], queryFn: () => listEvaluaciones(materiaId), enabled: !!materiaId });
  useEffect(() => { if (evals && evals.length && !evals.find((e) => e.id === evalId)) setEvalId(evals[0].id); }, [evals, evalId]);

  const { data: cals, isLoading } = useQuery({ queryKey: ['calificaciones', evalId], queryFn: () => listCalificaciones(evalId), enabled: !!evalId });

  // Opción A: mapa estudiante_id -> User desde los matriculados de la materia (sin tocar backend).
  const { data: materiaEstudiantes } = useQuery({ queryKey: ['materia-estudiantes', materiaId], queryFn: () => getMateriaEstudiantes(materiaId), enabled: !!materiaId });
  const studentMap = useMemo(
    () => new Map((materiaEstudiantes?.estudiantes ?? []).map((s) => [s.id, s])),
    [materiaEstudiantes],
  );

  const selectedEval = evals?.find((e) => e.id === evalId);
  const notaMaxima = selectedEval?.nota_maxima != null ? Number(selectedEval.nota_maxima) : undefined;
  const gradeSummary = useMemo(() => {
    const items = cals ?? [];
    const confirmed = items.filter((item) => item.estado === 'confirmada' || item.nota_confirmada != null).length;
    return { total: items.length, confirmed, pending: items.length - confirmed };
  }, [cals]);
  const visibleGrades = useMemo(() => {
    const items = [...(cals ?? [])].sort((left, right) => {
      const leftConfirmed = left.estado === 'confirmada' || left.nota_confirmada != null;
      const rightConfirmed = right.estado === 'confirmada' || right.nota_confirmada != null;
      if (leftConfirmed !== rightConfirmed) return leftConfirmed ? 1 : -1;
      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
    if (gradeFilter === 'pendientes') return items.filter((item) => item.estado !== 'confirmada' && item.nota_confirmada == null);
    if (gradeFilter === 'confirmadas') return items.filter((item) => item.estado === 'confirmada' || item.nota_confirmada != null);
    return items;
  }, [cals, gradeFilter]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['calificaciones', evalId] });
  const confirmar = useMutation({ mutationFn: (c: Calificacion) => confirmarNota(c.id, Number(c.nota_sugerida ?? 0)), onSuccess: () => { invalidate(); toast.success('Nota confirmada'); setConfirming(null); }, onError: (e) => toast.error(toApiError(e).detail) });
  const ajustar = useMutation({ mutationFn: () => ajustarNota(editing!.id, adjForm.nota, adjForm.feedback || undefined), onSuccess: () => { invalidate(); toast.success('Nota ajustada'); setEditing(null); }, onError: (e) => toast.error(toApiError(e).detail) });

  function submitAjuste() {
    const n = Number(adjForm.nota);
    if (Number.isNaN(n) || n < 0) { setAdjError('La nota no puede ser menor que 0.'); return; }
    if (notaMaxima != null && n > notaMaxima) { setAdjError('La nota no puede superar la nota máxima de esta evaluación.'); return; }
    setAdjError('');
    ajustar.mutate();
  }

  const confirmingStudent = confirming ? studentMap.get(confirming.estudiante_id) : undefined;
  const noMaterias = materias && materias.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificaciones"
        eyebrow="Revisión docente"
        subtitle="Revisa la nota sugerida y la retroalimentación organizada antes de confirmar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTourOpen(true)}>
              <HelpCircle className="h-4 w-4" />
              ¿Cómo se usa?
            </Button>
            <Link to="/app/calificaciones/foto" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2">
              <Camera className="h-4 w-4" />
              Calificar foto
            </Link>
          </div>
        }
      />

      {/* Feature Image Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex items-center gap-4 p-4">
          <img 
            src="/branding/feature-grade.png" 
            alt="" 
            className="h-16 w-16 rounded-lg object-contain opacity-80"
          />
          <div>
            <p className="font-display font-bold">Calificación asistida por IA</p>
            <p className="mt-1 text-sm text-muted">La IA analiza las respuestas y sugiere notas. Tú decides si confirmar o ajustar.</p>
          </div>
        </div>
      </div>

      <GuidedTour steps={calificacionesTour} open={tourOpen} onClose={() => setTourOpen(false)} />

      {noMaterias ? (
        <EmptyState icon={GraduationCap} title="Primero crea una materia y una evaluación" />
      ) : (
        <>
          <Card data-tour="calificaciones-ia" className="flex items-start gap-3 border-l-4 border-l-brand-500 p-4">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
            <div>
              <p className="font-semibold">La IA sugiere. El docente decide.</p>
              <p className="text-sm text-muted">Revisa la nota y los comentarios antes de confirmar o ajustar la calificación final.</p>
            </div>
          </Card>

          <Card className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Materia">
              <Select data-tour="calificaciones-materia" value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
                {materias?.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Evaluación">
              <Select data-tour="calificaciones-evaluacion" value={evalId} onChange={(e) => setEvalId(e.target.value)}>
                {(!evals || evals.length === 0) && <option value="">Sin evaluaciones</option>}
                {evals?.map((ev) => <option key={ev.id} value={ev.id}>{ev.nombre}</option>)}
              </Select>
            </Field>
          </Card>

          {evalId && cals && cals.length > 0 && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-3 gap-4 sm:gap-7">
                <GradeMetric label="Por revisar" value={gradeSummary.pending} tone="warning" />
                <GradeMetric label="Confirmadas" value={gradeSummary.confirmed} tone="success" />
                <GradeMetric label="Total" value={gradeSummary.total} tone="neutral" />
              </div>
              <div className="grid grid-cols-3 rounded-lg bg-surface-2 p-1" aria-label="Filtrar calificaciones">
                {(['todas', 'pendientes', 'confirmadas'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setGradeFilter(filter)}
                    className={`focus-ring min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition ${gradeFilter === filter ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'}`}
                    aria-pressed={gradeFilter === filter}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!evalId ? (
            <EmptyState icon={GraduationCap} title="Esta materia no tiene evaluaciones" />
          ) : isLoading ? (
            <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : !cals || cals.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Sin calificaciones aún" description="Cuando se califiquen entregas (foto o en línea), aparecerán aquí para tu revisión." />
          ) : visibleGrades.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No hay calificaciones en este filtro" description="Cambia el filtro para consultar las demás calificaciones de la evaluación." />
          ) : (
            <div className="grid gap-3" data-tour="calificaciones-lista">
              {visibleGrades.map((c, i) => {
                const confirmada = c.estado === 'confirmada' || c.nota_confirmada != null;
                const conf = Number(c.confianza ?? 0);
                return (
                  <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="p-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {(() => {
                            const s = studentMap.get(c.estudiante_id);
                            return s?.nombre ? (
                              <>
                                <p className="truncate font-semibold">{s.nombre}</p>
                                {s.email && <p className="truncate text-xs text-muted">{s.email}</p>}
                              </>
                            ) : (
                              <>
                                <p className="font-semibold">Estudiante sin nombre</p>
                                <p className="text-xs text-muted">ID {c.estudiante_id.slice(0, 8)}</p>
                              </>
                            );
                          })()}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone[c.estado] ?? (confirmada ? 'success' : 'warning')}>{confirmada ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />} {confirmada ? 'Confirmada' : 'Por revisar'}</Badge>
                            {conf > 0 && <Badge tone="neutral">Confianza {(conf * 100).toFixed(0)}%</Badge>}
                          </div>
                        </div>
                        <div className="min-w-[92px] rounded-lg bg-surface-2 px-3 py-2 text-left sm:text-right" data-tour="calificaciones-nota">
                          <p className="font-display text-2xl font-extrabold text-fg">{Number(c.nota_confirmada ?? c.nota_sugerida ?? 0).toFixed(1)}</p>
                          <p className="text-xs text-muted">{c.nota_confirmada != null ? 'confirmada' : 'sugerida'}</p>
                        </div>
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                          {!confirmada && <Button data-tour="calificaciones-confirmar" size="sm" title="Acepta la nota sugerida como nota final." onClick={() => setConfirming(c)}><CheckCircle2 className="h-4 w-4" /> Confirmar nota</Button>}
                          <Button data-tour="calificaciones-ajustar" size="sm" variant="outline" title="Modifica la nota sugerida antes de confirmarla." onClick={() => { setEditing(c); setAdjForm({ nota: Number(c.nota_confirmada ?? c.nota_sugerida ?? 0), feedback: c.feedback ?? '' }); setAdjError(''); }}><Pencil className="h-4 w-4" /> Ajustar</Button>
                        </div>
                      </div>
                      {c.feedback && (
                        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm text-muted">
                          <RichContent content={c.feedback} variant="feedback" />
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Ajustar nota">
        <p className="mb-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-xs text-muted">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          La IA sugiere una valoración inicial. Ajusta la nota antes de confirmarla; el docente decide.
        </p>
        <form onSubmit={(e) => { e.preventDefault(); submitAjuste(); }} className="space-y-4">
          <Field label="Nota" hint={notaMaxima != null ? `Entre 0 y ${notaMaxima} (nota máxima de la evaluación).` : undefined}>
            <Input
              type="number"
              step="0.1"
              min={0}
              max={notaMaxima}
              value={adjForm.nota}
              onChange={(e) => { setAdjForm({ ...adjForm, nota: Number(e.target.value) }); if (adjError) setAdjError(''); }}
            />
            {adjError && <span className="mt-1 block text-xs text-rose-500">{adjError}</span>}
          </Field>
          <Field label="Retroalimentación"><Textarea value={adjForm.feedback} onChange={(e) => setAdjForm({ ...adjForm, feedback: e.target.value })} placeholder="Comentario para el estudiante…" /></Field>
          <Button type="submit" loading={ajustar.isPending} className="w-full">Guardar ajuste</Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={() => confirming && confirmar.mutate(confirming)}
        title="Confirmar nota"
        confirmLabel="Confirmar nota"
        loading={confirmar.isPending}
        description={
          <>
            Vas a confirmar esta nota como definitiva
            {confirmingStudent?.nombre ? <> para <strong className="text-fg">{confirmingStudent.nombre}</strong></> : ' para este estudiante'}
            {confirming?.nota_sugerida != null && <> con una nota de <strong className="text-fg">{Number(confirming.nota_sugerida).toFixed(1)}</strong></>}
            . Recuerda: la IA sugiere, el docente decide.
          </>
        }
      />
    </div>
  );
}

function GradeMetric({ label, value, tone }: { label: string; value: number; tone: 'warning' | 'success' | 'neutral' }) {
  const toneClasses = {
    warning: 'text-amber-700 dark:text-amber-300',
    success: 'text-emerald-700 dark:text-emerald-300',
    neutral: 'text-fg',
  };
  return (
    <div>
      <p className={`text-xl font-extrabold ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
