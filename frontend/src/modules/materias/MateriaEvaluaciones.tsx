import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  Clock,
  Eye,
  FileCheck2,
  Lock,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
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
  cerrarEvaluacion,
  createEvaluacion,
  deleteEvaluacion,
  listEvaluaciones,
  pausarRecepcionEvaluacion,
  publicarEvaluacion,
  updateEvaluacion,
  type EvaluacionUpdate,
} from '@/modules/evaluaciones/api';
import { DigitalizarEvaluacionModal } from '@/modules/evaluaciones/components/DigitalizarEvaluacionModal';
import { GenerationWizard } from '@/modules/evaluaciones/components/GenerationWizard';
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
}

const emptyForm = (): EvaluationForm => ({
  nombre: '',
  descripcion: '',
  nota_maxima: 5,
  modalidad: 'fisica',
});

export function MateriaEvaluaciones() {
  const { materia, canManageMateria } = useMateriaContext();
  const user = useAuth((state) => state.user);
  const [manualOpen, setManualOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [digitalizeOpen, setDigitalizeOpen] = useState(false);
  const [editingEval, setEditingEval] = useState<Evaluacion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Evaluacion | null>(null);
  const [form, setForm] = useState<EvaluationForm>(emptyForm);

  const evaluationsQuery = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ['evaluaciones', materia.id],
    });

  const create = useMutation({
    mutationFn: () =>
      createEvaluacion({
        materia_id: materia.id,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        nota_maxima: form.nota_maxima,
        modalidad: form.modalidad,
        tipo_origen: 'manual',
      }),
    onSuccess: () => {
      refresh();
      toast.success('Evaluación registrada como borrador');
      closeManual();
    },
    onError: (error) => toast.error(toApiError(error).detail),
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

  const closeEvaluation = useMutation({
    mutationFn: (id: string) => cerrarEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Evaluación cerrada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const activateReception = useMutation({
    mutationFn: (id: string) => activarRecepcionEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Recepci?n de entregas activada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const pauseReception = useMutation({
    mutationFn: (id: string) => pausarRecepcionEvaluacion(id),
    onSuccess: () => {
      refresh();
      toast.success('Recepci?n de entregas pausada');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const removeEvaluation = useMutation({
    mutationFn: (id: string) => deleteEvaluacion(id),
    onSuccess: () => {
      refresh();
      setDeleteTarget(null);
      toast.success('Evaluaci?n eliminada');
    },
    onError: (error) => {
      const apiError = toApiError(error);
      toast.error(
        apiError.status === 409
          ? 'No se puede eliminar porque ya tiene entregas o calificaciones.'
          : apiError.detail,
      );
    },
  });

  function openManualCreate() {
    setEditingEval(null);
    setForm(emptyForm());
    setManualOpen(true);
  }

  function openEdit(evaluation: Evaluacion) {
    setEditingEval(evaluation);
    setForm({
      nombre: evaluation.nombre,
      descripcion: evaluation.descripcion ?? '',
      nota_maxima: Number(evaluation.nota_maxima),
      modalidad: evaluation.modalidad ?? 'fisica',
    });
    setManualOpen(true);
  }

  function closeManual() {
    setManualOpen(false);
    setEditingEval(null);
    setForm(emptyForm());
  }

  function handleSubmit() {
    if (editingEval) {
      update.mutate({
        id: editingEval.id,
        payload: {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || undefined,
          nota_maxima: form.nota_maxima,
          modalidad: form.modalidad,
        },
      });
      return;
    }
    create.mutate();
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
      {canManageMateria && (
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
                  El asistente paso a paso crea preguntas alineadas con los DBA.
                  Si ya tienes una prueba impresa, solo regístrala para
                  calificarla por foto.
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
              <Button variant="outline" onClick={openManualCreate} size="lg">
                <FileCheck2 className="h-5 w-5" />
                Registrar prueba existente
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs font-semibold text-brand-700 dark:text-brand-200 lg:text-right">
            Recomendado: crear paso a paso. La IA nunca publica sin tu revisión.
          </p>
        </Card>
      )}

      {canManageMateria && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {evaluations?.length ?? 0} evaluaciones · {closedCount} cerradas
          </p>
          <Button variant="ghost" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva evaluación
          </Button>
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
              && (modality === 'online' || modality === 'mixta' || receptionEnabled);
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
                      {!isDraft && !isClosed && (
                        <Badge tone={receptionEnabled ? 'success' : 'warning'}>
                          {receptionEnabled ? 'Recepci?n activa' : 'Recepci?n pausada'}
                        </Badge>
                      )}
                      <span className="text-xs text-muted">
                        Nota máxima: {Number(evaluation.nota_maxima)}
                      </span>
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
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canManageMateria ? (
                    <>
                      {isDraft && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEdit(evaluation)}>
                            <Pencil className="h-4 w-4" /> Editar datos
                          </Button>
                          <Button
                            size="sm"
                            loading={publish.isPending}
                            onClick={() => publish.mutate(evaluation.id)}
                          >
                            <Send className="h-4 w-4" /> Publicar
                          </Button>
                        </>
                      )}

                      {isDeliveryState && (
                        <>
                          {receptionEnabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => pauseReception.mutate(evaluation.id)}
                              loading={pauseReception.isPending}
                            >
                              <PauseCircle className="h-4 w-4" /> Pausar entregas
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => activateReception.mutate(evaluation.id)}
                              loading={activateReception.isPending}
                            >
                              <PlayCircle className="h-4 w-4" /> Activar entregas
                            </Button>
                          )}

                          {modality !== 'online' && (
                            <Link to={photoRoute}>
                              <Button size="sm" variant="secondary">
                                <ClipboardCheck className="h-4 w-4" /> Calificar foto
                              </Button>
                            </Link>
                          )}
                        </>
                      )}

                      {!isDraft && (
                        <Link to={reviewRoute}>
                          <Button size="sm" variant={modality === 'online' ? 'secondary' : 'outline'}>
                            <Eye className="h-4 w-4" /> Revisar notas
                          </Button>
                        </Link>
                      )}

                      {isDeliveryState && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => closeEvaluation.mutate(evaluation.id)}
                        loading={closeEvaluation.isPending}
                      >
                        <Lock className="h-4 w-4" /> Cerrar
                      </Button>
                      )}

                      {(isDraft || isClosed) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-700 dark:text-rose-300"
                          onClick={() => setDeleteTarget(evaluation)}
                        >
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </Button>
                      )}

                      {isClosed && (
                        <span className="flex min-h-9 items-center gap-1 text-xs text-muted">
                          <Lock className="h-3 w-3" /> Cierre final
                        </span>
                      )}
                    </>
                  ) : canOpenOnline ? (
                    <Link to={routes.resolverEvaluacion(evaluation.id)}>
                      <Button size="sm" variant="secondary">
                        <Eye className="h-4 w-4" />
                        {receptionEnabled && !isClosed ? 'Resolver' : 'Ver evaluaci?n'}
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
      ) : canManageMateria ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aún no hay evaluaciones"
          description="Empieza con el asistente guiado o registra una prueba que ya tengas en papel."
          action={
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={() => setWizardOpen(true)}>
                <Sparkles className="h-4 w-4" /> Crear paso a paso
              </Button>
              <Button variant="outline" onClick={openManualCreate}>
                <FileCheck2 className="h-4 w-4" /> Registrar prueba existente
              </Button>
            </div>
          }
        />
      ) : (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin evaluaciones"
          description="Tu docente aún no ha creado evaluaciones para esta materia."
        />
      )}

      {canManageMateria && (
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

      {canManageMateria && user && (
        <GenerationWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          userId={user.id}
          materias={[materia as Materia]}
          initialMateriaId={materia.id}
          onCompleted={() => {
            refresh();
            toast.success('Evaluación creada como borrador');
            setWizardOpen(false);
          }}
        />
      )}

      {canManageMateria && (
        <Modal
          open={manualOpen}
          onClose={closeManual}
          title={
            editingEval
              ? 'Editar datos de la evaluación'
              : 'Registrar una prueba existente'
          }
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit();
            }}
            className="space-y-5"
          >
            {!editingEval && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                Usa esta opción cuando ya tienes la evaluación preparada. La
                registraremos como <strong>evaluación en papel</strong> para que
                luego puedas calificar las fotos.
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

            {editingEval ? (
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
            ) : null}

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
                loading={create.isPending || update.isPending}
                disabled={!form.nombre.trim()}
              >
                {editingEval ? 'Guardar cambios' : 'Registrar evaluación'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) removeEvaluation.mutate(deleteTarget.id);
        }}
        title="Eliminar evaluaci?n"
        description={<>Se eliminar? <strong>{deleteTarget?.nombre}</strong>. Solo es posible si no tiene entregas ni calificaciones.</>}
        confirmLabel="Eliminar"
        cancelLabel="Conservar"
        tone="danger"
        loading={removeEvaluation.isPending}
      />

    </div>
  );
}
