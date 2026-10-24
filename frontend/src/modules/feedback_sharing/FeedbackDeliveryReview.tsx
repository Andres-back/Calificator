import { useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { approveFeedbackReview, type FeedbackPreview, type FeedbackReviewInput } from './api';
import { FeedbackMessage } from './FeedbackMessage';

export function FeedbackDeliveryReview({ evaluationId, name, preview, signal, valid, onApproved, onCancel, onBusy }: {
  evaluationId: string; name: string; preview: FeedbackPreview; signal: AbortSignal;
  valid: () => boolean; onApproved: (result: FeedbackPreview) => void; onCancel: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const candidate = preview.revision_docente!;
  const [message, setMessage] = useState(preview.resultado?.retroalimentacion ?? candidate.feedback_text);
  const [scope, setScope] = useState<'summary' | 'detail'>('summary');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  async function approve() {
    if (locked.current || !valid() || !message.trim()) return;
    locked.current = true; setBusy(true); onBusy(true); setError('');
    const fingerprint = JSON.stringify([candidate.source_fingerprint, message, scope]);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    const payload: FeedbackReviewInput = { calificacion_id: preview.calificacion_id,
      source_fingerprint: candidate.source_fingerprint, feedback_text: message, scope, request_id: request.current.id };
    try {
      const result = await approveFeedbackReview(evaluationId, payload, signal);
      if (valid() && result.calificacion_id === preview.calificacion_id && result.elegible) onApproved(result);
    } catch (reason) {
      const detail = (reason as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (valid()) setError(typeof detail === 'string' ? detail : 'No pudimos confirmar la aprobación. Puedes reintentar sin duplicarla; si cambió la nota, vuelve a la lista y actualízala.');
    } finally {
      locked.current = false;
      if (valid()) { setBusy(false); onBusy(false); }
    }
  }
  const score = preview.resultado ?? preview.borrador_docente;
  return <section className="space-y-4" aria-label={'Revisar devolución de ' + name}>
    <h3 className="text-lg font-bold">{name}</h3>
    <p className="font-semibold">Nota confirmada: {score?.nota} / {score?.nota_maxima}</p>
    <p className="text-sm leading-6">Revisa el mensaje que recibirá el estudiante. Aprobar esta devolución no cambia la nota ni elimina los avisos del análisis original.</p>
    <label className="block space-y-2 text-sm font-semibold">Contenido de la devolución
      <select className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" disabled={busy} value={scope} onChange={event => setScope(event.target.value as 'summary' | 'detail')}>
        <option value="summary">Solo nota y retroalimentación</option>
        {candidate.detail_available && <option value="detail">Incluir detalle por pregunta revisado</option>}
      </select>
    </label>
    {scope === 'summary' && <p className="text-sm text-muted">No se compartirán respuestas ni puntajes por pregunta. Xali solo podrá explicar esta nota y el mensaje aprobado, sin inventar detalles.</p>}
    <label className="block space-y-2 text-sm font-semibold">Mensaje para el estudiante
      <textarea className="min-h-56 w-full resize-y rounded-lg border border-border bg-surface p-3 text-base font-normal leading-6" rows={10} maxLength={6000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} />
    </label>
    <p className="text-xs text-muted">{message.length} / 6000 caracteres. Si el texto dice «provisional», corrígelo después de revisar la entrega; no se quitará automáticamente.</p>
    <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Vista previa del mensaje</summary><FeedbackMessage text={message} /></details>
    {error && <p role="alert" className="rounded-lg border border-amber-400 p-3 text-sm">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !message.trim() || message.length > 6000} loading={busy} onClick={() => void approve()}>Aprobar devolución</Button>
      <Button variant="outline" disabled={busy} onClick={onCancel}>Volver sin aprobar</Button>
    </div>
  </section>;
}
