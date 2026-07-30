import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Eye,
  ImageUp,
  RotateCcw,
  ScanText,
  Smartphone,
  Trash2,
  TriangleAlert,
  UploadCloud,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  RichContent,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import {
  ajustarNota,
  calificarFoto,
  confirmarNota,
  listCalificaciones,
  reintentarCalificacionFoto,
} from '@/modules/calificaciones/api';
import { toApiError } from '@/lib/api';
import {
  getTechnicalFailureReason,
  isTechnicalGradingFailure,
} from '@/modules/calificaciones/gradingFailure';
import { confidenceLabel } from '@/lib/utils';
import type { Calificacion } from '@/types/api';
import { useMateriaContext } from './MateriaContext';
import { GradingProgress } from './GradingProgress';
import {
  currentGradingStep,
  hasTeacherDecision,
  nextStudentNeedingAttention,
  summarizeGradingStudents,
  validateAdjustedScore,
} from './gradingFlowModel';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

type EstudianteStatus = {
  id: string;
  nombre: string;
  email: string;
  calificacion?: Calificacion;
};

type PendingSelection =
  | { kind: 'evaluation'; id: string }
  | { kind: 'student'; id: string }
  | null;

function latestGradeForStudent(
  grades: Calificacion[] | undefined,
  studentId: string,
): Calificacion | undefined {
  return grades
    ?.filter((grade) => grade.estudiante_id === studentId)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || 'Estudiante';
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MateriaCalificar() {
  const { materia, canManageMateria } = useMateriaContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const evaluacionIdParam = searchParams.get('evaluacion') || '';
  const estudianteIdParam = searchParams.get('estudiante') || '';

  const [evaluacionId, setEvaluacionId] = useState(evaluacionIdParam);
  const [estudianteId, setEstudianteId] = useState(estudianteIdParam);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Calificacion | null>(null);
  const [editingNota, setEditingNota] = useState(false);
  const [ajusteNota, setAjusteNota] = useState('');
  const [ajusteFeedback, setAjusteFeedback] = useState('');
  const [ajusteError, setAjusteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingSuggestion, setConfirmingSuggestion] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const evidenceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (evaluacionIdParam && evaluacionIdParam !== evaluacionId) {
      setEvaluacionId(evaluacionIdParam);
    }
  }, [evaluacionIdParam, evaluacionId]);

  const { data: evaluaciones, isLoading: loadingEval } = useQuery({
    queryKey: ['evaluaciones', materia.id],
    queryFn: () => listEvaluaciones(materia.id),
    enabled: Boolean(materia.id),
  });

  const evalSeleccionada = useMemo(
    () => evaluaciones?.find((evaluation) => evaluation.id === evaluacionId),
    [evaluacionId, evaluaciones],
  );
  const evaluationClosed = evalSeleccionada?.estado === 'cerrada';
  const maximumScore = Number(evalSeleccionada?.nota_maxima ?? 5);

  const estudiantesList = useMemo(() => {
    if (
      'estudiantes' in materia &&
      Array.isArray((materia as { estudiantes: unknown }).estudiantes)
    ) {
      return (
        materia as {
          estudiantes: Array<{ id: string; nombre: string; email: string }>;
        }
      ).estudiantes;
    }
    return [];
  }, [materia]);

  const calificacionesQuery = useQuery({
    queryKey: ['calificaciones', evaluacionId],
    queryFn: () => listCalificaciones(evaluacionId),
    enabled: Boolean(evaluacionId) && canManageMateria,
  });

  const estudiantesConEstado = useMemo<EstudianteStatus[]>(
    () =>
      estudiantesList.map((student) => ({
        ...student,
        calificacion: latestGradeForStudent(
          calificacionesQuery.data,
          student.id,
        ),
      })),
    [estudiantesList, calificacionesQuery.data],
  );

  const estudiantesConResultadoActual = useMemo(
    () =>
      estudiantesConEstado.map((student) =>
        student.id === estudianteId && resultado
          ? { ...student, calificacion: resultado }
          : student,
      ),
    [estudianteId, estudiantesConEstado, resultado],
  );

  const summary = useMemo(
    () => summarizeGradingStudents(estudiantesConResultadoActual),
    [estudiantesConResultadoActual],
  );
  const currentStep = currentGradingStep({
    evaluationId: evaluacionId,
    studentId: estudianteId,
    result: resultado,
  });
  const decisionSaved = hasTeacherDecision(resultado ?? undefined);
  const nextStudentId = decisionSaved
    ? nextStudentNeedingAttention(
        estudiantesConResultadoActual,
        estudianteId,
      )
    : null;

  const pendientes = useMemo(
    () => estudiantesConEstado.filter((student) => !student.calificacion),
    [estudiantesConEstado],
  );

  useEffect(() => {
    if (!evaluacionId || estudianteId || estudiantesList.length === 0) return;
    setEstudianteId(pendientes[0]?.id ?? estudiantesList[0].id);
  }, [estudianteId, estudiantesList, evaluacionId, pendientes]);

  useEffect(() => {
    setFoto(null);
    setResultado(null);
    setEditingNota(false);
    setAjusteNota('');
    setAjusteFeedback('');
    setAjusteError(null);
    setError(null);
  }, [estudianteId, evaluacionId]);

  useEffect(() => {
    if (!estudianteId || foto) return;
    setResultado(
      latestGradeForStudent(calificacionesQuery.data, estudianteId) ?? null,
    );
  }, [calificacionesQuery.data, estudianteId, foto]);

  useEffect(() => {
    if (!foto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const hasUnsavedWork = Boolean((foto && !resultado) || editingNota);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsavedWork && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!hasUnsavedWork || typeof window === 'undefined') return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedWork]);

  const estudianteActual = estudiantesConEstado.find(
    (student) => student.id === estudianteId,
  );
  const estudianteIndex = estudiantesConEstado.findIndex(
    (student) => student.id === estudianteId,
  );

  const applyEvaluationSelection = useCallback(
    (id: string) => {
      setEvaluacionId(id);
      setEstudianteId('');
      setSearchParams(id ? { evaluacion: id } : {});
      setResultado(null);
      setFoto(null);
      setError(null);
    },
    [setSearchParams],
  );

  const requestEvaluationSelection = (id: string) => {
    if (id === evaluacionId) return;
    if (hasUnsavedWork) {
      setPendingSelection({ kind: 'evaluation', id });
      return;
    }
    applyEvaluationSelection(id);
  };

  const applyStudentSelection = useCallback((id: string) => {
    setEstudianteId(id);
  }, []);

  const requestStudentSelection = (id: string) => {
    if (!id || id === estudianteId) return;
    if (hasUnsavedWork) {
      setPendingSelection({ kind: 'student', id });
      return;
    }
    applyStudentSelection(id);
  };

  const confirmPendingSelection = () => {
    if (!pendingSelection) return;
    if (pendingSelection.kind === 'evaluation') {
      applyEvaluationSelection(pendingSelection.id);
    } else {
      applyStudentSelection(pendingSelection.id);
    }
    setPendingSelection(null);
  };

  const navigateStudent = (direction: -1 | 1) => {
    const nextIndex = estudianteIndex + direction;
    if (nextIndex >= 0 && nextIndex < estudiantesConEstado.length) {
      requestStudentSelection(estudiantesConEstado[nextIndex].id);
    }
  };

  const handleFile = useCallback((file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Selecciona una imagen JPG, PNG o WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`La imagen supera el límite de ${MAX_MB} MB.`);
      return;
    }
    setResultado(null);
    setEditingNota(false);
    setFoto(file);
  }, []);

  const restoreExistingGrade = () => {
    setFoto(null);
    setResultado(
      latestGradeForStudent(calificacionesQuery.data, estudianteId) ?? null,
    );
    setError(null);
  };

  const gradeMutation = useMutation({
    mutationFn: () => {
      if (!evaluacionId || !estudianteId || !foto) {
        throw new Error('Selecciona evaluación, estudiante y fotografía.');
      }
      return calificarFoto(evaluacionId, estudianteId, foto);
    },
    onSuccess: (data) => {
      setResultado(data);
      setError(null);
      void calificacionesQuery.refetch();
      if (isTechnicalGradingFailure(data)) {
        toast.error('La evidencia quedó guardada, pero la IA no produjo una nota.');
      } else {
        toast.success('Foto analizada. Ahora revisa la sugerencia.');
      }
    },
    onError: (mutationError) => {
      const message =
        mutationError instanceof Error && !('response' in mutationError)
          ? mutationError.message
          : toApiError(mutationError).detail;
      setError(message);
      toast.error(message);
    },
  });
  const retryMutation = useMutation({
    mutationFn: () => {
      if (!resultado) {
        throw new Error('No hay una calificación para reintentar.');
      }
      return reintentarCalificacionFoto(resultado.id);
    },
    onSuccess: (data) => {
      setResultado(data);
      setError(null);
      void calificacionesQuery.refetch();
      if (isTechnicalGradingFailure(data)) {
        toast.error('El reintento terminó sin una nota. Puedes calificar manualmente.');
      } else {
        toast.success('Reintento completado. Revisa la nueva sugerencia.');
      }
    },
    onError: (mutationError) =>
      toast.error(toApiError(mutationError).detail),
  });


  const confirmMutation = useMutation({
    mutationFn: (score: number) => {
      if (!resultado) throw new Error('No hay resultado para confirmar.');
      return confirmarNota(resultado.id, score);
    },
    onSuccess: (data) => {
      setResultado(data);
      setConfirmingSuggestion(false);
      setEditingNota(false);
      void calificacionesQuery.refetch();
      toast.success('Decisión docente guardada.');
    },
    onError: (mutationError) =>
      toast.error(toApiError(mutationError).detail),
  });

  const adjustMutation = useMutation({
    mutationFn: ({
      score,
      feedback,
    }: {
      score: number;
      feedback?: string;
    }) => {
      if (!resultado) throw new Error('No hay resultado para ajustar.');
      return ajustarNota(resultado.id, score, feedback);
    },
    onSuccess: (data) => {
      setResultado(data);
      setEditingNota(false);
      setAjusteError(null);
      void calificacionesQuery.refetch();
      toast.success('Decisión docente ajustada y guardada.');
    },
    onError: (mutationError) =>
      toast.error(toApiError(mutationError).detail),
  });

  const openAdjustment = () => {
    if (!resultado) return;
    setAjusteNota(
      String(resultado.nota_confirmada ?? resultado.nota_sugerida ?? ''),
    );
    setAjusteFeedback('');
    setAjusteError(null);
    setEditingNota(true);
  };

  const submitAdjustment = () => {
    const validation = validateAdjustedScore(ajusteNota, maximumScore);
    if (validation.error || validation.value == null) {
      setAjusteError(validation.error);
      return;
    }
    setAjusteError(null);
    adjustMutation.mutate({
      score: validation.value,
      feedback: ajusteFeedback.trim() || undefined,
    });
  };

  const getStudentStatusIcon = (student: EstudianteStatus) => {
    if (!student.calificacion) {
      return <span className="text-muted/50">—</span>;
    }
    if (hasTeacherDecision(student.calificacion)) {
      return (
        <CheckCircle2
          className="h-5 w-5 text-emerald-600"
          aria-label="Decisión guardada"
        />
      );
    }
    return (
      <span className="text-xs font-extrabold text-amber-700">
        {student.calificacion.nota_sugerida != null
          ? Number(student.calificacion.nota_sugerida).toFixed(1)
          : '?'}
      </span>
    );
  };

  const isSubmitting =
    gradeMutation.isPending ||
    retryMutation.isPending ||
    confirmMutation.isPending ||
    adjustMutation.isPending;

  const confirmedScore =
    resultado?.nota_confirmada ?? resultado?.nota_sugerida ?? null;

  const technicalFailure = isTechnicalGradingFailure(resultado);
  const technicalFailureReason = getTechnicalFailureReason(resultado);

  return (
    <div className="space-y-5">
      {!canManageMateria ? (
        <Card className="p-5 text-center text-muted">
          <Users className="mx-auto mb-2 h-8 w-8" />
          <p>
            Tu docente usará esta sección para calificar tus evaluaciones
            escritas.
          </p>
        </Card>
      ) : (
        <>
          <Card className="border-brand-200 bg-brand-50/60 p-5 dark:border-brand-500/30 dark:bg-brand-500/10">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
                <Camera className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h1 className="font-display text-xl font-extrabold">
                  Calificar una evaluación en papel
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
                  Sigue los cuatro pasos. La IA analiza la fotografía y sugiere
                  una nota; tú siempre revisas y tomas la decisión final.
                </p>
              </div>
            </div>
          </Card>

          <GradingProgress currentStep={currentStep} />

          <Card className="p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-end">
              <Field
                label="1. Selecciona la evaluación"
                hint="Una evaluación cerrada no admite nuevas fotos, pero sí permite revisar decisiones existentes."
              >
                {loadingEval ? (
                  <Skeleton className="h-11" />
                ) : (
                  <Select
                    value={evaluacionId}
                    onChange={(event) =>
                      requestEvaluationSelection(event.target.value)
                    }
                    aria-label="Evaluación para calificar"
                  >
                    <option value="">Elige una evaluación</option>
                    {evaluaciones?.map((evaluation) => (
                      <option key={evaluation.id} value={evaluation.id}>
                        {evaluation.nombre}
                        {evaluation.estado === 'cerrada' ? ' (cerrada)' : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              {evaluacionId ? (
                <div
                  className="grid grid-cols-3 gap-2"
                  aria-live="polite"
                  aria-label="Resumen de calificación"
                >
                  <div className="rounded-xl bg-surface-2 p-3 text-center">
                    <strong className="block text-xl">{summary.pendientes}</strong>
                    <span className="text-xs text-muted">Sin foto</span>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3 text-center dark:bg-amber-500/10">
                    <strong className="block text-xl text-amber-800 dark:text-amber-200">
                      {summary.porRevisar}
                    </strong>
                    <span className="text-xs text-muted">Por revisar</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-500/10">
                    <strong className="block text-xl text-emerald-800 dark:text-emerald-200">
                      {summary.decididas}
                    </strong>
                    <span className="text-xs text-muted">Decididas</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {evaluationClosed ? (
            <div
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
              role="status"
            >
              <strong>Evaluación cerrada.</strong> Ya no puedes enviar nuevas
              fotografías. Todavía puedes revisar, confirmar o corregir las
              calificaciones existentes.
            </div>
          ) : null}

          {!evaluacionId ? (
            <EmptyState
              icon={Camera}
              title="Comienza por la evaluación"
              description="Elige arriba la evaluación en papel que vas a calificar."
            />
          ) : estudiantesList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay estudiantes"
              description="Esta materia todavía no tiene estudiantes matriculados."
            />
          ) : (
            <>
              <Card className="p-5">
                <div className="mb-4">
                  <h2 className="font-display text-lg font-bold">
                    2. Selecciona el estudiante
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    La marca verde indica que ya guardaste tu decisión.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {estudiantesConEstado.map((student) => {
                    const selected = student.id === estudianteId;
                    const decided = hasTeacherDecision(student.calificacion);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => requestStudentSelection(student.id)}
                        aria-pressed={selected}
                        aria-label={`${student.nombre}. ${
                          decided
                            ? 'Decisión guardada'
                            : student.calificacion
                              ? 'Sugerencia pendiente de revisión'
                              : 'Sin fotografía'
                        }`}
                        className={`flex min-h-12 min-w-[150px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-ring ${
                          selected
                            ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-100'
                            : decided
                              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                              : 'border-border hover:border-brand-300 hover:bg-surface-2'
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs font-extrabold">
                          {initials(student.nombre)}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {firstName(student.nombre)}
                        </span>
                        <span className="shrink-0">
                          {getStudentStatusIcon(student)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                <Card ref={evidenceRef} className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-bold">
                        3. Fotografía de la respuesta
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Estudiante: <strong>{estudianteActual?.nombre}</strong>
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigateStudent(-1)}
                        disabled={estudianteIndex <= 0 || isSubmitting}
                        aria-label="Estudiante anterior"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigateStudent(1)}
                        disabled={
                          estudianteIndex >= estudiantesConEstado.length - 1 ||
                          isSubmitting
                        }
                        aria-label="Estudiante siguiente"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  {!resultado && !foto ? (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm dark:border-sky-500/30 dark:bg-sky-500/10">
                      <p className="font-bold">Antes de tomar la foto:</p>
                      <ul className="mt-2 space-y-1 text-muted">
                        <li>• Incluye la hoja completa y enfócala bien.</li>
                        <li>• Evita sombras, reflejos y dedos sobre la respuesta.</li>
                        <li>• Revisa que corresponda al estudiante seleccionado.</li>
                      </ul>
                    </div>
                  ) : null}

                  <div className="overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface-2/50">
                    {!foto && !resultado ? (
                      <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
                        <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand-500/10 text-brand-700">
                          <FileImage className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <p className="mt-3 font-bold">
                          Agrega la evidencia de {firstName(estudianteActual?.nombre ?? '')}
                        </p>
                        <p className="mt-1 max-w-md text-sm text-muted">
                          Puedes tomar la foto ahora o elegir una que ya guardaste.
                        </p>
                        {!evaluationClosed ? (
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                            >
                              <Smartphone className="h-5 w-5" aria-hidden="true" />
                              Tomar foto
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <UploadCloud className="h-5 w-5" aria-hidden="true" />
                              Elegir archivo
                            </Button>
                          </div>
                        ) : null}
                        <p className="mt-3 text-xs text-muted">
                          JPG, PNG o WebP · máximo {MAX_MB} MB
                        </p>
                      </div>
                    ) : foto ? (
                      <div>
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={`Vista previa de la respuesta de ${estudianteActual?.nombre ?? 'el estudiante'}`}
                            className="max-h-96 w-full bg-surface-2 object-contain"
                          />
                        ) : null}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <ImageUp
                              className="h-5 w-5 shrink-0 text-brand-600"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {foto.name}
                              </p>
                              <p className="text-xs text-muted">
                                {(foto.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          {!evaluationClosed ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting}
                              >
                                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                                Reemplazar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={restoreExistingGrade}
                                disabled={isSubmitting}
                                aria-label="Quitar fotografía"
                              >
                                <Trash2 className="h-5 w-5" aria-hidden="true" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="flex min-h-32 items-center gap-3 p-5">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                        </span>
                        <div>
                          <p className="font-bold">Evidencia analizada</p>
                          <p className="mt-1 text-sm text-muted">
                            La fotografía ya fue procesada. Revisa el resultado
                            en el paso 4.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      handleFile(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                    disabled={isSubmitting || evaluationClosed}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                      handleFile(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                    disabled={isSubmitting || evaluationClosed}
                  />

                  {error ? (
                    <div
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                      role="alert"
                    >
                      <span>{error}</span>
                      {foto && !evaluationClosed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => gradeMutation.mutate()}
                          disabled={isSubmitting}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Reintentar
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {gradeMutation.isPending ? (
                    <div
                      className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200"
                      role="status"
                    >
                      <ScanText
                        className="mt-0.5 h-5 w-5 shrink-0 animate-pulse"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold">Analizando la evidencia</p>
                        <p className="mt-1 opacity-80">
                          La IA compara la respuesta con los criterios. Esto puede
                          tomar unos segundos.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {foto &&
                  !resultado &&
                  !gradeMutation.isPending &&
                  !evaluationClosed ? (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => gradeMutation.mutate()}
                        loading={gradeMutation.isPending}
                        loadingLabel="Analizando fotografía…"
                      >
                        <ScanText className="h-5 w-5" aria-hidden="true" />
                        Analizar y sugerir nota
                      </Button>
                    </div>
                  ) : null}
                </Card>

                <Card className="space-y-4 p-5">
                  <div>
                    <h2 className="font-display text-lg font-bold">
                      4. Revisa y decide
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Nada se vuelve decisión docente hasta que lo confirmes o
                      ajustes.
                    </p>
                  </div>

                  {!resultado ? (
                    <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
                      {foto
                        ? 'La fotografía está lista. Pulsa “Analizar y sugerir nota”.'
                        : 'Primero agrega una fotografía de la respuesta.'}
                    </div>
                  ) : (
                    <>
                      {technicalFailure ? (
                        <div
                          className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100"
                          role="alert"
                        >
                          <TriangleAlert
                            className="mt-0.5 h-6 w-6 shrink-0"
                            aria-hidden="true"
                          />
                          <div>
                            <h3 className="font-display text-lg font-extrabold">
                              No fue posible generar una nota
                            </h3>
                            <p className="mt-1 text-sm leading-6">
                              La evidencia quedó guardada, pero el procesamiento automático no pudo completarse.
                            </p>
                            <p className="mt-2 text-sm font-semibold">{technicalFailureReason}</p>
                          </div>
                        </div>
                      ) : null}
                      {!technicalFailure ? (
                        <>
                      <div
                        className={`rounded-xl p-5 text-white shadow-sm ${
                          decisionSaved ? 'bg-emerald-700' : 'bg-brand-700'
                        }`}
                      >
                        <p className="text-sm font-semibold text-white/85">
                          {decisionSaved
                            ? 'Decisión docente guardada'
                            : 'Sugerencia de la IA · aún no es definitiva'}
                        </p>
                        <p className="mt-1 font-display text-4xl font-extrabold">
                          {confirmedScore == null
                            ? 'Sin nota'
                            : Number(confirmedScore).toFixed(1)}
                          {evalSeleccionada?.nota_maxima != null ? (
                            <span className="ml-2 text-lg font-semibold text-white/75">
                              / {Number(evalSeleccionada.nota_maxima).toFixed(1)}
                            </span>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {resultado.confianza != null ? (
                          <Badge tone="neutral">
                            Confianza{' '}
                            {confidenceLabel(Number(resultado.confianza))}
                          </Badge>
                        ) : null}
                        <Badge tone={decisionSaved ? 'success' : 'warning'}>
                          {decisionSaved
                            ? 'Revisada por el docente'
                            : 'Pendiente de tu revisión'}
                        </Badge>
                      </div>
                        </>
                      ) : null}

                      {resultado.feedback ? (
                        <div className="rounded-xl bg-surface-2 p-4 text-sm text-muted">
                          <p className="mb-2 font-bold text-fg">
                            Retroalimentación propuesta
                          </p>
                          <RichContent
                            content={resultado.feedback}
                            variant="feedback"
                          />
                        </div>
                      ) : null}

                      {resultado.resultado_json
                        ? (() => {
                            const details = resultado.resultado_json as Record<
                              string,
                              number | boolean | undefined
                            >;
                            return details.nota_grader_a != null ? (
                              <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
                                <p className="mb-1 text-xs font-bold text-muted">
                                  Verificación de la IA
                                </p>
                                <div className="flex flex-wrap gap-3 text-xs text-muted">
                                  <span>
                                    Análisis A:{' '}
                                    <strong>{details.nota_grader_a}</strong>
                                  </span>
                                  <span>
                                    Análisis B:{' '}
                                    <strong>{details.nota_grader_b}</strong>
                                  </span>
                                  {details.discrepancia ? (
                                    <span className="flex items-center gap-1 text-amber-700">
                                      <TriangleAlert
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                      Requiere revisión cuidadosa
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : null;
                          })()
                        : null}

                      {editingNota ? (
                        <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                          <Field
                            label="Nota decidida por ti"
                            hint={`Debe estar entre 0 y ${maximumScore.toFixed(1)}.`}
                            error={ajusteError ?? undefined}
                            required
                          >
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={maximumScore}
                              step={0.1}
                              value={ajusteNota}
                              onChange={(event) => {
                                setAjusteNota(event.target.value);
                                setAjusteError(null);
                              }}
                              aria-invalid={Boolean(ajusteError)}
                              autoFocus
                            />
                          </Field>
                          <Field
                            label="Motivo o aclaración (opcional)"
                            hint="Úsalo si quieres dejar constancia del ajuste."
                          >
                            <Textarea
                              value={ajusteFeedback}
                              onChange={(event) =>
                                setAjusteFeedback(event.target.value)
                              }
                              placeholder="Ejemplo: reconocí el procedimiento aunque faltó el resultado final."
                            />
                          </Field>
                          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingNota(false);
                                setAjusteError(null);
                              }}
                              disabled={adjustMutation.isPending}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={submitAdjustment}
                              loading={adjustMutation.isPending}
                              loadingLabel="Guardando decisión…"
                            >
                              Guardar mi decisión
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {!editingNota ? (
                        <div className="space-y-2 pt-1">
                          {!decisionSaved ? (
                            <>
                              {resultado.nota_sugerida != null ? (
                                <Button
                                  className="w-full"
                                  onClick={() => setConfirmingSuggestion(true)}
                                  disabled={isSubmitting}
                                >
                                  <CheckCircle2
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                  Usar la nota sugerida{' '}
                                  {Number(resultado.nota_sugerida).toFixed(1)}
                                </Button>
                              ) : null}
                              {technicalFailure ? (
                                <>
                                  <Button
                                    className="w-full"
                                    onClick={() => retryMutation.mutate()}
                                    loading={retryMutation.isPending}
                                    loadingLabel="Reintentando con la evidencia guardada…"
                                  >
                                    <RotateCcw className="h-5 w-5" aria-hidden="true" />
                                    Reintentar procesamiento
                                  </Button>
                                  <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => evidenceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                  >
                                    <Eye className="h-5 w-5" aria-hidden="true" />
                                    Ver evidencia guardada
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={openAdjustment}
                                disabled={isSubmitting}
                              >
                                {technicalFailure ? 'Calificar manualmente' : 'Escribir otra nota'}
                              </Button>
                               <Button
                                 className="w-full"
                                 variant="ghost"
                                 onClick={() => { setResultado(null); setFoto(null); }}
                                 disabled={isSubmitting}
                               >
                                 <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                 {technicalFailure ? 'Cambiar la fotografía' : 'Subir otra imagen'}
                               </Button>
                            </>
                          ) : (
                            <>
                              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                                <CheckCircle2
                                  className="mt-0.5 h-5 w-5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>
                                  Tu decisión quedó guardada. Puedes revisarla
                                  nuevamente si lo necesitas.
                                </span>
                              </div>
                              <Button
                                className="w-full"
                                variant="outline"
                                onClick={openAdjustment}
                                disabled={isSubmitting}
                              >
                                Modificar mi decisión
                              </Button>
                               <Button
                                 className="w-full"
                                 variant="ghost"
                                 onClick={() => { setResultado(null); setFoto(null); }}
                                 disabled={isSubmitting}
                               >
                                 <RotateCcw className="h-4 w-4" aria-hidden="true" />
                                 Subir otra imagen
                               </Button>
                            </>
                          )}
                        </div>
                      ) : null}

                      {decisionSaved && !editingNota ? (
                        <div className="border-t border-border pt-4">
                          {nextStudentId ? (
                            <Button
                              className="w-full"
                              onClick={() =>
                                requestStudentSelection(nextStudentId)
                              }
                            >
                              Calificar al siguiente estudiante
                              <ChevronRight
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </Button>
                          ) : (
                            <div className="rounded-xl bg-emerald-50 p-4 text-center text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                              <CheckCircle2
                                className="mx-auto mb-2 h-6 w-6"
                                aria-hidden="true"
                              />
                              <strong>Grupo completado.</strong>
                              <span className="mt-1 block">
                                Ya tomaste una decisión para todos los
                                estudiantes.
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirmingSuggestion}
        title="¿Guardar esta nota como tu decisión?"
        description={
          resultado?.nota_sugerida != null ? (
            <span>
              Confirmarás{' '}
              <strong>{Number(resultado.nota_sugerida).toFixed(1)}</strong>{' '}
              de <strong>{maximumScore.toFixed(1)}</strong> para{' '}
              <strong>{estudianteActual?.nombre}</strong>.
            </span>
          ) : undefined
        }
        confirmLabel="Sí, guardar mi decisión"
        cancelLabel="Volver a revisar"
        loading={confirmMutation.isPending}
        onClose={() => setConfirmingSuggestion(false)}
        onConfirm={() => {
          if (resultado?.nota_sugerida != null) {
            confirmMutation.mutate(resultado.nota_sugerida);
          }
        }}
      >
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          La IA solo hizo una sugerencia. Al continuar, quedará registrada como
          una decisión revisada por ti.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingSelection != null}
        title="Hay trabajo sin guardar"
        description="Si cambias ahora, perderás la fotografía sin analizar o el ajuste de nota que estabas escribiendo."
        confirmLabel={
          pendingSelection?.kind === 'evaluation'
            ? 'Cambiar de evaluación'
            : 'Cambiar de estudiante'
        }
        cancelLabel="Seguir aquí"
        tone="danger"
        onClose={() => setPendingSelection(null)}
        onConfirm={confirmPendingSelection}
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Hay trabajo sin guardar"
        description="Si sales ahora, perderás la fotografía sin analizar o el ajuste de nota que estabas escribiendo."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir calificando"
        tone="danger"
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
}
