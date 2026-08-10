import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpenCheck, CheckCircle2, ClipboardCheck, Clock3, Download, FileUp, MessageSquareWarning, PauseCircle, Send, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, RichContent, Select, Skeleton, statusTone, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { crearEntregaArchivo, crearEntregaOnline, evaluationPdfUrl, getActividadEstudiante, getEvaluacion, getMiEntrega, getMiSolicitudRevision, solicitarRevisionEvaluacion } from './api';
import { StudentActivityPlayer } from './StudentActivityPlayer';
import type { SolicitudRevisionMotivo } from '@/types/api';

function textFromQuestion(question: Record<string, unknown>, index: number): string {
  for (const key of ['enunciado', 'pregunta', 'texto', 'descripcion', 'nombre']) {
    const value = question[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Pregunta ${index + 1}`;
}

function numberFromQuestion(question: Record<string, unknown>, index: number): number {
  const parsed = Number(question.numero ?? index + 1);
  return Number.isFinite(parsed) ? parsed : index + 1;
}

function optionsFromQuestion(question: Record<string, unknown>): string[] {
  if (Array.isArray(question.opciones)) return question.opciones.map(String).filter(Boolean);
  return question.tipo === 'verdadero_falso' ? ['Verdadero', 'Falso'] : [];
}

function serializeAnswers(
  questions: Record<string, unknown>[],
  answers: Record<number, string>,
): string {
  return questions
    .map((question, index) => {
      const number = numberFromQuestion(question, index);
      return `P${number}: ${(answers[number] ?? '').trim()}`;
    })
    .join('\n');
}


function parseSerializedAnswers(value?: string | null): Record<number, string> {
  if (!value) return {};
  const parsed: Record<number, string> = {};
  const matches = value.matchAll(/^P(\d+):\s*([\s\S]*?)(?=^P\d+:|$)/gm);
  for (const match of matches) {
    const number = Number(match[1]);
    if (Number.isFinite(number)) parsed[number] = match[2].trim();
  }
  return parsed;
}

const MULTIPLE_ATTEMPT_POLICIES = new Set([
  'multiples_intentos',
  'mejor_puntaje',
  'ultimo_intento',
  'practica_libre',
]);
export function ResolverEvaluacionPage() {
  const { id } = useParams();
  const evaluacionId = id ?? '';
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [enviada, setEnviada] = useState(false);
  const [startingNewAttempt, setStartingNewAttempt] = useState(false);
  const [submissionIssue, setSubmissionIssue] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState<SolicitudRevisionMotivo>('nota');
  const [reviewDetail, setReviewDetail] = useState('');

  const { data: evaluacion, isLoading, error } = useQuery({
    queryKey: ['evaluacion', evaluacionId],
    queryFn: () => getEvaluacion(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });

  const myDelivery = useQuery({
    queryKey: ['mi-entrega', evaluacionId],
    queryFn: () => getMiEntrega(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
  });

  const activityQuery = useQuery({
    queryKey: ['evaluacion-actividad', evaluacionId],
    queryFn: () => getActividadEstudiante(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
  });

  const reviewRequest = useQuery({
    queryKey: ['mi-solicitud-revision', evaluacionId],
    queryFn: () => getMiSolicitudRevision(evaluacionId),
    enabled: Boolean(evaluacionId && evaluacion?.mi_nota_confirmada != null),
    retry: false,
    refetchOnWindowFocus: true,
  });

  const modalidad = evaluacion?.modalidad ?? 'online';
  const assignedMaterial = activityQuery.data ?? null;
  const preguntas = useMemo(() => evaluacion?.preguntas ?? [], [evaluacion?.preguntas]);
  const preguntasOnline = useMemo(
    () => preguntas.filter(
      (question) => modalidad !== 'mixta' || question.modalidad_respuesta === 'online',
    ),
    [modalidad, preguntas],
  );
  const preguntasFisicas = useMemo(
    () => preguntas.filter(
      (question) => modalidad === 'mixta' && question.modalidad_respuesta !== 'online',
    ),
    [modalidad, preguntas],
  );
  const recepcionHabilitada = evaluacion?.recepcion_habilitada !== false;
  const permiteRespuestaOnline = modalidad === 'online' || modalidad === 'mixta';
  const estaCerrada = evaluacion?.estado === 'cerrada';
  const estadoVisible = ['publicada', 'en_calificacion', 'pendiente_revision'].includes(evaluacion?.estado ?? '');
  const disponible = estadoVisible && recepcionHabilitada;
  const existingDelivery = myDelivery.data ?? null;
  const deliveryRequiresRetry = existingDelivery?.estado === 'requiere_reintento';
  const needsRetry = deliveryRequiresRetry || Boolean(submissionIssue && !enviada);
  const allowsMultipleAttempts = MULTIPLE_ATTEMPT_POLICIES.has(
    evaluacion?.politica_intento ?? 'un_intento',
  );
  const showDeliverySummary = (enviada || Boolean(existingDelivery))
    && !needsRetry
    && !startingNewAttempt;
  const answerFormEnabled = permiteRespuestaOnline
    && disponible
    && !estaCerrada
    && !enviada
    && (!existingDelivery || needsRetry || (allowsMultipleAttempts && startingNewAttempt));
  const serializedAnswers = serializeAnswers(preguntasOnline, answers);
  const handleActivityAnswers = useCallback((next: Record<number, string>) => setAnswers(next), []);
  const ignoreActivityAnswers = useCallback(() => undefined, []);
  const physicalSubmitted = Boolean(existingDelivery?.archivo_url)
    && existingDelivery?.estado !== 'requiere_reintento';
  const onlinePartReady = modalidad === 'fisica'
    || Boolean(existingDelivery?.respuesta_texto)
    || enviada;
  const canUploadPhysical = (modalidad === 'fisica' || modalidad === 'mixta')
    && disponible
    && !estaCerrada
    && onlinePartReady
    && !physicalSubmitted;

  useEffect(() => {
    if (!deliveryRequiresRetry || !existingDelivery) return;
    setAnswers((current) => (
      Object.values(current).some((answer) => answer.trim())
        ? current
        : parseSerializedAnswers(existingDelivery.respuesta_texto)
    ));
    setEnviada(false);
    setStartingNewAttempt(false);
    setSubmissionIssue(
      'Tu respuesta quedó guardada, pero la IA no pudo analizarla. Puedes reenviarla sin perder este intento.',
    );
  }, [deliveryRequiresRetry, existingDelivery]);

  const entregar = useMutation({
    mutationFn: () => crearEntregaOnline(evaluacionId, { respuesta_texto: serializedAnswers }),
    onSuccess: (delivery) => {
      void myDelivery.refetch();
      if (delivery.estado === 'requiere_reintento') {
        setEnviada(false);
        setStartingNewAttempt(false);
        setSubmissionIssue(
          'Tu respuesta quedó guardada, pero la IA no pudo analizarla. Puedes reenviarla sin perder este intento.',
        );
        toast.error('La respuesta se guardó, pero necesita un nuevo intento de análisis.');
        return;
      }
      setSubmissionIssue(null);
      setEnviada(true);
      setStartingNewAttempt(false);
      toast.success(
        delivery.estado === 'recibida' && modalidad === 'mixta'
          ? 'Parte online guardada.'
          : 'Entrega enviada.',
      );
    },
    onError: (submitError) => toast.error(toApiError(submitError).detail),
  });

  const entregarArchivo = useMutation({
    mutationFn: () => crearEntregaArchivo(evaluacionId, evidenceFile!),
    onSuccess: () => {
      setEvidenceFile(null);
      setEnviada(true);
      setSubmissionIssue(null);
      void myDelivery.refetch();
      toast.success('Evidencia entregada. Tu docente revisará la calificación.');
    },
    onError: (submitError) => toast.error(toApiError(submitError).detail),
  });

  const requestReview = useMutation({
    mutationFn: () => solicitarRevisionEvaluacion(evaluacionId, {
      motivo: reviewReason,
      descripcion: reviewDetail.trim(),
    }),
    onSuccess: () => {
      void reviewRequest.refetch();
      setReviewOpen(false);
      setReviewDetail('');
      toast.success('Solicitud de revisión enviada al docente.');
    },
    onError: (requestError) => toast.error(toApiError(requestError).detail),
  });

  function submit() {
    const missing = preguntasOnline
      .map((question, index) => numberFromQuestion(question, index))
      .filter((number) => !(answers[number] ?? '').trim());
    if (missing.length > 0) {
      toast.error(`Completa ${missing.length === 1 ? `la pregunta ${missing[0]}` : `las preguntas ${missing.join(', ')}`}.`);
      return;
    }
    const value = serializedAnswers;
    if (!value) {
      toast.error('La respuesta es obligatoria.');
      return;
    }
    if (value.length < 10) {
      toast.error('La respuesta debe tener al menos 10 caracteres.');
      return;
    }
    if (!evaluacion || !answerFormEnabled || entregar.isPending) return;
    setSubmissionIssue(null);
    entregar.mutate();
  }

  function submitEvidence() {
    if (!evidenceFile) {
      toast.error('Selecciona una foto o un archivo PDF.');
      return;
    }
    if (!canUploadPhysical || entregarArchivo.isPending) return;
    entregarArchivo.mutate();
  }

  function submitReviewRequest() {
    if (reviewDetail.trim().length < 10) {
      toast.error('Explica la inconsistencia con al menos 10 caracteres.');
      return;
    }
    requestReview.mutate();
  }

  if (!evaluacionId) {
    return <EmptyState icon={TriangleAlert} title="Evaluación no encontrada" description="La ruta no incluye un identificador válido." />;
  }

  if (isLoading || myDelivery.isLoading) {
    return <div className="space-y-6"><Skeleton className="h-24" /><Skeleton className="h-72" /></div>;
  }

  if (error || !evaluacion) {
    const apiError = toApiError(error);
    return (
      <EmptyState
        icon={TriangleAlert}
        title={apiError.status === 403 ? 'No tienes acceso a esta evaluación' : 'Evaluación no disponible'}
        description={apiError.detail}
        action={<Link to="/app/evaluaciones" className="focus-ring inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2">Volver</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={evaluacion.nombre}
        eyebrow={modalidad === 'fisica' ? 'Entrega con foto o PDF' : modalidad === 'mixta' ? 'Evaluación mixta' : 'Evaluación online'}
        subtitle="Resuelve únicamente tu actividad y entrégala para revisión docente."
        breadcrumbs={[{ label: 'Evaluaciones', to: '/app/evaluaciones' }, { label: evaluacion.nombre }]}
        backAction={<Link to="/app/evaluaciones" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver</Link>}
        action={<a href={evaluationPdfUrl(evaluacionId, true)}><Button variant="outline"><Download className="h-4 w-4" /> {assignedMaterial ? 'Descargar material' : 'Descargar evaluación'}</Button></a>}
      />

      <Card className="space-y-4 border-l-4 border-l-brand-500 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold">Resumen de la evaluación</p>
            {evaluacion.descripcion && <RichContent content={evaluacion.descripcion} variant="compact" className="mt-1 text-muted" />}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Badge tone="brand" className="capitalize">{modalidad}</Badge>
            <Badge tone={statusTone[evaluacion.estado] ?? 'neutral'}>{evaluacion.estado}</Badge>
            <Badge tone="neutral">{preguntas.length} preguntas</Badge>
            <Badge tone="neutral">Nota máx.: {Number(evaluacion.nota_maxima)}</Badge>
          </div>
        </div>
      </Card>

      {!estadoVisible && (
        <Card className="flex items-start gap-3 border-amber-200 p-5 dark:border-amber-500/30">
          <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
          <div><p className="font-semibold">Evaluación no disponible para resolver</p><p className="text-sm text-muted">La actividad está cerrada o todavía no ha sido publicada. Puedes consultar su contenido y una entrega anterior, pero no enviar respuestas.</p></div>
        </Card>
      )}

      {estadoVisible && !recepcionHabilitada && (
        <Card className="flex items-start gap-3 border-amber-200 p-5 dark:border-amber-500/30">
          <PauseCircle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div><p className="font-semibold">Recepción pausada</p><p className="text-sm text-muted">El docente pausó temporalmente las entregas. Tus respuestas anteriores siguen guardadas.</p></div>
        </Card>
      )}

      {modalidad === 'fisica' && (
        <Card className="flex items-start gap-3 border-sky-200 p-5 dark:border-sky-500/30">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-brand-500" />
          <div><p className="font-semibold">Evaluación con evidencia física</p><p className="text-sm text-muted">Resuélvela en papel y sube una foto clara o un PDF. Solo podrás hacer una entrega, salvo que exista un error técnico.</p></div>
        </Card>
      )}

      {modalidad === 'mixta' && (
        <Card className="flex items-start gap-3 border-sky-200 p-5 dark:border-sky-500/30">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-brand-500" />
          <div>
            <p className="font-semibold">Evaluación mixta</p>
            <p className="text-sm text-muted">
              Responde aquí {preguntasOnline.length} pregunta{preguntasOnline.length === 1 ? '' : 's'}.
              Las otras {preguntasFisicas.length} se entregan en papel o archivo y el docente unirá ambas evidencias.
            </p>
          </div>
        </Card>
      )}

      {assignedMaterial && (
        <Card id="material-asignado" className="flex flex-col gap-4 border-violet-200 p-5 dark:border-violet-500/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><BookOpenCheck className="h-5 w-5" /></span>
            <div><p className="font-display text-lg font-bold">Material que debes resolver</p><p className="mt-1 text-sm text-muted">Abre el recurso completo aquí o descárgalo para imprimirlo y resolverlo a mano.</p></div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={'/app/recursos/' + assignedMaterial.material_id}><Button variant="outline" className="w-full"><BookOpenCheck className="h-4 w-4" /> Ver material</Button></Link>
            <a href={evaluationPdfUrl(evaluacionId, true)}><Button className="w-full"><Download className="h-4 w-4" /> Descargar PDF</Button></a>
          </div>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {assignedMaterial && (
            <StudentActivityPlayer
              activity={assignedMaterial}
              onAnswersChange={modalidad === 'online' && assignedMaterial.interactivo ? handleActivityAnswers : ignoreActivityAnswers}
              readOnly={modalidad !== 'online' || !assignedMaterial.interactivo}
            />
          )}
          {!(assignedMaterial?.interactivo && modalidad === 'online') && <>
          <div><h2 className="font-display text-lg font-bold">Preguntas</h2><p className="text-sm text-muted">Lee cada enunciado y numera tus respuestas al escribir.</p></div>
          {preguntasOnline.length === 0 ? (
            <p className="text-sm text-muted">Esta evaluación no tiene preguntas visibles.</p>
          ) : (
            <div className="space-y-3">
              {preguntasOnline.map((pregunta, index) => {
                const number = Number(pregunta.numero ?? index + 1);
                return (
                  <div key={number} id={`pregunta-${number}`} className="rounded-lg border border-border bg-surface p-4 sm:p-5 scroll-mt-24"><p className="text-xs font-semibold uppercase text-muted">Pregunta {number}</p><RichContent content={textFromQuestion(pregunta, index)} variant="evaluation" className="mt-2" /></div>
                );
              })}
            </div>
          )}
          </>}
        </section>

        <section className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {submissionIssue && (
            <Card className="flex items-start gap-3 border-amber-200 p-5 dark:border-amber-500/30">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold">La entrega está segura</p>
                <p className="text-sm text-muted">{submissionIssue}</p>
              </div>
            </Card>
          )}
          {(modalidad === 'fisica' || modalidad === 'mixta') && (
            <Card className="space-y-4 border-sky-200 p-5 dark:border-sky-500/30">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"><FileUp className="h-5 w-5" /></span>
                <div>
                  <h2 className="font-display text-lg font-bold">Foto o PDF de tu trabajo</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {physicalSubmitted
                      ? 'La evidencia ya fue entregada y quedó guardada.'
                      : modalidad === 'mixta' && !onlinePartReady
                        ? 'Primero envía la parte online. Después podrás adjuntar la evidencia física.'
                        : 'Usa buena iluminación y procura que todo el contenido sea legible. Máximo 15 MB.'}
                  </p>
                </div>
              </div>
              {physicalSubmitted ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" /> Evidencia recibida
                </div>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">Seleccionar archivo</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      disabled={!canUploadPhysical || entregarArchivo.isPending}
                      onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
                      className="focus-ring block w-full rounded-lg border border-border bg-surface p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700"
                    />
                  </label>
                  {evidenceFile && <p className="text-sm text-muted">Archivo listo: <strong className="text-fg">{evidenceFile.name}</strong></p>}
                  <Button className="w-full" onClick={submitEvidence} loading={entregarArchivo.isPending} disabled={!canUploadPhysical || !evidenceFile || entregarArchivo.isPending}>
                    <FileUp className="h-4 w-4" /> Entregar evidencia
                  </Button>
                </>
              )}
            </Card>
          )}
          {showDeliverySummary ? (
            <Card className="space-y-4 border-emerald-200 p-5 dark:border-emerald-500/30">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-semibold">
                    {evaluacion?.mi_nota_confirmada != null
                      ? 'Calificación confirmada'
                      : modalidad === 'mixta' && !physicalSubmitted
                        ? 'Parte online guardada'
                        : 'Entrega enviada'}
                  </p>
                  <p className="text-sm text-muted">
                    {evaluacion?.mi_nota_confirmada != null
                      ? `Tu nota es ${Number(evaluacion.mi_nota_confirmada).toFixed(1)} de ${Number(evaluacion.nota_maxima).toFixed(1)}.`
                      : modalidad === 'mixta' && !physicalSubmitted
                        ? 'Ahora entrega la parte física adjuntando una foto o PDF.'
                        : 'Tu respuesta fue recibida y está pendiente de revisión docente.'}
                  </p>
                  {evaluacion?.mi_nota_confirmada != null && (
                    <Link to="/app/calificaciones/boletin" className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      Ver nota y retroalimentación
                    </Link>
                  )}
                </div>
              </div>
              {allowsMultipleAttempts && disponible && !estaCerrada && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAnswers({});
                    setEnviada(false);
                    setSubmissionIssue(null);
                    setStartingNewAttempt(true);
                  }}
                >
                  Nuevo intento
                </Button>
              )}
              {evaluacion?.mi_nota_confirmada != null && (
                <div className="border-t border-emerald-200 pt-4 dark:border-emerald-500/25">
                  {reviewRequest.isLoading ? (
                    <Skeleton className="h-20" />
                  ) : reviewRequest.data?.estado === 'abierta' ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <div className="flex items-start gap-3">
                        <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-amber-950 dark:text-amber-100">Revisión solicitada</p>
                          <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-100">Tu docente recibió el reclamo y debe revisarlo.</p>
                          <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">{reviewRequest.data.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  ) : reviewRequest.data?.estado === 'resuelta' ? (
                    <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
                        <div>
                          <p className="font-bold text-sky-950 dark:text-sky-100">El docente respondió tu solicitud</p>
                          <p className="mt-1 text-sm leading-6 text-sky-900 dark:text-sky-100">{reviewRequest.data.resolucion || 'La solicitud fue marcada como resuelta.'}</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
                        <MessageSquareWarning className="h-4 w-4" aria-hidden="true" /> Solicitar una nueva revisión
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold">¿Notas alguna inconsistencia?</p>
                        <p className="mt-1 text-sm leading-6 text-secondary">Puedes pedir al docente que revise la nota, una respuesta o la evidencia.</p>
                      </div>
                      <Button type="button" variant="outline" className="shrink-0" onClick={() => setReviewOpen(true)}>
                        <MessageSquareWarning className="h-4 w-4" aria-hidden="true" /> Solicitar revisión
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ) : answerFormEnabled ? (
            <Card className="space-y-4 p-5">
              <div><h2 className="font-display text-lg font-bold">Tus respuestas</h2><p className="text-sm text-muted">Responde cada pregunta. XCalificator conservará la numeración al enviar.</p></div>
              {!(assignedMaterial?.interactivo && modalidad === 'online') && <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
                {preguntasOnline.map((question, index) => {
                  const number = numberFromQuestion(question, index);
                  const options = optionsFromQuestion(question);
                  const type = String(question.tipo ?? 'abierta');
                  return (
                    <div key={number} className="rounded-xl border border-border bg-surface-2/50 p-4">
                      <p className="mb-3 text-sm font-bold">Pregunta {number}</p>
                      {options.length > 0 ? (
                        <fieldset className="space-y-2" disabled={entregar.isPending}>
                          <legend className="sr-only">Respuesta de la pregunta {number}</legend>
                          {options.map((option) => (
                            <label key={option} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                              <input type="radio" name={`question-${number}`} value={option} checked={answers[number] === option} onChange={() => setAnswers((current) => ({ ...current, [number]: option }))} />
                              <span>{option}</span>
                            </label>
                          ))}
                        </fieldset>
                      ) : type === 'completar' ? (
                        <Field label={`Respuesta ${number}`}>
                          <Input value={answers[number] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [number]: event.target.value }))} disabled={entregar.isPending} />
                        </Field>
                      ) : (
                        <Field label={`Respuesta ${number}`}>
                          <Textarea value={answers[number] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [number]: event.target.value }))} className="min-h-28" disabled={entregar.isPending} />
                        </Field>
                      )}
                    </div>
                  );
                })}
              </div>}
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">{Object.values(answers).filter((answer) => answer.trim()).length} de {preguntasOnline.length} respondidas</p>
                <Button onClick={submit} loading={entregar.isPending} disabled={entregar.isPending} className="w-full sm:w-auto"><Send className="h-4 w-4" /> {needsRetry ? 'Reenviar respuestas' : 'Enviar respuestas'}</Button>
              </div>
            </Card>
          ) : null}
        </section>
      </div>

      <Modal
        open={reviewOpen}
        onClose={() => !requestReview.isPending && setReviewOpen(false)}
        title="Solicitar revisión de la calificación"
        className="max-w-2xl"
        closeOnBackdrop={!requestReview.isPending}
        closeOnEscape={!requestReview.isPending}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
            <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
            <div>
              <p className="font-bold">Tu solicitud llegará al docente</p>
              <p className="mt-1 text-sm leading-6 text-secondary">Describe con respeto qué parte debería revisar. La nota no cambia automáticamente.</p>
            </div>
          </div>
          <Field label="¿Qué deseas que revisen?" required>
            <Select value={reviewReason} onChange={(event) => setReviewReason(event.target.value as SolicitudRevisionMotivo)}>
              <option value="nota">La nota asignada</option>
              <option value="respuesta">Una respuesta específica</option>
              <option value="evidencia">La foto, PDF o evidencia</option>
              <option value="retroalimentacion">La retroalimentación</option>
              <option value="otro">Otra inconsistencia</option>
            </Select>
          </Field>
          <Field label="Explica lo que encontraste" hint="Menciona la pregunta o parte de la evidencia y por qué consideras que debe revisarse." required>
            <Textarea
              value={reviewDetail}
              onChange={(event) => setReviewDetail(event.target.value)}
              placeholder="Ejemplo: En la pregunta 3 mi procedimiento aparece correcto, pero el criterio figura sin puntaje…"
              className="min-h-36"
              maxLength={2000}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setReviewOpen(false)} disabled={requestReview.isPending}>Cancelar</Button>
            <Button type="button" onClick={submitReviewRequest} loading={requestReview.isPending} disabled={reviewDetail.trim().length < 10 || requestReview.isPending}>
              <Send className="h-4 w-4" aria-hidden="true" /> Enviar solicitud
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
