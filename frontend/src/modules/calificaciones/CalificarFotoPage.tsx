import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Camera, CheckCircle2, HelpCircle, LoaderCircle, RotateCcw, ScanText, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Select, Skeleton, GuidedTour, RichContent } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceFiles, evidenceRotations, type EvidencePage } from '@/components/evidence/evidencePayload';
import { PageHeader } from '@/components/layout/PageHeader';
import { useMaterias } from '@/modules/materias/MateriaSelect';
import { useEstudiantes } from '@/modules/materias/hooks';
import { listEvaluaciones } from '@/modules/evaluaciones/api';
import { toApiError } from '@/lib/api';
import { routes } from '@/config/routes';
import { confidenceLabel } from '@/lib/utils';
import { useAuth } from '@/stores/auth';
import { calificarFoto } from './api';
import { fotoTour } from './tourSteps';
import type { Calificacion } from '@/types/api';
import { addPendingGrading } from './gradingJobs';


function gradingErrorMessage(error: unknown) {
  const apiError = toApiError(error);
  if (apiError.status === 403) return 'No tienes permiso para calificar esta evaluación o este estudiante.';
  if (apiError.status === 409) return apiError.detail;
  if (apiError.status === 400 || apiError.status === 422) return 'La imagen o los datos de calificación no son válidos. Revisa la foto e intenta nuevamente.';
  return apiError.detail;
}

