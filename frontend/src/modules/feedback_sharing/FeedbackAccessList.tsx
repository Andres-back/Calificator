import { useState } from 'react';
import { Button } from '@/components/ui';
import type { FeedbackAccess, FeedbackPreview, IssuedFeedbackAccess } from './api';
import { changeFeedbackAccess } from './api';
import { FeedbackLinkActions } from './FeedbackLinkActions';

const labels = { active: 'Activo', expired: 'Vencido', disabled: 'Desactivado', suspended: 'Necesita nueva autorización' };
export function FeedbackAccessList({ evaluationId, accesses, previews, signal, valid, onChanged, onIssued }: {
  evaluationId?: string;
  accesses: FeedbackAccess[]; previews: FeedbackPreview[]; signal: AbortSignal;
  valid: () => boolean; onChanged: () => Promise<void>;
  onIssued: (result: IssuedFeedbackAccess, name: string) => void;
}) {
  const [pending, setPending] = useState<{ access: FeedbackAccess; action: 'desactivar' | 'reactivar' | 'renovar'; requestId: string } | null>(null);
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function execute() {
    if (!pending || busy || !valid()) return;
    const { access, action, requestId } = pending;
    const preview = previews.find(item => item.calificacion_id === access.calificacion_id);
    if (action === 'reactivar' && !preview?.fingerprint) return;
    setBusy(true); setError('');
    try {
      const result = await changeFeedbackAccess(access, action, { expected_version: access.version, request_id: requestId,
        ...(action === 'renovar' ? { confirmar_reemplazo: true } : {}),
        ...(action === 'reactivar' ? { duracion_dias: days, fingerprint: preview!.fingerprint, evidencia: false } : {}),
      }, signal);
      if (!valid()) return;
      onIssued(result, access.estudiante);
      setPending(null);
      await onChanged();
    } catch { if (valid()) setError('No pudimos confirmar el cambio. Actualiza los enlaces para conocer su estado; puedes reintentar la misma acción sin duplicarla.'); }
    finally { if (valid()) setBusy(false); }
  }
  return <section className="space-y-3" aria-label="Control de enlaces">
    <h3 className="font-bold">Enlaces creados</h3>
    <Button variant="outline" disabled={busy} onClick={() => void onChanged()}>Actualizar enlaces</Button>
    {!accesses.length && <p className="text-sm text-muted">Todavía no hay enlaces creados para esta evaluación.</p>}
    <ul className="space-y-3">{accesses.map(access => <li key={access.id} className="min-w-0 rounded-xl border border-border p-3">
      <p className="break-words font-bold">{access.estudiante}</p>
      <p className="mt-1 text-sm">{labels[access.estado]} · Vence: {new Date(access.expires_at).toLocaleString()}</p>
      {evaluationId && <FeedbackLinkActions evaluationId={evaluationId} accesses={[access]} selectedIds={[access.calificacion_id]} signal={signal} valid={valid} disabled={busy} onBusy={setBusy} compact />}
      <div className="mt-2 flex flex-wrap gap-2">
        {access.estado === 'active' ? <Button variant="outline" disabled={busy} onClick={() => { setPending({ access, action: 'desactivar', requestId: crypto.randomUUID() }); setError(''); }}>Desactivar</Button>
          : <Button variant="outline" disabled={busy || !previews.some(item => item.calificacion_id === access.calificacion_id && item.elegible)} onClick={() => { setPending({ access, action: 'reactivar', requestId: crypto.randomUUID() }); setDays(3); setError(''); }}>Reactivar</Button>}
        <Button variant="outline" disabled={busy} onClick={() => { setPending({ access, action: 'renovar', requestId: crypto.randomUUID() }); setError(''); }}>Reemplazar enlace</Button>
      </div>
    </li>)}</ul>
    {pending && <div className="space-y-3 rounded-xl border border-amber-400 p-4">
      <p className="font-bold">{pending.access.estudiante}</p>
      <p className="text-sm">{pending.action === 'desactivar' ? 'Se cerrará el acceso a esta devolución. La nota y las evidencias no cambian.' : pending.action === 'renovar' ? 'El enlace anterior dejará de funcionar. Recibirás uno nuevo. Esto no amplía su duración ni reactiva un acceso cerrado.' : 'Autorizas de nuevo la nota y la retroalimentación que acabas de revisar. Se abrirá una nueva vigencia, sin reiniciar las preguntas usadas en los últimos diez minutos. La evidencia seguirá oculta.'}</p>
      {pending.action === 'reactivar' && <label className="block text-sm">Duración<select aria-label="Duración de reactivación" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={days} onChange={event => setDays(Number(event.target.value))}>{Array.from({ length: 30 }, (_, index) => index + 1).map(value => <option key={value} value={value}>{value} días</option>)}</select></label>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => setPending(null)}>Cancelar cambio</Button><Button loading={busy} onClick={() => void execute()}>Confirmar cambio</Button></div>
    </div>}
    {error && <p role="alert" className="text-sm">{error}</p>}
  </section>;
}
