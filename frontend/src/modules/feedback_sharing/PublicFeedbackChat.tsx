import { useEffect, useRef, useState } from 'react';
import { History, Send, Sparkles } from 'lucide-react';
import { FeedbackAccessError, type FeedbackExchange, type FeedbackQuota, type FeedbackReply, type PublicFeedbackClient } from './publicApi';
import { FeedbackChatMessage } from './FeedbackChatMessage';

interface Props { client: PublicFeedbackClient; quota: FeedbackQuota; onUnavailable: () => void }
interface Pending { id: string; message: string; accepted: boolean }
const buttonClass = 'min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-50';

export function PublicFeedbackChat({ client, quota, onUnavailable }: Props) {
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(quota.restantes);
  const [wait, setWait] = useState(quota.retry_after_seconds);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<FeedbackExchange[]>([]);
  const [historyBusy, setHistoryBusy] = useState(Boolean(client.continuity?.()));
  const [historyError, setHistoryError] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const items = useRef<FeedbackExchange[]>([]);
  const lifetime = useRef({ active: true, abort: new AbortController() });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inFlight = useRef(false);
  const polls = useRef(0);
  const close = useRef(onUnavailable);
  close.current = onUnavailable;

  function merge(incoming: FeedbackExchange[]) {
    const combined = new Map(incoming.map(item => [item.request_id, item]));
    // A completed poll wins over an older history snapshot arriving later.
    for (const item of items.current) {
      const older = combined.get(item.request_id);
      if (!older || ['succeeded', 'failed', 'closed'].includes(item.status)) combined.set(item.request_id, item);
    }
    const sorted = [...combined.values()].sort((a, b) => a.accepted_at.localeCompare(b.accepted_at) || a.request_id.localeCompare(b.request_id));
    items.current = sorted; setMessages(sorted);
  }

  async function loadHistory(cursor?: string, current = lifetime.current) {
    if (!client.continuity?.()) return;
    setHistoryBusy(true); setHistoryError(false);
    try {
      const page = await client.history(cursor, current.abort.signal);
      if (!current.active) return;
      merge(page.items); setNextCursor(page.next_cursor);
      setRemaining(page.cupo.restantes); setWait(page.cupo.retry_after_seconds);
      if (!cursor && !inFlight.current) {
        const waiting = page.items.find(item => item.status === 'queued' || item.status === 'running');
        if (waiting) { const item = { id: waiting.request_id, message: waiting.pregunta, accepted: true }; setPending(item); polls.current = 0; void send(item); }
      }
    } catch (reason) {
      if (!current.active) return;
      if (reason instanceof FeedbackAccessError && reason.status === 404) { close.current(); return; }
      setHistoryError(true);
    } finally { if (current.active) setHistoryBusy(false); }
  }

  useEffect(() => {
    const current = { active: true, abort: new AbortController() };
    lifetime.current = current;
    items.current = []; setMessages([]); setPending(null); setError(''); setRetry(false); setNextCursor(null);
    void loadHistory(undefined, current);
    return () => { current.active = false; current.abort.abort(); clearTimeout(timer.current); };
    // A client is scoped to one access; the page remounts on revision changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);
  useEffect(() => { setRemaining(quota.restantes); setWait(quota.retry_after_seconds); }, [quota.restantes, quota.retry_after_seconds]);
  useEffect(() => {
    if (wait <= 0) return;
    const interval = setInterval(() => setWait(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [wait]);
  useEffect(() => {
    if (remaining !== 0 || wait !== 0) return;
    const controller = new AbortController();
    client.read(controller.signal).then(result => {
      if (!controller.signal.aborted) { setRemaining(result.cupo.restantes); setWait(result.cupo.retry_after_seconds); }
    }).catch(reason => { if (!controller.signal.aborted && reason instanceof FeedbackAccessError && reason.status === 404) close.current(); });
    return () => controller.abort();
  }, [client, remaining, wait]);

  async function send(item: Pending) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setRetry(false); setError('');
    const current = lifetime.current;
    try {
      const result = item.accepted ? await client.poll(item.id, current.abort.signal) : await client.ask(item.id, item.message, current.abort.signal);
      if (current.active) receive(result, item);
    } catch (reason) {
      if (!current.active) return;
      if (reason instanceof FeedbackAccessError && reason.status === 404) { close.current(); return; }
      if (reason instanceof FeedbackAccessError && reason.status === 429) {
        setRemaining(0); setWait(reason.retryAfter || 60); setPending(null);
        setError('Ya usaste tus 5 preguntas. Puedes seguir leyendo tu retroalimentación.');
      } else {
        // Aceptación incierta: conservar ID y texto. Solo reintento explícito.
        setPending(item); setRetry(true);
        setError(item.accepted ? 'No pudimos consultar el avance. Tu pregunta no se volverá a enviar.' : 'No pudimos confirmar el envío. Compruébalo antes de escribir otra pregunta.');
      }
    } finally {
      if (current.active) setBusy(false);
      inFlight.current = false;
    }
  }

  function receive(result: FeedbackReply, item: Pending) {
    setRemaining(result.cupo.restantes); setWait(result.cupo.retry_after_seconds);
    if (result.status === 'closed') { close.current(); return; }
    const previous = items.current.find(value => value.request_id === result.request_id);
    items.current = items.current.filter(value => value.request_id !== result.request_id);
    merge([{ request_id: result.request_id, pregunta: item.message, respuesta: result.respuesta, status: result.status,
      mensaje: result.mensaje, accepted_at: previous?.accepted_at ?? new Date().toISOString() }]);
    if (result.status === 'succeeded' && result.respuesta) {
      setPending(null); setMessage(''); setRetry(false); return;
    }
    if (result.status === 'failed' || result.status === 'succeeded') {
      setError(result.mensaje || 'Xali no pudo responder esta vez. Tu retroalimentación sigue disponible.');
      setPending(null); setMessage(''); return;
    }
    const accepted = { ...item, id: result.request_id, accepted: true };
    setPending(accepted);
    if (++polls.current >= 45) { setRetry(true); setError('Está tardando más de lo habitual. Puedes consultar el avance sin volver a enviar.'); return; }
    timer.current = setTimeout(() => { void send(accepted); }, 2000);
  }

  const continuity = client.continuity?.();
  return <section className="min-w-0 space-y-5" aria-label="Conversación con Xali">
    <header className="flex items-start gap-3 rounded-2xl border border-brand-300/30 bg-brand-500/5 p-3 sm:p-4">
      <Sparkles className="mt-1 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-200" aria-hidden="true" />
      <div className="min-w-0 space-y-1"><p className="font-bold">Aprende con tu retroalimentación</p><p className="text-sm leading-6 text-muted">Pregunta por esta nota o por cómo practicar. Xali no cambia notas.</p>
        <p className="text-xs leading-5 text-muted">{continuity?.persistent ? 'Tu conversación se recuerda en este navegador mientras el enlace y su revisión sigan vigentes. En un dispositivo compartido, cuida quién usa este navegador.' : 'Esta conversación es temporal: no podremos recuperarla si sales de esta visita.'}</p>
      </div>
    </header>
    <div className="flex flex-wrap items-center gap-3"><p className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold" aria-live="polite">{remaining} de 5 preguntas disponibles</p><span className="text-xs text-muted">El cupo se renueva durante los siguientes 10 minutos.</span></div>
    {wait > 0 && <p role="status" className="text-sm">Podrás preguntar de nuevo en {wait} segundos. Puedes seguir leyendo tu retroalimentación.</p>}
    {historyBusy && <p role="status" className="text-sm text-muted">Recuperando tu conversación…</p>}
    {historyError && <div role="alert" className="space-y-2 rounded-xl border border-amber-300 p-3 text-sm"><p>No pudimos recuperar tu conversación. Tu retroalimentación sigue disponible; no volveremos a enviar preguntas anteriores.</p><button type="button" className={buttonClass} disabled={historyBusy || busy} onClick={() => void loadHistory()}>Recuperar conversación</button></div>}
    {nextCursor && <button type="button" className={`${buttonClass} inline-flex items-center gap-2`} disabled={historyBusy || busy} onClick={() => void loadHistory(nextCursor)}><History className="h-4 w-4" aria-hidden="true" />Ver preguntas anteriores</button>}
    <div className="space-y-6" aria-live="polite">{messages.map(item => <div key={item.request_id}>
      <FeedbackChatMessage question={item.pregunta} answer={item.respuesta} />
      {item.status === 'failed' && <p className="mt-2 text-sm text-muted">{item.mensaje || 'No se obtuvo una respuesta. Tu retroalimentación sigue disponible.'}</p>}
      {['queued', 'running'].includes(item.status) && pending?.id !== item.request_id && <button type="button" className={buttonClass} disabled={busy || Boolean(pending)} onClick={() => { const value = { id: item.request_id, message: item.pregunta, accepted: true }; setPending(value); polls.current = 0; void send(value); }}>Consultar pregunta pendiente</button>}
    </div>)}</div>
    {pending?.accepted && !retry && <p role="status" className="text-sm">Xali está preparando tu respuesta. Puedes seguir leyendo tu retroalimentación.</p>}
    {error && <p role="alert" className="rounded-xl border border-amber-300 p-3 text-sm">{error}</p>}
    {retry && pending && <button type="button" className={buttonClass} disabled={busy} onClick={() => { polls.current = 0; void send(pending); }}>{pending.accepted ? 'Consultar avance' : 'Comprobar envío'}</button>}
    <form className="space-y-3 rounded-2xl border border-border bg-surface p-3 sm:p-4" onSubmit={event => {
      event.preventDefault();
      if (!message.trim() || pending || busy || historyBusy || remaining <= 0 || wait > 0) return;
      const item = { id: crypto.randomUUID(), message: message.trim(), accepted: false };
      setPending(item); polls.current = 0; void send(item);
    }}>
      <label className="block space-y-2 text-sm font-semibold">Tu pregunta a Xali
        <textarea className="block min-h-28 w-full resize-y rounded-xl border border-border bg-surface p-3 text-base font-normal" placeholder="Por ejemplo: ¿cómo puedo mejorar la pregunta 2?" maxLength={2000} value={message} disabled={Boolean(pending)} onChange={event => setMessage(event.target.value)} />
      </label>
      <button type="submit" className={`${buttonClass} inline-flex w-full items-center justify-center gap-2 bg-brand-600 text-white sm:w-auto`} disabled={busy || Boolean(pending) || historyBusy || !message.trim() || remaining <= 0 || wait > 0}><Send className="h-4 w-4" aria-hidden="true" />Enviar pregunta</button>
    </form>
  </section>;
}
