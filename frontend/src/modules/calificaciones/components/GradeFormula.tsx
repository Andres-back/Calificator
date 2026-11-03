import { useId } from 'react';
import type { GradeFormulaData } from '@/types/api';
import { formatScoreInput, type GradeCalculationPresentation } from './gradeCalculationPresentation';

function exact(value: number | string) {
  return formatScoreInput(value);
}

function result(value: number | string, decimals: number) {
  return Number(value).toFixed(Number.isInteger(decimals) && decimals >= 0 && decimals <= 10 ? decimals : 2);
}

function numeric(value: unknown): boolean {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')) && Number.isFinite(Number(value));
}

export function GradeFormula({ formula, adjustmentDetail, calculation }: { formula: GradeFormulaData; adjustmentDetail?: { valor: number | string; motivo_interno?: string; explicacion_estudiante?: string } | null; calculation?: GradeCalculationPresentation }) {
  const titleId = useId();
  if (![formula.puntos_obtenidos, formula.puntos_posibles, formula.nota_maxima, formula.nota_base, formula.ajuste_global, formula.nota_final].every(numeric)
    || Number(formula.puntos_posibles) <= 0 || Number(formula.nota_maxima) <= 0) {
    return <p className="py-3 text-sm text-muted">No están guardados todos los datos necesarios para explicar el cálculo de esta nota.</p>;
  }
  const adjustment = Number(formula.ajuste_global);
  const final = result(formula.nota_final, formula.decimales);
  const before = formula.nota_antes_redondeo;
  const signedAdjustment = `${adjustment > 0 ? '+' : ''}${exact(formula.ajuste_global)}`;
  return (
    <section aria-labelledby={titleId} className="space-y-3 border-t border-border py-4 text-sm leading-6">
      <h3 id={titleId} className="font-bold text-fg">Cómo se obtiene la nota</h3>
      {calculation?.provisional && <p className="text-amber-800 dark:text-amber-200">{calculation.explanation}</p>}
      <dl className="divide-y divide-border">
        <div className="flex flex-wrap justify-between gap-x-4 py-2">
          <dt className="text-muted">Puntos por respuestas</dt>
          <dd className="font-semibold tabular-nums">{exact(formula.puntos_obtenidos)} / {exact(formula.puntos_posibles)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-4 py-2">
          <dt className="text-muted">Nota en la escala de la evaluación</dt>
          <dd className="font-semibold tabular-nums">{exact(formula.nota_base)} / {exact(formula.nota_maxima)}</dd>
        </div>
        {adjustment !== 0 && <div className="flex flex-wrap justify-between gap-x-4 py-2">
          <dt className="text-muted">Ajuste docente registrado</dt><dd className="font-semibold tabular-nums">{signedAdjustment}</dd>
        </div>}
        <div className="flex flex-wrap justify-between gap-x-4 py-2">
          <dt className="font-semibold">{calculation?.provisional ? calculation.label : 'Resultado del cálculo'}</dt>
          <dd className="font-bold tabular-nums text-brand-700 dark:text-brand-200">{final} / {exact(formula.nota_maxima)}</dd>
        </div>
      </dl>
      <p className="text-muted">({exact(formula.puntos_obtenidos)} ÷ {exact(formula.puntos_posibles)}) × {exact(formula.nota_maxima)} da la nota en la escala de la evaluación.</p>
      {adjustment !== 0 && <p className="text-muted">{adjustmentDetail?.motivo_interno || adjustmentDetail?.explicacion_estudiante || 'Sin motivo de ajuste registrado.'}</p>}
      {numeric(before) && formula.regla_redondeo === 'half_up' && Number.isInteger(formula.decimales) && formula.decimales >= 0 && formula.decimales <= 10 && <p className="text-muted">
        {adjustment !== 0 ? `Tras aplicar el ajuste y el límite de la escala (0 a ${exact(formula.nota_maxima)}),` : 'En el registro,'} la nota antes de redondear es {exact(before)}. Redondeada a {formula.decimales} {formula.decimales === 1 ? 'decimal' : 'decimales'}: <strong>{final}</strong>.
      </p>}
    </section>
  );
}