export function CalificarFotoPage() {
  const role = useAuth((state) => state.user?.rol ?? 'profesor');
  const [materiaId, setMateriaId] = useState('');
  const [evaluacionId, setEvaluacionId] = useState('');
  const [estudianteId, setEstudianteId] = useState('');
  const [evidencePages, setEvidencePages] = useState<EvidencePage[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultado, setResultado] = useState<Calificacion | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const submittingRef = useRef(false);

  const { data: materias, isLoading: loadingMaterias } = useMaterias();

  useEffect(() => {
    if (!materiaId && materias?.[0]) setMateriaId(materias[0].id);
  }, [materiaId, materias]);

  const { data: evaluaciones, isLoading: loadingEvaluaciones } = useQuery({
    queryKey: ['evaluaciones', materiaId],
    queryFn: () => listEvaluaciones(materiaId),
    enabled: Boolean(materiaId),
  });

  const { estudiantes, isLoading: loadingEstudiantes } = useEstudiantes(materiaId);
  const evaluacionesFoto = useMemo(
    () => evaluaciones?.filter((evaluacion) => evaluacion.modalidad !== 'online') ?? [],
    [evaluaciones],
  );
  const evaluacionSeleccionada = useMemo(
    () => evaluacionesFoto.find((evaluacion) => evaluacion.id === evaluacionId),
    [evaluacionId, evaluacionesFoto],
  );
  const evaluationClosed = evaluacionSeleccionada?.estado === 'cerrada';

  useEffect(() => {
    if (evaluacionesFoto.length > 0 && !evaluacionesFoto.find((evaluacion) => evaluacion.id === evaluacionId)) {
      setEvaluacionId(evaluacionesFoto[0].id);
    }
    if (evaluacionesFoto.length === 0) setEvaluacionId('');
  }, [evaluacionId, evaluacionesFoto]);

  useEffect(() => {
    if (estudiantes.length > 0 && !estudiantes.find((estudiante) => estudiante.id === estudianteId)) {
      setEstudianteId(estudiantes[0].id);
    }
    if (estudiantes.length === 0) setEstudianteId('');
  }, [estudianteId, estudiantes]);

  const calificar = useMutation({
    mutationFn: () => calificarFoto(evaluacionId, estudianteId, evidenceFiles(evidencePages), evidenceRotations(evidencePages)),
    onSuccess: (data) => {
      setResultado(data);
      setSubmissionError(null);
      clearEvidence();
      const jobId = data.resultado_json?.job_id;
      if (typeof jobId === 'string') {
        addPendingGrading({
          jobId,
          evaluacionId: data.evaluacion_id,
          materiaId: data.materia_id,
          estudianteId: data.estudiante_id,
          estudianteNombre: estudiantes.find((item) => item.id === data.estudiante_id)?.nombre ?? 'Estudiante',
        });
      }
      toast.success('Evidencia añadida a la cola. Puedes cargar la siguiente mientras la calificamos.');
    },    onError: (error) => {
      const message = gradingErrorMessage(error);
      setSubmissionError(message);
      toast.error(message);
    },
    onSettled: () => {
      submittingRef.current = false;
      setIsSubmitting(false);
    },
  });

  function clearEvidence() {
    setEvidencePages([]);
    setConfirmOpen(false);
    setSubmissionError(null);
  }

  function submit() {
    if (submittingRef.current || isSubmitting || calificar.isPending) return;
    setSubmissionError(null);

    if (!materiaId) {
      setSubmissionError('Selecciona una materia.');
      return;
    }
    if (!evaluacionId) {
      setSubmissionError('Selecciona una evaluación.');
      return;
    }
    if (evaluationClosed) {
      setSubmissionError('Esta evaluación está cerrada. No se puede enviar una nueva calificación.');
      return;
    }
    if (!estudianteId) {
      setSubmissionError('Selecciona un estudiante.');
      return;
    }
    if (evidencePages.length === 0) {
      setSubmissionError('Selecciona una foto o un PDF.');
      return;
    }

    setConfirmOpen(true);
  }

  function confirmSubmission() {
    if (submittingRef.current || calificar.isPending) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    calificar.mutate();
  }

  const noMaterias = !loadingMaterias && (!materias || materias.length === 0);
  const submissionPending = isSubmitting || calificar.isPending;
  const contextReady = Boolean(materiaId && evaluacionId && estudianteId && !evaluationClosed);
  const gradingQueued = resultado?.resultado_json?.pipeline_status === 'queued'
    || resultado?.resultado_json?.pipeline_status === 'running';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificar por foto"
        eyebrow="Calificación asistida"
        subtitle="Sube fotos o un PDF de la respuesta para recibir una nota sugerida y comentarios claros."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setTourOpen(true)}><HelpCircle className="h-4 w-4" /> ¿Cómo se usa?</Button>
            <Link to={routes.calificacionesWorkspace} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold text-fg transition-all hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Volver</Link>
          </div>
        }
      />

      <GuidedTour steps={fotoTour} open={tourOpen} onClose={() => setTourOpen(false)} tourId="calificacion-foto" role={role} version={1} />

      {noMaterias ? (
        <EmptyState icon={Camera} title="Primero crea una materia" description="Necesitas una materia con evaluaciones y estudiantes matriculados." />
      ) : (
        <>
          <GradingSteps contextReady={contextReady} hasPhoto={evidencePages.length > 0} isAnalyzing={submissionPending} hasResult={Boolean(resultado)} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="space-y-5 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-5 w-5" />
              <div><p className="font-semibold">La IA sugiere. El docente decide.</p><p className="text-sm opacity-80">Revisa la sugerencia y los comentarios antes de confirmar o ajustar la nota final.</p></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Materia" required>
                {loadingMaterias ? <Skeleton className="h-11" /> : (
                  <Select data-tour="foto-materia" value={materiaId} onChange={(event) => { setMateriaId(event.target.value); setResultado(null); setSubmissionError(null); }} disabled={submissionPending}>
                    <option value="">Selecciona una materia</option>
                    {materias?.map((materia) => <option key={materia.id} value={materia.id}>{materia.nombre}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Evaluación" required>
                {loadingEvaluaciones ? <Skeleton className="h-11" /> : (
                  <Select data-tour="foto-evaluacion" value={evaluacionId} onChange={(event) => { setEvaluacionId(event.target.value); setResultado(null); setSubmissionError(null); }} disabled={submissionPending || !materiaId || evaluacionesFoto.length === 0}>
                    {evaluacionesFoto.length === 0 && <option value="">Sin evaluaciones físicas o mixtas</option>}
                    {evaluacionesFoto.map((evaluacion) => <option key={evaluacion.id} value={evaluacion.id}>{evaluacion.nombre}</option>)}
                  </Select>
                )}
              </Field>
            </div>

            {evaluationClosed && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                Esta evaluación está cerrada. El backend rechazará nuevas calificaciones y el envío está bloqueado.
              </div>
            )}

            {evaluacionSeleccionada?.modalidad === 'mixta' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200">
                Esta foto completará la parte online ya guardada del estudiante. La IA generará una sola nota consolidada para revisión docente.
              </div>
            )}

            <Field label="Estudiante" required>
              {loadingEstudiantes ? <Skeleton className="h-11" /> : (
                <Select data-tour="foto-estudiante" value={estudianteId} onChange={(event) => { setEstudianteId(event.target.value); setResultado(null); setSubmissionError(null); }} disabled={submissionPending || !materiaId || estudiantes.length === 0}>
                  {estudiantes.length === 0 && <option value="">Sin estudiantes matriculados</option>}
                  {estudiantes.map((estudiante) => <option key={estudiante.id} value={estudiante.id}>{estudiante.nombre}</option>)}
                </Select>
              )}
            </Field>

            <div data-tour="foto-upload" className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium">Evidencia del estudiante <span className="text-brand-500">*</span></p>
                <span className="text-xs text-muted">Hasta 10 fotos · 10 MB cada una · 40 MB total · o un PDF</span>
              </div>
              <MultiPageEvidencePicker
                pages={evidencePages}
                onChange={(pages) => { setEvidencePages(pages); setResultado(null); setSubmissionError(null); }}
                disabled={submissionPending || evaluationClosed}
                onError={(message) => { setSubmissionError(message); toast.error(message); }}
              />
            </div>

            {submissionError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200" role="alert">
                <span>{submissionError}</span>
                {evidencePages.length > 0 && !evaluationClosed && <Button size="sm" variant="outline" onClick={submit} disabled={submissionPending}><RotateCcw className="h-4 w-4" /> Reintentar</Button>}
              </div>
            )}

            {submissionPending && (
              <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200" role="status">
                <ScanText className="mt-0.5 h-5 w-5 shrink-0 animate-pulse" />
                <div><p className="font-semibold">Interpretando la evidencia</p><p className="mt-0.5 opacity-80">El modelo de visión está leyendo la respuesta y contrastándola con los criterios. No envíes otra vez.</p></div>
              </div>
            )}

            <div className="flex justify-end"><Button data-tour="foto-calificar" onClick={submit} loading={submissionPending} disabled={submissionPending || evaluationClosed}><ScanText className="h-4 w-4" /> Analizar y sugerir nota</Button></div>
          </Card>

          <Card data-tour="foto-resultado" className="space-y-4 p-5">
            <div><h2 className="font-display text-lg font-bold">Resultado</h2><p className="text-sm text-muted">Aquí aparecerán la nota sugerida y la retroalimentación organizada.</p></div>
            {!resultado ? (
              <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Aún no hay resultado.</div>
            ) : (
              <div className="space-y-4">
                {gradingQueued ? (
                  <div className="flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100">
                    <LoaderCircle className="mt-0.5 h-6 w-6 shrink-0 animate-spin" />
                    <div><p className="font-bold">Calificación en cola</p><p className="mt-1 text-sm">Puedes seguir navegando o cargar otra evidencia. Te avisaremos cuando esté lista.</p></div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-brand-600 p-5 text-white shadow-sm"><p className="text-sm text-white/80">Nota sugerida</p><p className="font-display text-4xl font-extrabold">{Number(resultado.nota_sugerida ?? 0).toFixed(1)}{evaluacionSeleccionada?.nota_maxima != null && <span className="ml-2 text-lg font-semibold text-white/70">/ {Number(evaluacionSeleccionada.nota_maxima).toFixed(1)}</span>}</p></div>
                )}
                {!gradingQueued && <div className="flex flex-wrap gap-2"><Badge tone="neutral">Confianza {confidenceLabel(resultado.confianza)}</Badge><Badge tone={resultado.estado === 'sugerida' ? 'warning' : 'brand'}>{resultado.estado}</Badge></div>}
                {resultado.feedback && <div className="rounded-xl bg-surface-2 p-4 text-sm text-muted"><RichContent content={resultado.feedback} variant="feedback" /></div>}
                {!gradingQueued && (
                  <>
                    <div className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm text-muted"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /><span>Confirma o ajusta esta nota desde la lista de calificaciones.</span></div>
                    <Link to={routes.calificacionesWorkspace} className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700">Revisar y confirmar <ArrowRight className="h-4 w-4" /></Link>
                  </>
                )}
                <button type="button" onClick={() => { setResultado(null); clearEvidence(); }} className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-fg transition hover:bg-surface-2">
                  <RotateCcw className="h-4 w-4" /> Cargar otra entrega
                </button>
              </div>
            )}
          </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !submissionPending && setConfirmOpen(false)}
        onConfirm={confirmSubmission}
        loading={submissionPending}
        title={`Calificar ${evidencePages.length === 1 ? '1 hoja' : `${evidencePages.length} hojas`}`}
        description="Las páginas se unirán y se analizarán como una sola entrega del estudiante."
        confirmLabel="Añadir a la cola de calificación"
      >
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          Confirma que el orden de las hojas sea correcto. Podrás seguir navegando y cargar otra entrega mientras esta se procesa.
        </div>
      </ConfirmDialog>
    </div>
  );
}

