import { useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Copy, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import type { RosterConfirmation } from './rosterImportApi';
import { downloadCsv } from '@/lib/csvExport';

type Access = { estudiante_id: string; nombre: string; email: string; password_temporal?: string };

export function RosterCredentials({ result, renewed = false, students, subjectName = 'XCalificator' }: { result: RosterConfirmation; renewed?: boolean; students?: Access[]; subjectName?: string }) {
  const currentUser = useAuth((state) => state.user);
  const userId = currentUser?.id;
  const [owner] = useState(userId);
  const entries = students ?? result.credenciales;
  const [selected, setSelected] = useState(() => entries.map((item) => item.estudiante_id));
  const [printing, setPrinting] = useState(false);
  const permitted = Boolean(owner) && owner === userId && Boolean(currentUser?.permissions?.includes('subjects.update'));
  const credentials = entries.filter((item) => selected.includes(item.estudiante_id));
  const keyLabel = (item: Access) => item.password_temporal ? 'Clave temporal: ' + item.password_temporal : 'Clave no disponible: usa tu clave actual.';
  const text = credentials.map((item) => [item.nombre, 'Usuario: ' + item.email, keyLabel(item)].join('\n')).join('\n\n');
  function download() {
    try {
      downloadCsv('Accesos-' + subjectName, [['Nombre', 'Usuario', 'Clave temporal'], ...credentials.map(item => [item.nombre, item.email, item.password_temporal ?? ''])]);
      toast.success('Descarga de accesos preparada');
    } catch { toast.error('No fue posible descargar. Puedes copiar o imprimir.'); }
  }
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
    <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"><strong>{students ? 'Usuarios del grupo.' : renewed ? 'Clave renovada.' : `${result.creados} cuentas creadas.`}</strong> {result.credenciales.length ? 'Entrega estas claves en privado. No volverán a mostrarse.' : 'Las claves anteriores no se pueden recuperar. Usa «Nueva clave» junto al estudiante únicamente si necesitas renovarla; esto cambia su acceso en todas las materias.'}</div>
    <p className="text-sm text-muted">Archivo privado: entrega cada ficha individualmente. Los usuarios internos no son buzones de correo. Descargar no cambia claves.</p>
    {Boolean(entries.length) && <>
      <p className="text-sm font-semibold">{credentials.length} de {entries.length} estudiantes seleccionados</p>
      <div className="flex flex-wrap gap-2"><Button type="button" className="min-h-11" variant="outline" onClick={() => setSelected(entries.map((item) => item.estudiante_id))}>Todos</Button><Button type="button" className="min-h-11" variant="outline" onClick={() => setSelected([])}>Ninguno</Button><Button type="button" className="min-h-11" variant="outline" disabled={!credentials.length} onClick={() => void copy()}><Copy className="h-4 w-4" /> Copiar seleccionados</Button><Button type="button" className="min-h-11" variant="outline" disabled={!credentials.length} onClick={download}><Download className="h-4 w-4" /> Descargar accesos CSV</Button><Button type="button" className="min-h-11" variant="outline" disabled={!credentials.length} onClick={print}><Printer className="h-4 w-4" /> Imprimir seleccionados</Button></div>
      <div className="grid gap-3 sm:grid-cols-2">{entries.map((item) => <article key={item.estudiante_id} className="min-w-0 rounded-xl border border-border p-4"><label className="flex min-h-11 items-center gap-3 break-words font-bold"><input type="checkbox" aria-label={'Seleccionar ' + item.nombre} checked={selected.includes(item.estudiante_id)} onChange={(event) => { const checked = event.target.checked; setSelected((current) => checked ? [...current, item.estudiante_id] : current.filter((id) => id !== item.estudiante_id)); }} />{item.nombre}</label><p className="mt-2 break-all text-sm"><strong>Usuario:</strong> {item.email}</p><p className="mt-1 break-all text-sm">{keyLabel(item)}</p></article>)}</div>
    </>}
    {printing && createPortal(<div id="roster-private-print" aria-hidden="true"><h1>Accesos de XCalificator</h1>{credentials.map((item) => <article key={item.estudiante_id}><h2>{item.nombre}</h2><p>Ingresa en {window.location.origin}/login</p><p>Usuario: {item.email}</p><p>{keyLabel(item)}</p><p>{item.password_temporal ? 'Cambia tu clave al entrar. ' : ''}No compartas esta ficha.</p></article>)}</div>, document.body)}
  </div>;
}
