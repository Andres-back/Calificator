import type { GradeFormulaData } from '@/types/api';

function number(value: number | string): number {
  return Number(value ?? 0);
}

export function GradeFormula({ formula, adjustmentDetail }: { formula: GradeFormulaData; adjustmentDetail?: { valor: number | string; motivo_interno?: string; explicacion_estudiante?: string } | null }) {
  return (
    <section aria-labelledby="grade-formula-title" className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
      <h3 id="grade-formula-title" className="font-bold text-fg">Cómo se obtiene la nota</h3>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-surface p-3">
          <span className="block text-xs text-muted">Puntos logrados</span>
          <strong className="text-lg">{number(formula.puntos_obtenidos).toFixed(2)} / {number(formula.puntos_posibles).toFixed(2)}</strong>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <span className="block text-xs text-muted">Nota proporcional</span>
          <strong className="text-lg">{number(formula.nota_base).toFixed(2)}</strong>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <span className="block text-xs text-muted">Nota final</span>
          <strong className="text-lg text-brand-700 dark:text-brand-200">{number(formula.nota_final).toFixed(formula.decimales)} / {number(formula.nota_maxima).toFixed(1)}</strong>
        </div>
      </div>
      {adjustmentDetail && number(formula.ajuste_global) !== 0 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-semibold text-fg">Ajuste docente: {number(formula.ajuste_global) > 0 ? '+' : ''}{number(formula.ajuste_global).toFixed(2)}</p>
          {adjustmentDetail.explicacion_estudiante && <p className="mt-1 text-muted">{adjustmentDetail.explicacion_estudiante}</p>}
          {adjustmentDetail.motivo_interno && <p className="mt-1 text-xs text-muted">Motivo interno: {adjustmentDetail.motivo_interno}</p>}
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-muted">
        ({number(formula.puntos_obtenidos).toFixed(2)} ÷ {number(formula.puntos_posibles).toFixed(2)}) × {number(formula.nota_maxima).toFixed(1)}
        {number(formula.ajuste_global) !== 0 ? ` ${number(formula.ajuste_global) > 0 ? '+' : '−'} ${Math.abs(number(formula.ajuste_global)).toFixed(2)}` : ''}
        {' '}= {number(formula.nota_final).toFixed(formula.decimales)}. Redondeo decimal estándar.
      </p>
    </section>
  );
}
