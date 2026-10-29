import { useId, useRef, useState } from 'react';
import { Check, Pencil, ShieldAlert } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';
import { toApiError } from '@/lib/api';
import type { Calificacion, GradeFinalAdjustment } from '@/types/api';

type GradeSnapshot = Pick<Calificacion, 'id' | 'nota_sugerida' | 'nota_confirmada' | 'estado' | 'updated_at'> & { desglose?: { version: number } | null };
const display = (value: number) => new Intl.NumberFormat('es', { maximumFractionDigits: 2, useGrouping: false }).format(value);

export function GradeFinalEditor({ grade, maximum, onCancel, onSave }: {
  grade: GradeSnapshot; maximum: number; onCancel: () => void;
  onSave: (change: GradeFinalAdjustment) => Promise<unknown>;
}) {
  const id = useId();
  const original = grade.nota_confirmada ?? grade.nota_sugerida;
  const initial = original == null ? '' : display(Number(original));
  const [value, setValue] = useState(initial);
  const [edited, setEdited] = useState(false);
  const [comment, setComment] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const operation = useRef<{ intent: string; id: string } | null>(null);
  const normalized = value.trim().replace(',', '.');
  const number = Number(normalized);
  const valid = /^\d+(?:\.\d{1,2})?$/.test(normalized) && Number.isFinite(number) && number >= 0 && number <= maximum;
  const changed = edited && number !== (original == null ? null : Number(original));
  const published = grade.estado === 'publicada';
  const canSave = valid && changed && (!published || acknowledged);

  async function save() {
    if (!canSave || savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setError('');
    try {
      const intent = JSON.stringify([number, comment.trim()]);
      if (operation.current?.intent !== intent) {
        const requestId = globalThis.crypto?.randomUUID?.();
        if (!requestId) throw new Error('No pudimos preparar el guardado. Usa un navegador actualizado y vuelve a intentarlo.');
        operation.current = { intent, id: requestId };
      }
      await onSave({ nota_confirmada: number, observacion: comment.trim(),
        actualizado_en_esperado: grade.updated_at, version_desglose_esperada: grade.desglose?.version ?? null,
        operacion_id: operation.current.id });
    } catch (cause) {
      const parsed = toApiError(cause);
      setError(parsed.status === 409 ? 'La calificación cambió. Conservamos tu borrador: cancela para recargar y comparar antes de guardar.' : parsed.detail);
    } finally {
      savingRef.current = false; setSaving(false);
    }
  }

  return <section aria-labelledby={`${id}-title`} className="min-w-0 space-y-4 rounded-2xl border border-brand-300 bg-surface p-4 shadow-sm dark:border-brand-500/50 sm:p-5" data-testid="grade-final-editor">
    <div className="flex items-start gap-2"><Pencil className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" /><div><h3 id={`${id}-title`} className="font-bold">Editar nota final</h3><p className="mt-1 text-sm leading-6 text-muted">Escribe la nota que deseas dejar. Los puntos por pregunta, las evidencias y el análisis original se conservan.</p></div></div>
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div><label htmlFor={`${id}-score`} className="mb-1 block text-sm font-semibold">Nota final</label><Input autoFocus id={`${id}-score`} type="text" inputMode="decimal" autoComplete="off" value={value} disabled={saving} aria-describedby={`${id}-scale`} aria-invalid={edited && !valid} onChange={(event) => { setEdited(true); setValue(event.target.value); setError(''); }} className="min-h-12 text-lg font-bold" /><p id={`${id}-scale`} className="mt-1 text-xs text-muted">De 0 a {display(maximum)}. Puedes usar coma o punto, con hasta dos decimales.</p></div>
      {edited && !valid && <p role="alert" className="text-sm text-rose-700 dark:text-rose-200">Escribe una nota de 0 a {display(maximum)}, con un máximo de dos decimales.</p>}
      <div className="rounded-xl border border-border bg-surface-2 p-3" aria-live="polite"><p className="text-xs text-muted">Nota actual → nueva nota</p><p className="mt-2 text-xl font-bold">{original == null ? '—' : display(Number(original))} → {valid ? display(number) : '—'} <span className="text-sm font-normal text-muted">/ {display(maximum)}</span></p></div>
    </div>
    <div><label htmlFor={`${id}-comment`} className="mb-1 block text-sm font-semibold">Comentario (opcional)</label><Textarea id={`${id}-comment`} rows={2} maxLength={2000} value={comment} disabled={saving} className="text-base" onChange={(event) => setComment(event.target.value)} placeholder="Si quieres, explica al estudiante por qué ajustaste la nota." /></div>
    {published && <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"><p className="flex gap-2"><ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" /><span>Al guardar, esta nota quedará ajustada. Deberás volver a publicar y los enlaces anteriores afectados quedarán suspendidos.</span></p><label className="flex min-h-11 cursor-pointer items-center gap-2"><input type="checkbox" checked={acknowledged} disabled={saving} onChange={(event) => setAcknowledged(event.target.checked)} className="h-5 w-5 shrink-0" />Entiendo y deseo cambiar la nota publicada.</label></div>}
    {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:bg-rose-500/10 dark:text-rose-100">{error}</p>}
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel} disabled={saving} className="min-h-11">Cancelar</Button><Button type="button" onClick={() => void save()} disabled={!canSave || saving} loading={saving} className="min-h-11"><Check className="h-4 w-4" aria-hidden="true" />Guardar nota</Button></div>
  </section>;
}
