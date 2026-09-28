import type { GradeBreakdownData } from '@/types/api';

export type CriterionLearningState = 'logrado' | 'en_proceso' | 'necesita_apoyo';

export interface CriterionLearningSummary {
  key: string;
  nombre: string;
  puntosObtenidos: number;
  puntosMaximos: number;
  porcentaje: number;
  estado: CriterionLearningState;
}

function numeric(value: number | string | null | undefined): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function summarizeCriterionLearning(breakdown: GradeBreakdownData): CriterionLearningSummary[] {
  const grouped = new Map<string, Omit<CriterionLearningSummary, 'porcentaje' | 'estado'>>();

  for (const component of breakdown.componentes) {
    for (const criterion of component.criterios_aplicados ?? []) {
      const version = criterion.version_id ?? criterion.set_id ?? 'legacy';
      const key = `${version}:${criterion.stable_key}`;
      const current = grouped.get(key) ?? {
        key,
        nombre: criterion.nombre,
        puntosObtenidos: 0,
        puntosMaximos: 0,
      };
      current.puntosObtenidos += numeric(criterion.puntos_obtenidos ?? criterion.awarded_points);
      current.puntosMaximos += numeric(criterion.puntos_maximos ?? criterion.max_points);
      grouped.set(key, current);
    }
  }

  return [...grouped.values()]
    .filter((criterion) => criterion.puntosMaximos > 0)
    .map((criterion) => {
      const porcentaje = Math.max(0, Math.min(100, (criterion.puntosObtenidos / criterion.puntosMaximos) * 100));
      const estado: CriterionLearningState = porcentaje >= 80
        ? 'logrado'
        : porcentaje >= 60
          ? 'en_proceso'
          : 'necesita_apoyo';
      return { ...criterion, porcentaje, estado };
    })
    .sort((left, right) => left.nombre.localeCompare(right.nombre, 'es'));
}
