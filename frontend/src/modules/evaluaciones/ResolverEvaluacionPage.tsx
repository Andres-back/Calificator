import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, BookOpenCheck, CheckCircle2, ClipboardCheck, Clock3, Download, FileUp, MessageSquareWarning, PauseCircle, Send, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Modal, RichContent, Select, Skeleton, statusTone, Textarea } from '@/components/ui';
import { MultiPageEvidencePicker } from '@/components/evidence/MultiPageEvidencePicker';
import { evidenceFiles, evidenceRotations, type EvidencePage } from '@/components/evidence/evidencePayload';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { crearEntregaArchivo, crearEntregaOnline, evaluationPdfUrl, getActividadEstudiante, getEvaluacion, getMiEntrega, getMiSolicitudRevision, solicitarRevisionEvaluacion } from './api';
import { StudentActivityPlayer } from './StudentActivityPlayer';
import { StudentAnswerSheet } from './StudentAnswerSheet';
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


const MULTIPLE_ATTEMPT_POLICIES = new Set([
  'multiples_intentos',
  'mejor_puntaje',
  'ultimo_intento',
  'practica_libre',
]);
export function ResolverEvaluacionPage() {
  const { id } = useParams();
  const evaluacionId = id ?? '';
  const queryClient = useQueryClient();
  const studentId = useAuth((state) => state.user?.id ?? 'anonymous');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [enviada, setEnviada] = useState(false);
  const [startingNewAttempt, setStartingNewAttempt] = useState(false);
  const [submissionIssue, setSubmissionIssue] = useState<string | null>(null);
  const [evidencePages, setEvidencePages] = useState<EvidencePage[]>([]);
  const [evidenceConfirmOpen, setEvidenceConfirmOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState<SolicitudRevisionMotivo>('nota');
  const [reviewDetail, setReviewDetail] = useState('');
  const [firstIncomplete, setFirstIncomplete] = useState<number | null>(null);
  const [onlineConfirmOpen, setOnlineConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const replacementRequested = Boolean(existingDelivery?.reemplazo_solicitado);
  const deliveryRequiresTeacherAttention = existingDelivery?.estado === 'requiere_reintento' && !replacementRequested;
  const needsRetry = Boolean(submissionIssue && !enviada);
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
  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const draftKey = 'xcalificator:evaluacion:draft:' + studentId + ':' + evaluacionId;
  const handleAnswerChange = useCallback((number: number, value: string) => {
    setAnswers((current) => ({ ...current, [number]: value }));
    setFirstIncomplete((current) => current === number ? null : current);
    setSubmitError(null);
  }, []);
  const handleActivityAnswers = useCallback((next: Record<number, string>) => {
    setAnswers(next);
    setFirstIncomplete(null);
    setSubmitError(null);
  }, []);
  const ignoreActivityAnswers = useCallback(() => undefined, []);
  const physicalSubmitted = Boolean(existingDelivery?.archivo_url && !replacementRequested);
  const onlinePartReady = modalidad === 'fisica'
    || Boolean(existingDelivery?.respuesta_texto)
    || enviada;
  const canUploadPhysical = (modalidad === 'fisica' || modalidad === 'mixta')
    && disponible
    && !estaCerrada
    && onlinePartReady
    && !physicalSubmitted;
  useEffect(() => {
    setAnswers({});
    setFirstIncomplete(null);
    setSubmitError(null);
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      const restored = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, value]) => typeof value === 'string')
          .map(([number, value]) => [Number(number), String(value)]),
      );
      setAnswers(restored);
    } catch {
      sessionStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    if (enviada || existingDelivery) return;
    if (!Object.values(answers).some((answer) => answer.trim())) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(answers));
    } catch {
      // El navegador puede bloquear el almacenamiento; la resolución continúa normalmente.
    }
  }, [answers, draftKey, enviada, existingDelivery]);

  useEffect(() => {
    if (!deliveryRequiresTeacherAttention || !existingDelivery) return;
    setEnviada(true);
    setStartingNewAttempt(false);
    setSubmissionIssue(
      'Tu entrega fue recibida. El docente fue notificado para revisarla o reprocesarla; no necesitas volver a enviarla.',
    );
  }, [deliveryRequiresTeacherAttention, existingDelivery]);

  const entregar = useMutation({
    mutationFn: () => crearEntregaOnline(evaluacionId, { respuesta_texto: serializedAnswers }),
    onSuccess: (delivery) => {
      queryClient.setQueryData(['mi-entrega', evaluacionId], delivery);
      setEnviada(true);
      setStartingNewAttempt(false);
      setOnlineConfirmOpen(false);
      setFirstIncomplete(null);
      setSubmitError(null);
      sessionStorage.removeItem(draftKey);
      if (delivery.estado === 'requiere_reintento') {
        setSubmissionIssue(
          'Tu entrega fue recibida. El docente fue notificado para revisarla o reprocesarla; no necesitas volver a enviarla.',
        );
      } else {
        setSubmissionIssue(null);
      }
      toast.success(
        modalidad === 'mixta'
          ? 'Parte online guardada.'
          : 'Entrega realizada. Quedó pendiente de calificación docente.',
      );
    },
    onError: (error) => {
      const detail = toApiError(error).detail;
      setOnlineConfirmOpen(false);
      setSubmitError(detail);
      toast.error(detail);
    },
  });

  const entregarArchivo = useMutation({
    mutationFn: () => crearEntregaArchivo(evaluacionId, evidenceFiles(evidencePages), evidenceRotations(evidencePages)),
    onSuccess: (delivery) => {
      queryClient.setQueryData(['mi-entrega', evaluacionId], delivery);
      setEvidencePages([]);
      setEvidenceConfirmOpen(false);
      setEnviada(true);
      setSubmitError(null);
      setSubmissionIssue(
        delivery.estado === 'requiere_reintento'
          ? 'Tu entrega fue recibida. El docente fue notificado para revisarla o reprocesarla; no necesitas volver a enviarla.'
          : null,
      );
      toast.success('Entrega realizada. Tu evidencia quedó pendiente de calificación docente.');
    },
    onError: (error) => {
      const detail = toApiError(error).detail;
      setEvidenceConfirmOpen(false);
      setSubmitError(detail);
      toast.error(detail);
    },
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
      const first = missing[0];
      setFirstIncomplete(first);
      toast.error(missing.length === 1 ? 'Completa la respuesta pendiente.' : 'Te faltan ' + missing.length + ' respuestas.');
      window.setTimeout(() => {
        document.getElementById('respuesta-' + first)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    if (!evaluacion || !answerFormEnabled || entregar.isPending) return;
    setFirstIncomplete(null);
    setSubmitError(null);
    setOnlineConfirmOpen(true);
  }

  function submitEvidence() {
    if (evidencePages.length === 0) {
      toast.error('Selecciona una foto o un archivo PDF.');
      return;
    }
    if (!canUploadPhysical || entregarArchivo.isPending) return;
    setEvidenceConfirmOpen(true);
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
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className={'space-y-4 ' + (modalidad === 'fisica' ? 'order-2' : '')}>
          {assignedMaterial && (
            <StudentActivityPlayer
              activity={assignedMaterial}
              onAnswersChange={modalidad === 'online' && assignedMaterial.interactivo ? handleActivityAnswers : ignoreActivityAnswers}
              readOnly={modalidad !== 'online' || !assignedMaterial.interactivo}
            />
          )}
          {!answerFormEnabled && !(assignedMaterial?.interactivo && modalidad === 'online') && <>
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

        <section className={'space-y-4 ' + (modalidad === 'fisica' ? 'order-1' : '')}>
          {submitError && (
            <Card className="flex items-start gap-3 border-rose-200 p-5 dark:border-rose-500/30">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
              <div>
                <p className="font-semibold">No pudimos enviar todavía</p>
                <p className="mt-1 text-sm text-muted">{submitError}</p>
                <p className="mt-2 text-xs font-semibold text-secondary">Tus respuestas siguen guardadas. Revisa tu conexión e inténtalo otra vez.</p>
              </div>
            </Card>
          )}
          {submissionIssue && !showDeliverySummary && (
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
                        : 'Puedes subir hasta 10 fotos de 10 MB cada una, o un PDF. El paquete completo admite hasta 40 MB.'}
                  </p>
                </div>
              </div>
              {replacementRequested && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="font-bold">El docente solicitó reemplazar la entrega completa</p>
                  <p className="mt-1">{existingDelivery?.motivo_reemplazo || 'Falta una hoja o la evidencia necesita corregirse.'} Vuelve a seleccionar todas las hojas, no solo la faltante.</p>
                  {existingDelivery?.archivo_url && <a href={existingDelivery.archivo_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold underline underline-offset-2">Ver paquete anterior</a>}
                </div>
              )}
              {physicalSubmitted ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>Evidencia recibida · {existingDelivery?.evidencia_paginas ?? 1} {(existingDelivery?.evidencia_paginas ?? 1) === 1 ? 'hoja' : 'hojas'}</span>
                  {existingDelivery?.archivo_url && <a href={existingDelivery.archivo_url} target="_blank" rel="noreferrer" className="ml-auto underline underline-offset-2">Ver entrega completa</a>}
                </div>
              ) : (
                <>
                  <MultiPageEvidencePicker
                    pages={evidencePages}
                    onChange={(pages) => { setEvidencePages(pages); setSubmissionIssue(null); setSubmitError(null); }}
                    disabled={!canUploadPhysical || entregarArchivo.isPending}
                    onError={(message) => toast.error(message)}
                  />
                  <Button className="w-full" onClick={submitEvidence} loading={entregarArchivo.isPending} disabled={!canUploadPhysical || evidencePages.length === 0 || entregarArchivo.isPending}>
                    <FileUp className="h-4 w-4" /> Revisar y entregar {evidencePages.length === 1 ? '1 hoja' : `${evidencePages.length} hojas`}
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
                        : deliveryRequiresTeacherAttention
                          ? 'Entrega recibida'
                          : 'Entrega realizada'}
                  </p>
                  <p className="text-sm text-muted">
                    {evaluacion?.mi_nota_confirmada != null
                      ? `Tu nota es ${Number(evaluacion.mi_nota_confirmada).toFixed(1)} de ${Number(evaluacion.nota_maxima).toFixed(1)}.`
                      : modalidad === 'mixta' && !physicalSubmitted
                        ? 'Ahora entrega la parte física adjuntando una foto o PDF.'
                        : deliveryRequiresTeacherAttention
                          ? 'Tu evidencia está segura. El docente debe revisarla o reprocesarla; no necesitas volver a enviarla.'
                          : 'Tu respuesta fue recibida y está pendiente de calificación docente.'}
                  </p>
                  {evaluacion?.mi_nota_confirmada != null && (
                    <Link to="/app/calificaciones/boletin" className="mt-2 inline-flex text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
                      Ver nota y retroalimentación
                    </Link>
                  )}
                </div>
              </div>
              {evaluacion?.mi_nota_confirmada == null && !(modalidad === 'mixta' && !physicalSubmitted) && (
                <Link to="/app/evaluaciones" className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-fg transition hover:bg-surface-2 sm:w-auto">
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a mis evaluaciones
                </Link>
              )}
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
            assignedMaterial?.interactivo && modalidad === 'online' ? (
              <Card className="flex flex-col gap-4 border-brand-200 p-5 dark:border-brand-500/30 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold">Entrega tu actividad interactiva</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">Tus avances se guardan en esta pestaña. Cuando termines el juego o ejercicio, revisa y confirma la entrega.</p>
                  <p className="mt-2 text-xs font-semibold text-brand-700 dark:text-brand-300">{answeredCount} respuestas preparadas</p>
                </div>
                <Button onClick={submit} loading={entregar.isPending} disabled={entregar.isPending} className="min-h-12 w-full shrink-0 sm:w-auto">
                  <Send className="h-4 w-4" /> Revisar actividad y entregar
                </Button>
              </Card>
            ) : (
            <StudentAnswerSheet
              questions={preguntasOnline}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              onSubmit={submit}
              submitting={entregar.isPending}
              retry={needsRetry}
              firstIncomplete={firstIncomplete}
              draftSaved={answeredCount > 0}
            />
            )
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        open={onlineConfirmOpen}
        onClose={() => !entregar.isPending && setOnlineConfirmOpen(false)}
        onConfirm={() => entregar.mutate()}
        loading={entregar.isPending}
        title="¿Entregar la evaluación?"
        description={'Completaste ' + answeredCount + ' de ' + preguntasOnline.length + ' respuestas. Después de confirmar no podrás cambiarlas, salvo que la evaluación permita otro intento.'}
        confirmLabel="Sí, entregar ahora"
      >
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-950 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-100">
          Revisa con calma tus respuestas. Al confirmar, el docente recibirá la entrega y podrás seguir navegando mientras espera calificación.
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={evidenceConfirmOpen}
        onClose={() => !entregarArchivo.isPending && setEvidenceConfirmOpen(false)}
        onConfirm={() => entregarArchivo.mutate()}
        loading={entregarArchivo.isPending}
        title={`Vas a entregar ${evidencePages.length === 1 ? '1 hoja' : `${evidencePages.length} hojas`}`}
        description="Se enviarán en el orden mostrado como una sola entrega. Después de confirmar no podrás anexar más hojas."
        confirmLabel={`Entregar ${evidencePages.length === 1 ? '1 hoja' : `${evidencePages.length} hojas`}`}
      >
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
          Revisa que ninguna hoja esté repetida, girada o fuera de orden. Si falta una página, cancela y agrégala ahora.
        </div>
      </ConfirmDialog>

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
