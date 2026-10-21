import { useState } from 'react';
import { Button } from '@/components/ui';

export function IndividualLinks({ links }: { links: { id: string; estudiante: string; url: string; expires_at?: string }[] }) {
  const [message, setMessage] = useState('');
  async function copy(name: string, url: string) {
    try { await navigator.clipboard.writeText(url); setMessage(`Enlace de ${name} copiado. Entrégalo solo a su destinatario.`); }
    catch { setMessage('No pudimos copiar. Selecciona el enlace individual y cópialo manualmente.'); }
  }
  if (!links.length) return null;
  return <section className="space-y-3" aria-label="Enlaces recién preparados">
    <h3 className="font-bold">Entrega cada enlace por separado</h3>
    <p className="text-sm text-muted">Quien reciba un enlace podrá abrirlo mientras esté activo. No envíes esta lista al grupo. Copia los enlaces antes de cerrar; después tendrás que reemplazarlos si los pierdes.</p>
    <ul className="space-y-3">{links.map(link => <li key={link.id} className="min-w-0 rounded-xl border border-border p-3">
      <p className="break-words font-semibold">{link.estudiante}</p>
      {link.expires_at && <p className="mt-1 text-sm text-muted">Vence: {new Date(link.expires_at).toLocaleString()}</p>}
      <Button className="mt-2 h-auto min-h-11 py-2" variant="outline" aria-label={'Copiar enlace de ' + link.estudiante} onClick={() => void copy(link.estudiante, link.url)}>Copiar enlace</Button>
      <details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-sm">Ver enlace para copiar manualmente</summary><p className="select-all break-all text-sm">{link.url}</p></details>
    </li>)}</ul>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
