import type { GradeBreakdownData } from '@/types/api';

/** Presentation only: do not round an editable decimal or change its real maximum. */
export function formatScoreInput(value: number | string | null | undefined): string {
  if (value == null) return '';
  const raw = String(value);
  const formatted = /^-?\d+\.\d+$/.test(raw) ? raw.replace(/0+$/, '').replace(/\.$/, '') : raw;
  return formatted !== '' && Number(formatted) === 0 ? '0' : formatted;
}

export function gradeCalculationPresentation(breakdown: Pick<GradeBreakdownData, 'componentes' | 'cobertura_estado'>) {
  const missing = breakdown.componentes.filter((component) => component.puntos_obtenidos == null);
  const pending = missing.length;
  const provisional = pending > 0 || Boolean(breakdown.cobertura_estado && breakdown.cobertura_estado !== 'completa');
  const label = pending > 0 ? 'Cálculo provisional' : provisional ? 'Cálculo pendiente de revisión' : 'Cálculo por respuestas';
  const noun = missing.every((component) => component.tipo === 'pregunta')
    ? pending === 1 ? 'pregunta' : 'preguntas'
    : missing.every((component) => component.tipo !== 'pregunta')
      ? pending === 1 ? 'criterio' : 'criterios'
      : 'respuestas o criterios';
  const explanation = pending > 0
    ? `${pending === 1 ? 'Falta' : 'Faltan'} ${pending} ${noun} por puntuar. Este cálculo aún no es una nota final.`
    : provisional ? 'El desglose aún necesita revisión. Este cálculo no sustituye la nota que confirme el docente.' : '';
  return { pending, provisional, label, explanation };
}

export type GradeCalculationPresentation = ReturnType<typeof gradeCalculationPresentation>;
