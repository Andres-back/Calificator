import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { GradeBreakdownData, GradeFormulaData } from '@/types/api';
import { bulkMarkPreview, questionList, type BulkMarkState } from './bulkQuestionMark';

type Component = GradeBreakdownData['componentes'][number];

const OPTIONS: Record<BulkMarkState, { label: string; one: string; many: string; icon: typeof CheckCircle2; classes: string }> = {
  correcta: { label: 'Marcar correctas', one: 'correcta', many: 'correctas', icon: CheckCircle2, classes: 'border-emerald-500 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-100' },
  incorrecta: { label: 'Marcar incorrectas', one: 'incorrecta', many: 'incorrectas', icon: XCircle, classes: 'border-rose-500 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-100' },
};

/** Spec 215: elegir el resultado de las preguntas seleccionadas y confirmarlo viendo la nota. */
export function BulkMarkPanel({ formula, questions, selected, pending, saving, onSelectAll, onClear, onChoose, onBack, onConfirm, onCancel }: {
  formula: GradeFormulaData;
  /** Las preguntas que se pueden marcar, en el orden de la evaluación. */
  questions: Component[];
  selected: ReadonlySet<string>;
  /** Resultado elegido que espera confirmación. */
  pending: BulkMarkState | null;
  saving?: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onChoose: (state: BulkMarkState) => void;
  onBack: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const chosen = questions.filter((question) => selected.has(question.id));
  const count = chosen.length;
  const all = count === questions.length;
  const preview = pending ? bulkMarkPreview(formula, questions, selected, pending) : null;

  return (
    <div role="group" aria-label="Marcar varias preguntas" data-testid="bulk-mark-panel" className="space-y-3 rounded-2xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/10 sm:p-4">
      {pending && preview ? <>
        <p role="status" className="text-base font-bold text-fg">
          {count === 1
            ? `La pregunta ${questionList(chosen)} quedará ${OPTIONS[pending].one}.`
            : `${count} preguntas quedarán ${OPTIONS[pending].many}: ${questionList(chosen)}.`}
        </p>
        <p data-testid="bulk-mark-preview" className="text-base text-fg">
          Nota: {preview.current} → <strong>{preview.next}</strong>
        </p>
        <p className="text-sm text-muted">El estudiante verá una explicación corta en cada una. Después puedes abrir una pregunta y ampliarla.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>Volver</Button>
          <Button type="button" className="flex-1 basis-40" onClick={onConfirm} loading={saving} loadingLabel="Guardando…">Confirmar</Button>
        </div>
      </> : <>
        <p className="text-base font-bold text-fg">Toca los números de las preguntas que quieres marcar.</p>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p aria-live="polite" className="text-sm font-semibold tabular-nums text-fg">
            {count === 0 ? 'Ninguna pregunta seleccionada' : count === 1 ? '1 pregunta seleccionada' : `${count} preguntas seleccionadas`}
          </p>
          <button type="button" onClick={all ? onClear : onSelectAll} className="focus-ring min-h-11 rounded-lg px-2 text-sm font-semibold text-brand-700 underline underline-offset-4 dark:text-brand-200">
            {all ? 'Quitar selección' : 'Seleccionar todas'}
          </button>
        </div>
        <div className="grid gap-2 min-[480px]:grid-cols-2">
          {(Object.keys(OPTIONS) as BulkMarkState[]).map((state) => {
            const { label, icon: Icon, classes } = OPTIONS[state];
            return (
              <button key={state} type="button" disabled={count === 0} onClick={() => onChoose(state)}
                className={cn('focus-ring flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', classes)}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />{label}
              </button>
            );
          })}
        </div>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </>}
    </div>
  );
}