function GradingSteps({
  contextReady,
  hasPhoto,
  isAnalyzing,
  hasResult,
}: {
  contextReady: boolean;
  hasPhoto: boolean;
  isAnalyzing: boolean;
  hasResult: boolean;
}) {
  const steps = [
    { label: 'Contexto', detail: 'Grupo y estudiante', complete: contextReady, active: !contextReady },
    { label: 'Evidencia', detail: 'Foto legible', complete: hasPhoto, active: contextReady && !hasPhoto },
    { label: 'Análisis', detail: 'Visión y criterios', complete: hasResult, active: isAnalyzing || (hasPhoto && !hasResult) },
    { label: 'Revisión', detail: 'Decisión docente', complete: false, active: hasResult },
  ];
  return (
    <ol className="grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface sm:grid-cols-4" aria-label="Progreso de calificación por foto">
      {steps.map((step, index) => (
        <li key={step.label} className="flex min-h-16 items-center gap-3 border-b border-border px-3 py-3 last:border-b-0 even:border-l sm:border-b-0 sm:border-l sm:first:border-l-0">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step.complete ? 'bg-emerald-600 text-white' : step.active ? 'bg-brand-600 text-white' : 'bg-surface-2 text-muted'}`}>
            {step.complete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
          </span>
          <span className="min-w-0"><span className="block text-xs font-semibold sm:text-sm">{step.label}</span><span className="hidden truncate text-xs text-muted lg:block">{step.detail}</span></span>
        </li>
      ))}
    </ol>
  );
}
