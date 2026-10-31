import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { approveFeedbackReview, saveFeedbackMessage, type FeedbackPreview, type FeedbackReviewInput } from './api';
import { FeedbackMessage } from './FeedbackMessage';
import { useAuth } from '@/stores/auth';

export function FeedbackDeliveryReview({ evaluationId, name, preview, signal, valid, onApproved, onCancel, onBusy, onDirtyChange }: {
  evaluationId: string; name: string; preview: FeedbackPreview; signal: AbortSignal;
  valid: () => boolean; onApproved: (result: FeedbackPreview, action?: 'saved') => void; onCancel: () => void;
  onBusy: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const candidate = (preview.revision_docente ?? preview.mensaje_editable)!;
  const permissions = useAuth(state => state.user?.permissions ?? []);
  const canApprove = Boolean(preview.revision_docente) && permissions.includes('grading.publish');
  const [message, setMessage] = useState(preview.resultado?.retroalimentacion ?? candidate.feedback_text);
  const initialScope = preview.resultado?.alcance ?? 'summary';
  const [scope, setScope] = useState<'summary' | 'detail'>(initialScope);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const messageDirty = message !== (preview.resultado?.retroalimentacion ?? candidate.feedback_text);
  const dirty = messageDirty || scope !== initialScope;
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);
  async function approve(saveOnly = false) {
    if (locked.current || !valid() || !message.trim()) return;
    locked.current = true; setBusy(true); onBusy(true); setError('');
    const fingerprint = JSON.stringify([candidate.source_fingerprint, message, scope, saveOnly]);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    const payload: FeedbackReviewInput = { calificacion_id: preview.calificacion_id,
      source_fingerprint: candidate.source_fingerprint, feedback_text: message, scope, request_id: request.current.id };
    try {
      const result = saveOnly ? await saveFeedbackMessage(evaluationId, { calificacion_id: payload.calificacion_id, source_fingerprint: payload.source_fingerprint, feedback_text: payload.feedback_text, request_id: payload.request_id }, signal) : await approveFeedbackReview(evaluationId, payload, signal);
      if (valid() && result.calificacion_id === preview.calificacion_id && (saveOnly || result.elegible)) onApproved(result, saveOnly ? 'saved' : undefined);
    } catch (reason) {
      const detail = (reason as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (valid()) setError(typeof detail === 'string' ? detail : 'No pudimos confirmar la aprobación. Puedes reintentar sin duplicarla; si cambió la nota, vuelve a la lista y actualízala.');
    } finally {
      locked.current = false;
      if (valid()) { setBusy(false); onBusy(false); }
    }
  }
  const score = preview.resultado ?? preview.borrador_docente;
  return <section className="space-y-4" tabIndex={-1} data-feedback-review-form aria-label={'Revisar retroalimentación de ' + name}>
    <h3 className="text-lg font-bold">{name}</h3>
    <p className="font-semibold">{canApprove ? 'Nota confirmada' : 'Nota sugerida'}: {score?.nota} / {score?.nota_maxima}</p>
    <p className="text-sm leading-6">Revisa el mensaje que recibirá el estudiante. Aprobar esta retroalimentación no cambia la nota ni elimina los avisos del análisis original.</p>
    {canApprove && <label className="block space-y-2 text-sm font-semibold">Contenido de la retroalimentación
      <select className="min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" disabled={busy} value={scope} onChange={event => setScope(event.target.value as 'summary' | 'detail')}>
        <option value="summary">Solo nota y retroalimentación</option>
        {candidate.detail_available && <option value="detail">Incluir detalle por pregunta revisado</option>}
      </select>
    </label>}
    {canApprove && scope === 'summary' && <p className="text-sm text-muted">No se compartirán respuestas ni puntajes por pregunta. Xali solo podrá explicar esta nota y el mensaje aprobado, sin inventar detalles.</p>}
    {!canApprove && <p className="text-sm text-muted">Puedes guardar el mensaje ahora. Para entregarlo, primero revisa y confirma la nota; guardarlo no la publica.</p>}
    <label className="block space-y-2 text-sm font-semibold">Mensaje para el estudiante
      <textarea className="min-h-56 w-full resize-y rounded-lg border border-border bg-surface p-3 text-base font-normal leading-6" rows={10} maxLength={6000} value={message} disabled={busy} onChange={event => setMessage(event.target.value)} />
    </label>
    <p className="text-xs text-muted">{message.length} / 6000 caracteres. Si el texto dice «provisional», corrígelo después de revisar la entrega; no se quitará automáticamente.</p>
    <details className="rounded-xl border border-border p-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Vista previa del mensaje</summary><FeedbackMessage text={message} /></details>
    {error && <p role="alert" className="rounded-lg border border-amber-400 p-3 text-sm">{error}</p>}
    <div className="flex flex-wrap gap-2">
      {preview.mensaje_editable && permissions.includes('grading.grade') && <Button variant="outline" disabled={busy || !message.trim() || !messageDirty} onClick={() => void approve(true)}>Guardar mensaje sin publicar</Button>}
      {canApprove && <Button disabled={busy || !message.trim() || message.length > 6000} loading={busy} onClick={() => void approve()}>Aprobar retroalimentación</Button>}
      <Button variant="outline" disabled={busy} onClick={() => { if (dirty) setDiscard(true); else onCancel(); }}>Volver sin aprobar</Button>
    </div>
    {discard && <div role="alert" className="space-y-2 rounded-xl border border-amber-400 p-3"><p>Tienes cambios sin guardar. Puedes seguir editando o descartarlos.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setDiscard(false)}>Seguir editando</Button><Button variant="outline" onClick={onCancel}>Descartar cambios y volver</Button></div></div>}
  </section>;
}
