import { Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui';
import type { RosterConfirmation } from './rosterImportApi';

export function RosterCredentials({ result }: { result: RosterConfirmation }) {
  const text = result.credenciales.map((item) => `${item.nombre}\nUsuario: ${item.email}\nClave temporal: ${item.password_temporal}`).join('\n\n');
  return <div className="space-y-4">
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"><strong>{result.creados} cuentas creadas.</strong> Guarda estas claves ahora: por seguridad no volverán a mostrarse.</div>
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(text)}><Copy className="h-4 w-4" /> Copiar todas</Button><Button type="button" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Imprimir</Button></div>
    <div className="grid gap-3 sm:grid-cols-2">{result.credenciales.map((item) => <article key={item.estudiante_id} className="rounded-xl border border-border p-4"><h3 className="font-bold">{item.nombre}</h3><p className="mt-2 break-all text-xs"><strong>Usuario:</strong> {item.email}</p><p className="mt-1 break-all text-xs"><strong>Clave temporal:</strong> {item.password_temporal}</p><Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => void navigator.clipboard.writeText(`${item.nombre}\nUsuario: ${item.email}\nClave temporal: ${item.password_temporal}`)}><Copy className="h-4 w-4" /> Copiar solo este acceso</Button></article>)}</div>
  </div>;
}
