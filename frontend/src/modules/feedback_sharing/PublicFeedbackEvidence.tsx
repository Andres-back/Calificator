import { useEffect, useState } from 'react';
import { FeedbackAccessError, type PublicFeedbackClient } from './publicApi';

export function PublicFeedbackEvidence({ client, onUnavailable }: { client: PublicFeedbackClient; onUnavailable: () => void }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    let objectUrl = '';
    setUrl(''); setFailed(false);
    client.evidence(page, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(result.blob); setUrl(objectUrl); setPages(result.pages);
    }).catch(reason => {
      if (controller.signal.aborted) return;
      if (reason instanceof FeedbackAccessError && reason.status === 404) onUnavailable();
      else setFailed(true);
    });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [client, page, open, retry, onUnavailable]);
  return <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
    <button className="min-h-11 font-semibold" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Ocultar foto de tu entrega' : 'Ver foto de tu entrega'}</button>
    {open && <>
      {failed ? <div role="alert"><p>No pudimos abrir la foto. Tu nota y devolución siguen disponibles.</p><button className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Volver a abrir foto</button></div>
        : url ? <img src={url} alt={`Tu entrega, hoja ${page}`} className="h-auto w-full rounded-xl" referrerPolicy="no-referrer" /> : <p role="status">Abriendo foto…</p>}
      {pages > 1 && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><button className="min-h-11 rounded-xl border border-border px-3" disabled={page <= 1 || !url} onClick={() => setPage(value => value - 1)}>Hoja anterior</button><span>Hoja {page} de {pages}</span><button className="min-h-11 rounded-xl border border-border px-3" disabled={page >= pages || !url} onClick={() => setPage(value => value + 1)}>Hoja siguiente</button></div>}
    </>}
  </section>;
}
