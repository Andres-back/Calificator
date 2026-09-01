import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Clock,
  Eye,
  Pencil,
  PlayCircle,
  Scan,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  QueryError,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import {
  activarRecepcionEvaluacion,
  deleteEvaluacion,
  listEvaluaciones,
  pausarRecepcionEvaluacion,
  publicarEvaluacion,
  updateEvaluacion,
  type EvaluacionUpdate,
} from '@/modules/evaluaciones/api';
import { DigitalizarEvaluacionModal } from '@/modules/evaluaciones/components/DigitalizarEvaluacionModal';
import { GenerationWizard } from '@/modules/evaluaciones/components/GenerationWizard';
import { getStudentEvaluationAction, getStudentEvaluationStatus } from '@/modules/evaluaciones/studentProgress';
import { useAuth } from '@/stores/auth';
import { useMateriaContext } from './MateriaContext';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { routes } from '@/config/routes';
import type {
  Evaluacion,
  EvaluacionModalidad,
  Materia,
} from '@/types/api';

const MODALITY_LABELS: Record<EvaluacionModalidad, string> = {
  fisica: 'En papel',
  online: 'En línea',
  mixta: 'Mixta',
};

interface EvaluationForm {
  nombre: string;
  descripcion: string;
  nota_maxima: number;
  modalidad: EvaluacionModalidad;
  fecha_limite_entrega: string;
}

const emptyForm = (): EvaluationForm => ({
  nombre: '',
  descripcion: '',
  nota_maxima: 5,
  modalidad: 'fisica',
  fecha_limite_entrega: '',
});

