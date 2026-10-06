import { useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Copy, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import type { RosterConfirmation } from './rosterImportApi';

export function RosterCredentials({ result, renewed = false }: { result: RosterConfirmation; renewed?: boolean }) {
  const userId = useAuth((state) => state.user?.id);
  const [owner] = useState(userId);
  const [selected, setSelected] = useState(() => result.credenciales.map((item) => item.estudiante_id));
  const [printing, setPrinting] = useState(false);
  const permitted = Boolean(owner) && owner === userId;
  const credentials = result.credenciales.filter((item) => selected.includes(item.estudiante_id));
  const text = credentials.map((item) => [item.nombre, 'Usuario: ' + item.email, 'Clave temporal: ' + item.password_temporal].join('\n')).join('\n\n');
  useEffect(() => {
    const done = () => { document.body.classList.remove('roster-printing'); setPrinting(false); };
    window.addEventListener('afterprint', done);
    return () => { window.removeEventListener('afterprint', done); document.body.classList.remove('roster-printing'); };
  }, []);
  useEffect(() => { if (!permitted) { document.body.classList.remove('roster-printing'); setPrinting(false); } }, [permitted]);
  async function copy() {
    try { await navigator.clipboard.writeText(text); toast.success('Accesos copiados'); }
    catch { toast.error('No fue posible copiar. Puedes imprimir las fichas.'); }
  }
  function print() {
    flushSync(() => setPrinting(true));
    document.body.classList.add('roster-printing');
    try { window.print(); }
    catch { document.body.classList.remove('roster-printing'); setPrinting(false); toast.error('No fue posible abrir la impresión.'); }
  }
  if (!permitted) return null;
  return <div className="space-y-4">
    <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"><strong>{renewed ? 'Clave renovada.' : `${result.creados} cuentas creadas.`}</strong> {result.credenciales.length ? 'Entrega estas claves en privado. No volverán a mostrarse.' : 'El registro ya se confirmó. Las claves anteriores no se pueden recuperar; puedes renovar una explícitamente desde el estudiante.'}</div>
    {Boolean(result.credenciales.length) && <>
      <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => setSelected(result.credenciales.map((item) => item.estudiante_id))}>Todos</Button><Button type="button" variant="outline" disabled={!credentials.length} onClick={() => void copy()}><Copy className="h-4 w-4" /> Copiar seleccionados</Button><Button type="button" variant="outline" disabled={!credentials.length} onClick={print}><Printer className="h-4 w-4" /> Imprimir seleccionados</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">{result.credenciales.map((item) => <article key={item.estudiante_id} className="rounded-xl border border-border p-4"><label className="flex min-h-11 items-center gap-3 font-bold"><input type="checkbox" aria-label={'Seleccionar ' + item.nombre} checked={selected.includes(item.estudiante_id)} onChange={(event) => { const checked = event.target.checked; setSelected((current) => checked ? [...current, item.estudiante_id] : current.filter((id) => id !== item.estudiante_id)); }} />{item.nombre}</label><p className="mt-2 break-all text-sm"><strong>Usuario:</strong> {item.email}</p><p className="mt-1 break-all text-sm"><strong>Clave temporal:</strong> {item.password_temporal}</p></article>)}</div>
    </>}
    {printing && createPortal(<div id="roster-private-print" aria-hidden="true"><h1>Accesos de XCalificator</h1>{credentials.map((item) => <article key={item.estudiante_id}><h2>{item.nombre}</h2><p>Ingresa en {window.location.origin}/login</p><p>Usuario: {item.email}</p><p>Clave temporal: {item.password_temporal}</p><p>Cambia tu clave al entrar. No compartas esta ficha.</p></article>)}</div>, document.body)}
  </div>;
}
