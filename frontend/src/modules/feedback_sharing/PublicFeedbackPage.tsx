import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPublicFeedbackClient, FeedbackAccessError, type PublicFeedback } from './publicApi';
import { PublicFeedbackChat } from './PublicFeedbackChat';
import { installFeedbackPrivacy } from './privacy';
import { PublicFeedbackEvidence } from './PublicFeedbackEvidence';

function tokenFromHash() { return window.location.hash.slice(1); }
function showNumber(value: string | null) {
  if (value == null || value.trim() === '' || !Number.isFinite(Number(value))) return '—';
  return String(Math.round(Number(value) * 100) / 100);
}
export function PublicFeedbackPage() {
  const [token, setToken] = useState(tokenFromHash);
  useEffect(() => {
    const changed = () => setToken(tokenFromHash());
    window.addEventListener('hashchange', changed); window.addEventListener('popstate', changed);
    installFeedbackPrivacy();
    return () => { window.removeEventListener('hashchange', changed); window.removeEventListener('popstate', changed); };
  }, []);
  return <main className="min-h-dvh bg-bg px-4 py-6 text-fg sm:py-10">
    <div className="mx-auto max-w-3xl space-y-5 [overflow-wrap:anywhere]">
      <p className="text-sm font-bold text-brand-600">XCalificator · Tu devolución</p>
      {/^[A-Za-z0-9_-]{43}$/.test(token) ? <FeedbackSession key={token} token={token} /> : <Unavailable />}
    </div>
  </main>;
}
function Unavailable() { return <section role="status" className="rounded-2xl border border-border bg-surface p-5">Este enlace no está disponible. Pide a tu profesor que lo revise.</section>; }

function FeedbackSession({ token }: { token: string }) {
  const client = useMemo(() => createPublicFeedbackClient(token), [token]);
  const [result, setResult] = useState<PublicFeedback | null>(null);
  const [error, setError] = useState<FeedbackAccessError | null>(null);
  const [reload, setReload] = useState(0);
  const [closed, setClosed] = useState(false);
  const close = useCallback(() => { setResult(null); setClosed(true); }, []);
  useEffect(() => {
    if (closed) return;
    let active = true;
    let controller = new AbortController();
    let deadline: ReturnType<typeof setTimeout>;
    let serial = 0;
    async function read() {
      controller.abort(); controller = new AbortController(); const current = ++serial;
      try {
        const data = await client.read(controller.signal);
        if (!active || current !== serial) return;
        const remaining = Date.parse(data.expires_at) - Date.parse(data.server_now);
        if (!Number.isFinite(remaining) || remaining <= 0) { setClosed(true); return; }
        setResult(data); setError(null);
        clearTimeout(deadline);
        const receivedAt = performance.now();
        function expire() {
          if (!active) return;
          const left = remaining - (performance.now() - receivedAt);
          if (left <= 0) close();
          else deadline = setTimeout(expire, Math.min(left, 2147483647));
        }
        deadline = setTimeout(expire, Math.min(remaining, 2147483647));
      } catch (reason) {
        if (!active || current !== serial) return;
        setResult(null); clearTimeout(deadline);
        if (reason instanceof FeedbackAccessError && reason.status === 404) setClosed(true);
        setError(reason instanceof FeedbackAccessError ? reason : new FeedbackAccessError(0));
      }
    }
    void read();
    const focus = () => { if (document.visibilityState !== 'hidden') void read(); };
    const refresh = setInterval(focus, 30000);
    window.addEventListener('focus', focus); window.addEventListener('pageshow', focus); document.addEventListener('visibilitychange', focus);
    return () => { active = false; controller.abort(); clearTimeout(deadline); clearInterval(refresh); window.removeEventListener('focus', focus); window.removeEventListener('pageshow', focus); document.removeEventListener('visibilitychange', focus); };
  }, [client, reload, closed, close]);

  if (closed || error?.status === 404) return <Unavailable />;
  if (error) return <section role="alert" className="space-y-4 rounded-2xl border border-border bg-surface p-5"><p>{error.message}</p><button className="min-h-11 rounded-xl border border-border px-4" onClick={() => setReload(value => value + 1)}>Volver a intentar</button></section>;
  if (!result) return <p role="status">Abriendo tu devolución…</p>;
  const data = result.resultado;
  return <>
    <header className="space-y-2 rounded-2xl border border-border bg-surface p-5">
      <h1 className="text-xl font-bold sm:text-2xl">{data.estudiante}</h1>
      <p className="font-semibold">{data.evaluacion}</p><p className="text-sm text-muted">{data.materia}</p>
      <p className="text-xs text-muted">Disponible hasta {new Date(result.expires_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</p>
    </header>
    <section aria-labelledby="shared-grade" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <h2 id="shared-grade" className="font-bold">Tu nota</h2>
      <p className="text-4xl font-bold">{showNumber(data.nota)} <span className="text-lg font-normal text-muted">/ {showNumber(data.nota_maxima)}</span></p>
      <p className="text-sm leading-6">{data.explicacion}</p>
    </section>
    {result.evidencia_disponible && <PublicFeedbackEvidence client={client} onUnavailable={close} />}
    <section aria-labelledby="shared-feedback" className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <h2 id="shared-feedback" className="font-bold">Qué lograste y cómo seguir</h2>
      <p className="whitespace-pre-wrap leading-7">{data.retroalimentacion}</p>
    </section>
    {data.respuestas.length > 0 && <details className="rounded-2xl border border-border bg-surface p-5">
      <summary className="min-h-11 cursor-pointer font-bold">Ver respuestas y puntajes</summary>
      <ol className="mt-3 space-y-4">{data.respuestas.map((answer, index) => <li key={index} className="space-y-2 border-t border-border pt-3">
        <h3 className="font-semibold">{answer.numero || index + 1}. {answer.titulo}</h3>
        <p className="text-sm">Puntaje: {showNumber(answer.puntos_obtenidos)} / {showNumber(answer.puntos_maximos)}</p>
        {answer.respuesta_estudiante && <p className="whitespace-pre-wrap text-sm"><strong>Tu respuesta: </strong>{answer.respuesta_estudiante}</p>}
        {answer.explicacion && <p className="whitespace-pre-wrap text-sm">{answer.explicacion}</p>}
        {answer.orientacion_mejora && <p className="whitespace-pre-wrap text-sm">{answer.orientacion_mejora}</p>}
        {data.claves_liberadas && answer.respuesta_referencia && <p className="whitespace-pre-wrap text-sm"><strong>Respuesta de referencia: </strong>{answer.respuesta_referencia}</p>}
      </li>)}</ol>
    </details>}
    <details className="rounded-2xl border border-border bg-surface p-5"><summary className="min-h-11 cursor-pointer font-bold">Pregúntale a Xali</summary>
      <PublicFeedbackChat client={client} quota={result.cupo} onUnavailable={close} />
    </details>
    <p className="text-xs leading-5 text-muted">Enlace privado para este resultado. No lo compartas con otras personas. Si necesitas corregir la nota, habla con tu docente.</p>
  </>;
}
