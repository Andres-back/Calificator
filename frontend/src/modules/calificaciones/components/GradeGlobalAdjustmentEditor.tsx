import { useMemo, useState } from 'react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import type { GradeFormulaData } from '@/types/api';

export interface GradeGlobalAdjustmentChange {
  valor: number;
  motivo_interno: string;
  explicacion_estudiante: string;
}

function asNumber(value: number | string): number {
  return Number(value ?? 0);
}

export function GradeGlobalAdjustmentEditor({ formula, saving, onCancel, onSave }: {
  formula: GradeFormulaData;
  saving?: boolean;
  onCancel: () => void;
  onSave: (change: GradeGlobalAdjustmentChange) => void;
}) {
  const [value, setValue] = useState(String(formula.ajuste_global ?? 0));
  const [reason, setReason] = useState('');
  const [studentExplanation, setStudentExplanation] = useState('');
  const numeric = Number(value);
  const maximum = asNumber(formula.nota_maxima);
  const preview = useMemo(
    () => Math.min(maximum, Math.max(0, asNumber(formula.nota_base) + (Number.isFinite(numeric) ? numeric : 0))),
    [formula.nota_base, maximum, numeric],
  );
  const valid = Number.isFinite(numeric)
    && reason.trim().length >= 3
    && studentExplanation.trim().length >= 3;

  return (
    <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-500/10" aria-labelledby="global-adjustment-title">
      <div>
        <h3 id="global-adjustment-title" className="font-bold text-fg">Ajuste global excepcional</h3>
        <p className="mt-1 text-sm leading-6 text-muted">Se registra como una línea separada. No modifica ni oculta los puntos de cada respuesta.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ajuste a la nota" hint="Usa un valor positivo para sumar o negativo para restar." required>
          <Input type="number" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
        <div className="rounded-lg border border-border bg-surface p-3" aria-live="polite">
          <span className="block text-xs text-muted">Vista previa de nota final</span>
          <strong className="text-lg text-fg">{preview.toFixed(formula.decimales)} / {maximum.toFixed(1)}</strong>
        </div>
      </div>
      <Field label="Motivo interno" hint="Queda en el historial docente; no se muestra al estudiante." required>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
      </Field>
      <Field label="Explicación para el estudiante" required>
        <Textarea value={studentExplanation} onChange={(event) => setStudentExplanation(event.target.value)} rows={3} />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button
          type="button"
          disabled={!valid || saving}
          loading={saving}
          onClick={() => valid && onSave({ valor: numeric, motivo_interno: reason.trim(), explicacion_estudiante: studentExplanation.trim() })}
        >
          Guardar ajuste y recalcular
        </Button>
      </div>
    </section>
  );
}
