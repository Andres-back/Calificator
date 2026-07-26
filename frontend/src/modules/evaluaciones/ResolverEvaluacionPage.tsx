import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Send, TriangleAlert } from 'lucide-react';
import { Badge, Button, Card, EmptyState, RichContent, Skeleton, statusTone, Textarea } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';
import { toApiError } from '@/lib/api';
import { crearEntregaOnline, getEvaluacion } from './api';

function textFromQuestion(question: Record<string, unknown>, index: number): string {
  for (const key of ['enunciado', 'pregunta', 'texto', 'descripcion', 'nombre']) {
    const value = question[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return `Pregunta ${index + 1}`;
}

export function ResolverEvaluacionPage() {
  const { id } = useParams();
  const evaluacionId = id ?? '';
  const [respuesta, setRespuesta] = useState('');
  const [enviada, setEnviada] = useState(false);

  const { data: evaluacion, isLoading, error } = useQuery({
    queryKey: ['evaluacion', evaluacionId],
    queryFn: () => getEvaluacion(evaluacionId),
    enabled: Boolean(evaluacionId),
    retry: false,
  });

  const preguntas = useMemo(() => evaluacion?.preguntas ?? [], [evaluacion?.preguntas]);
  const modalidad = evaluacion?.modalidad ?? 'online';
  const permiteRespuestaOnline = modalidad === 'online' || modalidad === 'mixta';
  const estaCerrada = evaluacion?.estado === 'cerrada';
  const disponible = evaluacion?.estado === 'publicada' || evaluacion?.estado === 'en_calificacion';

  const entregar = useMutation({
    mutationFn: () => crearEntregaOnline(evaluacionId, { respuesta_texto: respuesta.trim() }),
    onSuccess: () => {
      setEnviada(true);
      toast.success('Entrega enviada.');
    },
    onError: (submitError) => toast.error(toApiError(submitError).detail),
  });

  function submit() {
    const value = respuesta.trim();
    if (!value) {
      toast.error('La respuesta es obligatoria.');
      return;
    }
    if (value.length < 10) {
      toast.error('La respuesta debe tener al menos 10 caracteres.');
      return;
    }
    if (!evaluacion || estaCerrada || !permiteRespuestaOnline || enviada || entregar.isPending) return;
    entregar.mutate();
  }

  if (!evaluacionId) {
    return <EmptyState icon={TriangleAlert} title="Evaluación no encontrada" description="La ruta no incluye un identificador válido." />;
  }

  if (isLoading) {
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
        action={<Link to="/app/evaluaciones" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2"><ArrowLeft className="h-4 w-4" /> Volver</Link>}
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

      {!disponible && (
        <Card className="flex items-start gap-3 border-amber-200 p-5 dark:border-amber-500/30">
          <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
          <div><p className="font-semibold">Evaluación no disponible para resolver</p><p className="text-sm text-muted">Solo las evaluaciones publicadas o en calificación aceptan entregas.</p></div>
        </Card>
      )}

      {modalidad === 'fisica' && (
        <Card className="flex items-start gap-3 border-sky-200 p-5 dark:border-sky-500/30">
          <ClipboardCheck className="mt-0.5 h-5 w-5 text-brand-500" />
          <div><p className="font-semibold">Evaluación física</p><p className="text-sm text-muted">Esta evaluación está marcada como física. Debe ser entregada o calificada por el docente.</p></div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div><h2 className="font-display text-lg font-bold">Preguntas</h2><p className="text-sm text-muted">Lee cada enunciado y numera tus respuestas al escribir.</p></div>
          {preguntas.length === 0 ? (
            <p className="text-sm text-muted">Esta evaluación no tiene preguntas visibles.</p>
          ) : (
            <div className="space-y-3">
              {preguntas.map((pregunta, index) => (
                <div key={index} id={`pregunta-${index + 1}`} className="rounded-lg border border-border bg-surface p-4 sm:p-5 scroll-mt-24"><p className="text-xs font-semibold uppercase text-muted">Pregunta {index + 1}</p><RichContent content={textFromQuestion(pregunta, index)} variant="evaluation" className="mt-2" /></div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {enviada ? (
            <Card className="flex items-start gap-3 border-emerald-200 p-5 dark:border-emerald-500/30"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /><div><p className="font-semibold">Entrega enviada</p><p className="text-sm text-muted">Tu respuesta fue recibida. El docente confirmará la calificación.</p></div></Card>
          ) : permiteRespuestaOnline && disponible && !estaCerrada ? (
            <Card className="space-y-4 p-5">
              <div><h2 className="font-display text-lg font-bold">Tu respuesta</h2><p className="text-sm text-muted">Escribe tu respuesta numerando cada pregunta (ej: <strong>P1:</strong> ..., <strong>P2:</strong> ...).</p></div>
              <Textarea value={respuesta} onChange={(event) => setRespuesta(event.target.value)} placeholder="P1: ...
P2: ..." className="min-h-[300px]" disabled={entregar.isPending} />
              <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted">{respuesta.trim().length} caracteres · mínimo 10</p>
                <Button onClick={submit} loading={entregar.isPending} disabled={entregar.isPending || enviada} className="w-full sm:w-auto"><Send className="h-4 w-4" /> Enviar respuesta</Button>
              </div>
            </Card>
          ) : null}
        </section>
      </div>
    </div>
  );
}
