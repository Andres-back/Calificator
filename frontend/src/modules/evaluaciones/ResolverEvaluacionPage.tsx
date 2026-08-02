import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ClipboardCheck, PauseCircle, Send, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, RichContent, Skeleton, statusTone, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { crearEntregaOnline, getEvaluacion, getMiEntrega } from './api';

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

  const { data: evaluacion, isLoading, error } = useQuery({
    queryKey: ['evaluacion', evaluacionId],
    queryFn: () => getEvaluacion(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
  });

  const myDelivery = useQuery({
    queryKey: ['mi-entrega', evaluacionId],
    queryFn: () => getMiEntrega(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
  });

  const modalidad = evaluacion?.modalidad ?? 'online';
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
  const permiteRespuestaOnline = modalidad !== 'fisica' || recepcionHabilitada;
  const estaCerrada = evaluacion?.estado === 'cerrada';
  const estadoVisible = ['publicada', 'en_calificacion', 'pendiente_revision'].includes(evaluacion?.estado ?? '');
  const recepcionHabilitada = evaluacion?.recepcion_habilitada !== false;
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
        eyebrow="Evaluación online"
        subtitle="Lee los enunciados con calma y envía tu respuesta para revisión docente."
        breadcrumbs={[{ label: 'Evaluaciones', to: '/app/evaluaciones' }, { label: evaluacion.nombre }]}
        backAction={<Link to="/app/evaluaciones" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver</Link>}
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
          <div><p className="font-semibold">Evaluación física</p><p className="text-sm text-muted">Esta evaluación está marcada como física. Debe ser entregada o calificada por el docente.</p></div>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
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
          {showDeliverySummary ? (
            <Card className="space-y-4 border-emerald-200 p-5 dark:border-emerald-500/30">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /><div><p className="font-semibold">{modalidad === 'mixta' ? 'Parte online guardada' : 'Entrega enviada'}</p><p className="text-sm text-muted">{modalidad === 'mixta' ? 'Ahora entrega la parte física. El docente subirá la foto y revisará una sola nota consolidada.' : 'Tu respuesta fue recibida. El docente confirmará la calificación.'}</p></div></div>
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
            </Card>
          ) : answerFormEnabled ? (
            <Card className="space-y-4 p-5">
              <div><h2 className="font-display text-lg font-bold">Tus respuestas</h2><p className="text-sm text-muted">Responde cada pregunta. XCalificator conservará la numeración al enviar.</p></div>
              <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
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
              </div>
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">{Object.values(answers).filter((answer) => answer.trim()).length} de {preguntasOnline.length} respondidas</p>
                <Button onClick={submit} loading={entregar.isPending} disabled={entregar.isPending} className="w-full sm:w-auto"><Send className="h-4 w-4" /> {needsRetry ? 'Reenviar respuestas' : 'Enviar respuestas'}</Button>
              </div>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
