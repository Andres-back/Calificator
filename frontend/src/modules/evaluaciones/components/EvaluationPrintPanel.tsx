import { useContext, useRef, useState } from 'react';
import { QueryClientContext } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { queryKeys } from '@/config/queryKeys';
import { toApiError } from '@/lib/api';
import type { Evaluacion, EvaluationPrintSettings as Settings } from '@/types/api';
import { updateEvaluacion } from '../api';
import { EvaluationPrintSettings } from './EvaluationPrintSettings';
import { EvaluationPrintPreparation } from './EvaluationPrintPreparation';

export function EvaluationPrintPanel({ evaluation, onSaved }: { evaluation: Evaluacion; onSaved: (value: Evaluacion) => void }) {
  const [draft, setDraft] = useState<Settings | null>(evaluation.configuracion_impresion ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const base = useRef(evaluation);
  const lock = useRef(false);
  const client = useContext(QueryClientContext);
  async function save() {
    if (!draft || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const updated = await updateEvaluacion(evaluation.id, { configuracion_impresion: draft,
        expected_updated_at: base.current.updated_at, expected_content_version_id: base.current.contenido_version_id ?? null });
      base.current = updated;
      setDraft(updated.configuracion_impresion ?? null);
      onSaved(updated);
      void client?.invalidateQueries({ queryKey: queryKeys.evaluaciones.all });
      void client?.invalidateQueries({ queryKey: queryKeys.evaluaciones.detail(updated.id) });
    } catch (failure) { setError(toApiError(failure).detail); }
    finally { lock.current = false; setBusy(false); }
  }
  return <details className="rounded-lg border border-border p-2"><summary className="focus-ring min-h-11 cursor-pointer py-2 text-sm font-semibold">Formato de impresión</summary>
    <div className="space-y-3"><EvaluationPrintSettings value={draft} onChange={setDraft} disabled={busy} />
      {error && <p role="alert" className="break-words text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      {draft && <EvaluationPrintPreparation key={base.current.updated_at} evaluation={base.current} settings={draft} onApply={setDraft} />}
      {draft && <Button type="button" className="min-h-11 w-full" onClick={save} loading={busy}>Guardar formato y actualizar vista</Button>}
      <p className="text-xs leading-5 text-muted">Preguntas, notas y originales se conservan. Revisa el color de las figuras desde el editor.</p>
    </div>
  </details>;
}
