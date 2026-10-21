import { useEffect, useRef, useState } from 'react';
import { FeedbackAccessError, type FeedbackQuota, type FeedbackReply, type PublicFeedbackClient } from './publicApi';

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
  const [messages, setMessages] = useState<{ question: string; answer: string }[]>([]);
  const lifetime = useRef({ active: true, abort: new AbortController() });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inFlight = useRef(false);
  const polls = useRef(0);
  const close = useRef(onUnavailable);
  close.current = onUnavailable;

  useEffect(() => {
    const current = { active: true, abort: new AbortController() };
    lifetime.current = current;
    return () => { current.active = false; current.abort.abort(); clearTimeout(timer.current); };
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
        setError('Ya usaste tus 5 preguntas. Puedes seguir leyendo tu devolución.');
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
    if (result.status === 'succeeded' && result.respuesta) {
      setMessages(values => [...values.slice(-9), { question: item.message, answer: result.respuesta! }]);
      setPending(null); setMessage(''); setRetry(false); return;
    }
    if (result.status === 'failed' || result.status === 'succeeded') {
      setError(result.mensaje || 'Xali no pudo responder esta vez. Tu devolución sigue disponible.');
      setPending(null); setMessage(''); return;
    }
    const accepted = { ...item, id: result.request_id, accepted: true };
    setPending(accepted);
    if (++polls.current >= 45) { setRetry(true); setError('Está tardando más de lo habitual. Puedes consultar el avance sin volver a enviar.'); return; }
    timer.current = setTimeout(() => { void send(accepted); }, 2000);
  }

  return <section className="space-y-4" aria-label="Conversación con Xali">
    <p className="text-sm text-muted">Pregunta por esta nota o por cómo practicar. Xali no cambia notas.</p>
    <p className="text-sm font-semibold" aria-live="polite">{remaining} de 5 preguntas disponibles</p>
    {wait > 0 && <p role="status" className="text-sm">Podrás preguntar de nuevo en {wait} segundos. Puedes seguir leyendo tu devolución.</p>}
    <div className="space-y-3" aria-live="polite">{messages.map((item, index) => <article key={index} className="space-y-2 rounded-xl border border-border p-3 [overflow-wrap:anywhere]">
      <p className="whitespace-pre-wrap text-sm"><strong>Tu pregunta: </strong>{item.question}</p>
      <p className="whitespace-pre-wrap leading-7"><strong>Respuesta de Xali: </strong>{item.answer}</p>
    </article>)}</div>
    {pending?.accepted && !retry && <p role="status" className="text-sm">Xali está preparando tu respuesta. Puedes seguir leyendo tu devolución.</p>}
    {error && <p role="alert" className="rounded-xl border border-amber-300 p-3 text-sm">{error}</p>}
    {retry && pending && <button type="button" className={buttonClass} disabled={busy} onClick={() => { polls.current = 0; void send(pending); }}>{pending.accepted ? 'Consultar avance' : 'Comprobar envío'}</button>}
    <form className="space-y-3" onSubmit={event => {
      event.preventDefault();
      if (!message.trim() || pending || busy || remaining <= 0 || wait > 0) return;
      const item = { id: crypto.randomUUID(), message: message.trim(), accepted: false };
      setPending(item); polls.current = 0; void send(item);
    }}>
      <label className="block space-y-2 text-sm font-semibold">Tu pregunta a Xali
        <textarea className="block min-h-28 w-full resize-y rounded-xl border border-border bg-surface p-3 text-base font-normal" maxLength={2000} value={message} disabled={Boolean(pending)} onChange={event => setMessage(event.target.value)} />
      </label>
      <button type="submit" className={`${buttonClass} w-full bg-brand-600 text-white sm:w-auto`} disabled={busy || Boolean(pending) || !message.trim() || remaining <= 0 || wait > 0}>Enviar pregunta</button>
    </form>
  </section>;
}
