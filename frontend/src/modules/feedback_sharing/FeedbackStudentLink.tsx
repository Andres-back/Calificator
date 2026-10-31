import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { copyFeedbackAccesses, listFeedbackAccesses, type FeedbackAccess, type FeedbackCopiedAccess, type FeedbackPreview } from './api';
import { deriveDeliveryAvailability, type AccessRecovery } from './deliveryAvailability';
import { buildIndividualFeedbackMessage, buildWhatsAppShareUrl, shareFeedbackMessage } from './feedbackShareMessage';

/** Presentation of the saved access, not a second issuance workflow. */
export function FeedbackStudentLink({ evaluationId, gradeId, evaluationName, studentName, preview, accesses, queryStatus,
  signal, valid, disabled, onBusy, onRetry, onGenerate, onReview, onManage }: {
  evaluationId: string; gradeId: string; evaluationName: string; studentName: string; preview?: FeedbackPreview;
  accesses: FeedbackAccess[]; queryStatus: 'loading' | 'loaded' | 'error'; signal: AbortSignal; valid: () => boolean;
  disabled: boolean; onBusy: (busy: boolean) => void; onRetry: () => void;
  onGenerate: () => void; onReview: () => void; onManage: () => void;
}) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user?.id);
  const [recoveries, setRecoveries] = useState<Record<string, AccessRecovery>>({});
  const [recoveryScope, setRecoveryScope] = useState('');
  const [selectedAccessId, setSelectedAccessId] = useState('');
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now);
  const mounted = useRef(true);
  const lock = useRef(false);
  const copyFocus = useRef<HTMLButtonElement | null>(null);
  const permitted = user?.id === owner && ['profesor', 'admin'].includes(user?.rol ?? '')
    && ['grading.read', 'grading.publish'].every(permission => user?.permissions?.includes(permission));
  const scoped = accesses.filter(access => access.calificacion_id === gradeId);
  const signature = scoped.map(access => [access.id, access.version, access.estado, access.expires_at, access.copy_available].join(':')).join('|');
  const scope = JSON.stringify([user?.id, permitted, evaluationId, gradeId, signature, queryStatus, selectedAccessId, retry]);
  const scopeRef = useRef(scope); scopeRef.current = scope;
  const current = () => mounted.current && scopeRef.current === scope && valid() && !signal.aborted && useAuth.getState().user?.id === owner
    && ['profesor', 'admin'].includes(useAuth.getState().user?.rol ?? '')
    && ['grading.read', 'grading.publish'].every(permission => useAuth.getState().user?.permissions?.includes(permission));
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; onBusy(false); }; }, [onBusy]);
  useLayoutEffect(() => {
    const trigger = copyFocus.current;
    if (!busy && !disabled && trigger?.isConnected && !trigger.disabled) {
      trigger.focus({ preventScroll: true }); copyFocus.current = null;
    }
  }, [busy, disabled]);
  useEffect(() => {
    const next = Math.min(...scoped.map(access => Date.parse(access.expires_at)).filter(time => Number.isFinite(time) && time > Date.now()));
    if (!Number.isFinite(next)) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(next - Date.now() + 10, 2_147_483_647));
    return () => window.clearTimeout(timer);
    // A server refresh replaces the signature; this timer only hides expired data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, now]);
  useEffect(() => {
    if (!permitted || queryStatus !== 'loaded') return;
    const abort = new AbortController();
    setRecoveryScope(scope);
    const candidates = accesses.filter(access => access.calificacion_id === gradeId && access.estado === 'active'
      && Date.parse(access.expires_at) > Date.now() && access.copy_available !== false);
    const access = candidates.length === 1 ? candidates[0] : candidates.find(item => item.id === selectedAccessId);
    setRecoveries({}); setNotice('');
    if (!access) return () => abort.abort();
    setRecoveries({ [access.id]: { status: 'loading' } });
    void copyFeedbackAccesses(evaluationId, [access.id], abort.signal).then(results => {
      if (abort.signal.aborted || !current()) return;
      const result = results.length === 1 && results[0].id === access.id ? results[0] : undefined;
      if (result?.url && (!result.calificacion_id || result.calificacion_id === gradeId)) {
        setRecoveries({ [access.id]: { status: 'ready', result } });
      } else setRecoveries({ [access.id]: { status: 'unavailable', code: result?.code, error: result?.error } });
    }).catch(() => { if (!abort.signal.aborted && current()) setRecoveries({ [access.id]: { status: 'error', error: 'No pudimos recuperar su enlace.' } }); });
    return () => abort.abort();
    // Scope/signature changes invalidate every credential, never local storage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId, gradeId, signature, queryStatus, permitted, selectedAccessId, retry]);
  if (!permitted) return null;
  const availability = deriveDeliveryAvailability({ gradeId, preview,
    query: queryStatus === 'loaded' ? { status: 'loaded', accesses } : { status: queryStatus },
    recoveries: recoveryScope === scope ? recoveries : {}, selectedAccessId: selectedAccessId || undefined, now });
  const available = availability.kind === 'available';
  const chosen = availability.selectedAccess;
  async function revalidate(): Promise<FeedbackCopiedAccess> {
    if (!chosen) throw new Error('No selected access');
    const fresh = await listFeedbackAccesses(evaluationId, signal, gradeId);
    if (!current()) throw new Error('Context changed');
    const active = fresh.filter(access => access.calificacion_id === gradeId && access.estado === 'active'
      && Date.parse(access.expires_at) > Date.now() && access.copy_available !== false);
    if (!active.some(access => access.id === chosen.id) || (active.length > 1 && selectedAccessId !== chosen.id)) throw new Error('Access changed');
    const results = await copyFeedbackAccesses(evaluationId, [chosen.id], signal);
    const result = results.length === 1 && results[0].id === chosen.id ? results[0] : undefined;
    if (!current() || !result?.url || (result.calificacion_id && result.calificacion_id !== gradeId)) throw new Error('Unavailable');
    return result;
  }
  async function act(channel: 'copy' | 'whatsapp' | 'native', trigger?: HTMLButtonElement) {
    if (availability.kind !== 'available' || disabled || lock.current || !current()) return;
    // WhatsApp/native use their prevalidated message synchronously, preserving
    // the browser gesture. Copy revalidates again and has a manual fallback.
    const message = buildIndividualFeedbackMessage({ studentName, evaluationName, url: availability.url });
    if (channel === 'whatsapp') { window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer'); return; }
    if (channel === 'native') { const result = await shareFeedbackMessage(message, navigator); if (current() && result.status === 'error') setNotice('No pudimos abrir Compartir. Puedes copiar el mensaje.'); return; }
    copyFocus.current = trigger ?? null;
    lock.current = true; setBusy(true); onBusy(true); setNotice('');
    try {
      const result = await revalidate();
      if (!current()) return;
      const text = buildIndividualFeedbackMessage({ studentName, evaluationName, url: result.url! });
      try { await navigator.clipboard.writeText(text); if (current()) setNotice('Enlace copiado. Entrégalo solo a este estudiante o su familia.'); }
      catch { if (current()) setNotice('El navegador no permitió copiar. Selecciona el enlace y cópialo manualmente.'); }
    } catch {
      if (current()) { setRecoveries({ [chosen!.id]: { status: 'error', error: 'No pudimos recuperar su enlace.' } }); setNotice('No pudimos recuperar su enlace. Reintenta.'); }
    } finally { lock.current = false; if (mounted.current && valid() && useAuth.getState().user?.id === owner) { setBusy(false); onBusy(false); } }
  }
  const retryRead = () => { setRetry(value => value + 1); onRetry(); };
  return <section aria-label="Enlace para el estudiante" className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-2 p-4 max-sm:px-[12px] [overflow-wrap:anywhere]">
    <h3 className="font-bold">Enlace para el estudiante</h3>
    <p role="status" className="text-sm font-semibold">{availability.label}</p>
    {availability.kind === 'query_error' && <p className="text-sm text-muted">No pudimos consultar su enlace. Reintenta.</p>}
    {availability.kind === 'attention' && <p className="text-sm text-muted">{availability.cause === 'multiple' ? 'Hay varios enlaces vigentes. Elige cuál quieres copiar.' : availability.cause === 'legacy_unrecoverable' ? 'Este enlace antiguo no permite recuperar su copia. Puedes reemplazarlo desde sus opciones.' : 'No pudimos recuperar su enlace. Reintenta.'}</p>}
    {available && <>
      <p className="text-sm text-muted">Vence <time dateTime={chosen!.expires_at}>{new Date(chosen!.expires_at).toLocaleString('es-CO')}</time></p>
      <label className="block text-xs font-semibold text-muted">Enlace del estudiante<textarea aria-label="Enlace del estudiante" readOnly value={availability.url} rows={2} className="mt-1 w-full resize-none rounded-lg border border-border bg-surface p-3 text-sm font-normal text-fg" onFocus={event => event.currentTarget.select()} /></label>
      <div className="flex flex-wrap gap-2"><Button className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" disabled={disabled || busy} onClick={event => void act('copy', event.currentTarget)}><Copy className="h-4 w-4 shrink-0" aria-hidden="true" />Copiar enlace</Button><Button className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" variant="outline" disabled={disabled || busy} onClick={() => void act('whatsapp')}>WhatsApp</Button>{typeof navigator.share === 'function' && <Button className="h-auto min-h-11 max-w-full whitespace-normal px-[12px] py-2 [overflow-wrap:normal]" variant="outline" disabled={disabled || busy} onClick={() => void act('native')}><Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />Compartir</Button>}</div>
    </>}
    {availability.kind === 'ready_to_generate' && <Button disabled={disabled || busy} onClick={onGenerate}><Link2 className="h-4 w-4" aria-hidden="true" />Generar enlace</Button>}
    {availability.kind === 'needs_review' && <Button variant="outline" disabled={disabled || busy} onClick={onReview}>Revisar</Button>}
    {availability.kind === 'needs_resend' && <Button variant="outline" disabled={disabled || busy} onClick={onReview}>Revisar y aprobar</Button>}
    {(availability.kind === 'query_error' || availability.kind === 'attention') && <Button variant="outline" disabled={disabled || busy} onClick={retryRead}>Reintentar</Button>}
    {availability.kind === 'attention' && availability.candidates.length > 1 && <label className="block text-sm">Elige el enlace vigente<select aria-label="Elegir enlace vigente" value={selectedAccessId} disabled={disabled || busy} onChange={event => setSelectedAccessId(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3"><option value="">Seleccionar enlace</option>{availability.candidates.map(access => <option key={access.id} value={access.id}>{access.id.slice(0, 8)} · vence {new Date(access.expires_at).toLocaleString('es-CO')}</option>)}</select></label>}
    {['expired', 'disabled', 'attention'].includes(availability.kind) && <Button variant="link" disabled={disabled || busy} onClick={onManage}>Opciones del enlace</Button>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
  </section>;
}
