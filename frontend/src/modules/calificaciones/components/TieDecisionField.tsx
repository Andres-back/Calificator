import { useId } from 'react';
import type { TieDecision } from '@/types/api';
import type { TieOptions } from '../gradePresentation';

/** Spec 150: la decisión del empate siempre es del docente; ninguna opción viene marcada. */
export function TieDecisionField({ score, options, value, onChange, disabled = false }: {
  score: number | string;
  options: TieOptions;
  value: TieDecision | null;
  onChange: (decision: TieDecision) => void;
  disabled?: boolean;
}) {
  const name = useId();
  const choices: TieDecision[] = ['abajo', 'arriba'];
  return <fieldset disabled={disabled} className="min-w-0 space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
    <legend className="px-1 font-bold">¿Queda en {options.abajo} o en {options.arriba}?</legend>
    <p>La nota {Number(score).toFixed(2)} está justo en el empate del umbral de aprobación. La nota exacta se conserva y tu decisión queda en el historial.</p>
    <div className="flex flex-wrap gap-2">
      {choices.map((choice) => <label key={choice} className="flex min-h-11 min-w-20 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 font-semibold text-fg">
        <input type="radio" name={name} className="h-5 w-5 shrink-0" checked={value === choice} onChange={() => onChange(choice)} />
        {options[choice]}
      </label>)}
    </div>
  </fieldset>;
}