export function MateriaEvaluaciones() {
  const { materia } = useMateriaContext();
  const user = useAuth((state) => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const canCreateEvaluation = permissions.has('evaluations.create');
  const canUpdateEvaluation = permissions.has('evaluations.update');
  const canPublishEvaluation = permissions.has('evaluations.publish');
  const canDeleteEvaluation = permissions.has('evaluations.delete');
  const canGradeEvaluation = permissions.has('grading.grade');
  const canReviewGrades = permissions.has('grading.read');
  const canSubmitEvaluation = permissions.has('evaluations.submit');
  const canManageEvaluations = canCreateEvaluation
    || canUpdateEvaluation
    || canPublishEvaluation
    || canDeleteEvaluation
    || canGradeEvaluation
    || canReviewGrades;
  const isLearnerView = canSubmitEvaluation && !canManageEvaluations;
  const [manualOpen, setManualOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [digitalizeOpen, setDigitalizeOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null);
  const [contentEditingEval, setContentEditingEval] = useState<Evaluacion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Evaluacion | null>(null);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!canCreateEvaluation || searchParams.get('digitalizar') !== '1') return;
    setDigitalizeOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('digitalizar');
    setSearchParams(nextParams, { replace: true });
  }, [canCreateEvaluation, searchParams, setSearchParams]);

  const evaluationsQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
    refetchInterval: isLearnerView ? 10_000 : false,
    refetchOnWindowFocus: true,
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ['evaluaciones', materia.id],
    });

  const update = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: EvaluacionUpdate;
    }) => updateEvaluacion(id, payload),
    onSuccess: () => {
      refresh();
      toast.success('Evaluación actualizada');
      closeManual();
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const publish = useMutation({
    mutationFn: (id: string) => publicarEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Evaluación publicada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const activateReception = useMutation({
    mutationFn: (id: string) => activarRecepcionEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Entregas abiertas para los estudiantes');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const pauseReception = useMutation({
    mutationFn: (id: string) => pausarRecepcionEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Entregas cerradas. Puedes volver a abrirlas cuando quieras.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const removeEvaluation = useMutation({
    mutationFn: (id: string) => deleteEvaluacion(id),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      toast.success('Evaluación eliminada de la materia');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  function openEdit(evaluation: Evaluacion) {
    setEditingEval(evaluation);
    setForm({
      nombre: evaluation.nombre,
      descripcion: evaluation.descripcion ?? '',
      nota_maxima: Number(evaluation.nota_maxima),
      modalidad: evaluation.modalidad ?? 'fisica',
      fecha_limite_entrega: evaluation.fecha_limite_entrega ? (() => { const date = new Date(evaluation.fecha_limite_entrega); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); })() : '',
    });
    setManualOpen(true);
  }

  function closeManual() {
    setManualOpen(false);
    setEditingEval(null);
    setForm(emptyForm());
  }

  function handleSubmit() {
    if (!editingEval) return;
    update.mutate({
      id: editingEval.id,
      payload: {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        nota_maxima: form.nota_maxima,
        modalidad: form.modalidad,
        fecha_limite_entrega: form.fecha_limite_entrega ? new Date(form.fecha_limite_entrega).toISOString() : null,
      },
    });
  }

  const evaluations = evaluationsQuery.data;
  const closedCount = useMemo(
    () =>
      evaluations?.filter((evaluation) => evaluation.estado === 'cerrada')
        .length ?? 0,
    [evaluations],
  );

  return (
    <div className="space-y-5">
      {canCreateEvaluation && (
        <Card className="border-brand-200 bg-brand-50/50 p-5 dark:border-brand-500/25 dark:bg-brand-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-200">
                  Preparar una evaluación
                </p>
                <h2 className="mt-1 font-display text-lg font-bold">
                  ¿Cómo quieres empezar?
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
                  Crea una evaluación guiada o convierte directamente una prueba
                  que ya tengas en foto o PDF.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setWizardOpen(true)} size="lg">
                <Sparkles className="h-5 w-5" />
                Crear paso a paso
              </Button>
              <Button variant="outline" onClick={() => setDigitalizeOpen(true)} size="lg">
                <Scan className="h-5 w-5" />
                Digitalizar de foto/PDF
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-brand-700 dark:text-brand-200 lg:text-right">
            Recomendado: crear paso a paso. La IA nunca publica sin tu revisión.
          </p>
        </Card>
      )}

      {canManageEvaluations && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted">
            {evaluations?.length ?? 0} evaluaciones · {closedCount} cerradas
          </p>
        </div>
      )}

      {evaluationsQuery.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : evaluationsQuery.isError ? (
        <QueryError
          error={evaluationsQuery.error}
          onRetry={() => void evaluationsQuery.refetch()}
        />
      ) : evaluations && evaluations.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {evaluations.map((evaluation) => {
            const modality = evaluation.modalidad ?? 'fisica';
            const isDraft = evaluation.estado === 'borrador';
            const isClosed = evaluation.estado === 'cerrada';
            const isDeliveryState = ['publicada', 'en_calificacion', 'pendiente_revision'].includes(evaluation.estado);
            const receptionEnabled = evaluation.recepcion_habilitada ?? isDeliveryState;
            const canOpenOnline = (isDeliveryState || isClosed)
              && (Boolean(evaluation.entrega_realizada) || modality === 'online' || modality === 'mixta' || receptionEnabled);
            const photoRoute = `${routes.materiaCalificar(materia.id)}?evaluacion=${evaluation.id}`;
            const reviewRoute = routes.calificacionesEvaluacion(evaluation.id);

            return (
              <Card key={evaluation.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          evaluation.estado === 'cerrada'
                            ? 'neutral'
                            : 'success'
                        }
                      >
                        {evaluation.estado}
                      </Badge>
                      <Badge tone="brand">
                        {MODALITY_LABELS[modality]}
                      </Badge>
                      {isLearnerView && (
                        <Badge tone={getStudentEvaluationStatus(evaluation).tone}>
                          {getStudentEvaluationStatus(evaluation).label}
                        </Badge>
                      )}
                      {canPublishEvaluation && !isDraft && (
                        <Badge tone={receptionEnabled ? 'success' : 'warning'}>
                          {receptionEnabled ? 'Entregas abiertas' : 'Entregas cerradas'}
                        </Badge>
                      )}
                      <span className="text-xs text-muted">
                        Nota máxima: {Number(evaluation.nota_maxima)}
                      </span>
                      {evaluation.fecha_limite_entrega && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          <Clock className="h-3 w-3" /> Vence {new Date(evaluation.fecha_limite_entrega).toLocaleString()}
                        </span>
                      )}
                      {evaluation.tiempo_limite_minutos != null && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Clock className="h-3 w-3" />{' '}
                          {evaluation.tiempo_limite_minutos} min
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-semibold">{evaluation.nombre}</p>
                    {evaluation.descripcion && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted">
                        {evaluation.descripcion}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      {evaluation.preguntas?.length ?? 0} pregunta
                      {(evaluation.preguntas?.length ?? 0) === 1 ? '' : 's'}
                      {isLearnerView && (evaluation.intentos_realizados ?? 0) > 0
                        ? ` · Intento ${evaluation.intentos_realizados}`
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canManageEvaluations ? (
                    <>
                      {canUpdateEvaluation && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(evaluation)}>
                            <Pencil className="h-4 w-4" /> Editar datos
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => { setContentEditingEval(evaluation); setWizardOpen(true); }}>
                            <ClipboardCheck className="h-4 w-4" /> Editar preguntas
                          </Button>
                        </>
                      )}

                      {canPublishEvaluation && isDraft && (
                        <Button
                          size="sm"
                          loading={publish.isPending}
                          onClick={() => publish.mutate(evaluation.id)}
                        >
                          <Send className="h-4 w-4" /> Publicar
                        </Button>
                      )}

                      {canPublishEvaluation && !isDraft && (
                        <>
                          {receptionEnabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseReception.mutate(evaluation.id)}
                              loading={pauseReception.isPending}
                            >
                              <Eye className="h-4 w-4" /> Cerrar entregas
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => activateReception.mutate(evaluation.id)}
                              loading={activateReception.isPending}
                            >
                              <PlayCircle className="h-4 w-4" /> Abrir entregas
                            </Button>
                          )}

                        </>
                      )}

                      {canGradeEvaluation && !isDraft && modality !== 'online' && (
                        <Link to={photoRoute}>
                          <Button size="sm" variant="secondary">
                            <ClipboardCheck className="h-4 w-4" /> Calificar foto
                          </Button>
                        </Link>
                      )}

                      {canReviewGrades && !isDraft && (
                        <Link to={reviewRoute}>
                          <Button size="sm" variant={modality === 'online' ? 'secondary' : 'outline'}>
                            <Eye className="h-4 w-4" /> Revisar notas
                          </Button>
                        </Link>
                      )}

                      {canDeleteEvaluation && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-700 dark:text-rose-300"
                          onClick={() => setDeleteTarget(evaluation)}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </Button>
                      )}

                    </>
                  ) : isLearnerView && canOpenOnline ? (
                    <Link to={routes.resolverEvaluacion(evaluation.id)}>
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                        {getStudentEvaluationAction(evaluation)}
                      </Button>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">
                      {isClosed ? 'Actividad cerrada' : 'Entrega en papel'}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : canManageEvaluations ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aún no hay evaluaciones"
          description="Usa las opciones de arriba para crearla paso a paso o digitalizar una foto o PDF."
        />
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin evaluaciones"
          description="Tu docente aún no ha creado evaluaciones para esta materia."
        />
      )}

      {canCreateEvaluation && (
        <DigitalizarEvaluacionModal
          open={digitalizeOpen}
          onClose={() => setDigitalizeOpen(false)}
          materiaId={materia.id}
          onCompleted={() => {
            refresh();
            setDigitalizeOpen(false);
          }}
        />
      )}

      {(canCreateEvaluation || canUpdateEvaluation) && user && (
        <GenerationWizard
          open={wizardOpen}
          onClose={() => { setWizardOpen(false); setContentEditingEval(null); }}
          userId={user.id}
          materias={[materia as Materia]}
          initialMateriaId={materia.id}
          initialEvaluation={contentEditingEval}
          onCompleted={() => {
            refresh();
            toast.success(contentEditingEval ? 'Preguntas actualizadas' : 'Evaluación creada como borrador');
            setWizardOpen(false);
            setContentEditingEval(null);
          }}
        />
      )}

      {canUpdateEvaluation && (
        <Modal
          open={manualOpen}
          onClose={closeManual}
          title="Editar datos de la evaluación"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            className="space-y-5"
          >

            {editingEval && editingEval.estado !== 'borrador' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                <strong>Evaluación asignada.</strong> Los cambios se aplicarán de inmediato. Las entregas y notas existentes no se eliminan.
              </div>
            )}

            <Field label="Nombre de la evaluación" required>
              <Input
                autoFocus
                value={form.nombre}
                onChange={(event) =>
                  setForm({ ...form, nombre: event.target.value })
                }
                placeholder="Ejemplo: Taller de fracciones"
                required
                minLength={2}
              />
            </Field>
            <Field label="Tema o descripción" hint="Opcional">
              <Textarea
                value={form.descripcion}
                onChange={(event) =>
                  setForm({ ...form, descripcion: event.target.value })
                }
                placeholder="¿Qué conocimientos vas a revisar?"
              />
            </Field>

            <Field label="Modalidad" required>
              <Select
                value={form.modalidad}
                onChange={(event) =>
                  setForm({
                    ...form,
                    modalidad: event.target.value as EvaluacionModalidad,
                  })
                }
              >
                <option value="fisica">En papel</option>
                <option value="online">En línea</option>
                <option value="mixta">Mixta</option>
              </Select>
            </Field>

            <Field label="Fecha límite de entrega" hint="Opcional. Después de esta fecha, las ausencias se registran con 0.">
              <Input
                type="datetime-local"
                value={form.fecha_limite_entrega}
                onChange={(event) => setForm({ ...form, fecha_limite_entrega: event.target.value })}
              />
            </Field>

            <Field
              label="Nota máxima"
              hint="La escala habitual de la institución, por ejemplo 5 o 10."
              required
            >
              <Input
                type="number"
                min={1}
                max={100}
                step="0.1"
                value={form.nota_maxima}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nota_maxima: Number(event.target.value) || 5,
                  })
                }
                required
              />
            </Field>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeManual}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={update.isPending}
                disabled={!form.nombre.trim()}
              >
                Guardar cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={canDeleteEvaluation && Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeEvaluation.mutate(deleteTarget.id);
        }}
        title="Eliminar evaluación"
        description={<>Se quitará <strong>{deleteTarget?.nombre}</strong> de la materia y se cerrarán sus entregas. El historial académico se conservará de forma segura.</>}
        confirmLabel="Eliminar"
        cancelLabel="Conservar"
        tone="danger"
        loading={removeEvaluation.isPending}
      />

    </div>
  );
}
