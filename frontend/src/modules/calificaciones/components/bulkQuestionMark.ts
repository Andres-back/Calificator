import type { GradeBreakdownData, GradeComponentChange, GradeFormulaData } from '@/types/api';

/** Spec 215: estados que se pueden poner a varias preguntas a la vez. */
export type BulkMarkState = 'correcta' | 'incorrecta';
type Component = GradeBreakdownData['componentes'][number];

/** Frase que ve el estudiante cuando la pregunta cambió de resultado en un lote. */
export const BULK_EXPLANATIONS: Record<BulkMarkState, string> = {
  correcta: 'Tu profesor revisó esta respuesta y es correcta.',
  incorrecta: 'Tu profesor revisó esta respuesta y no es correcta.',
};

/** Motivo que queda en el historial; solo lo ve el docente. */
export const BULK_REASONS: Record<BulkMarkState, string> = {
  correcta: 'Marcada como correcta junto con otras preguntas.',
  incorrecta: 'Marcada como incorrecta junto con otras preguntas.',
};

/** Los criterios de rúbrica tienen niveles: se siguen ajustando de uno en uno. */
export function canBulkMark(component: Pick<Component, 'tipo'>) {
  return component.tipo === 'pregunta';
}

function targetPoints(component: Component, state: BulkMarkState) {
  return state === 'correcta' ? Number(component.puntos_maximos) : 0;
}

export function bulkMarkChanges(components: Component[], ids: ReadonlySet<string>, state: BulkMarkState): GradeComponentChange[] {
  return components.filter((component) => ids.has(component.id) && canBulkMark(component)).map((component) => {
    const points = targetPoints(component, state);
    const unchanged = component.estado === state && component.puntos_obtenidos != null && Number(component.puntos_obtenidos) === points;
    const current = (component.explicacion ?? '').trim();
    return {
      componente_id: component.id,
      puntos_obtenidos: points,
      estado: state,
      motivo_interno: BULK_REASONS[state],
      // Si la pregunta ya estaba así, su explicación sigue valiendo. Si cambia, la anterior ya no la describe.
      explicacion_estudiante: unchanged && current.length >= 3 ? current : BULK_EXPLANATIONS[state],
    };
  });
}

/** Nota antes y después, con la misma fórmula del editor de una pregunta. */
export function bulkMarkPreview(formula: GradeFormulaData, components: Component[], ids: ReadonlySet<string>, state: BulkMarkState) {
  const possible = Number(formula.puntos_posibles);
  const maxGrade = Number(formula.nota_maxima);
  const adjustment = Number(formula.ajuste_global);
  const gradeFor = (earned: number) => {
    const raw = possible > 0 ? (earned / possible) * maxGrade + adjustment : 0;
    return Math.min(maxGrade, Math.max(0, raw)).toFixed(formula.decimales);
  };
  const earned = Number(formula.puntos_obtenidos);
  const delta = components
    .filter((component) => ids.has(component.id) && canBulkMark(component))
    .reduce((sum, component) => sum + targetPoints(component, state) - Number(component.puntos_obtenidos ?? 0), 0);
  return { current: gradeFor(earned), next: gradeFor(earned + delta) };
}

/** «1, 3 y 5», para decir en una frase qué preguntas se van a marcar. */
export function questionList(components: Pick<Component, 'numero' | 'orden'>[]) {
  const numbers = components.map((component) => String(component.numero ?? component.orden + 1));
  if (numbers.length <= 1) return numbers.join('');
  return `${numbers.slice(0, -1).join(', ')} y ${numbers.at(-1)}`;
}
