import { describe, expect, it } from 'vitest';
import { formatScoreInput, gradeCalculationPresentation } from './gradeCalculationPresentation';
import type { GradeBreakdownData } from '@/types/api';

describe('presentación de puntajes sin cambiar valores', () => {
  it.each([['0.0000', '0'], ['0.7000', '0.7'], ['0.6250', '0.625'], ['5.0000', '5'], ['0.0001', '0.0001'], [null, ''], [-0, '0']])('normaliza %s a %s', (value, expected) => {
    expect(formatScoreInput(value)).toBe(expected);
    if (value != null) expect(Number(formatScoreInput(value)) === Number(value)).toBe(true);
  });
  it('no confunde cero con pendiente y explica dos preguntas sin puntaje', () => {
    const result = gradeCalculationPresentation({ cobertura_estado: 'incompleta', componentes: [
      { tipo: 'pregunta', puntos_obtenidos: 0 }, { tipo: 'pregunta', puntos_obtenidos: null }, { tipo: 'pregunta', puntos_obtenidos: null },
    ] } as GradeBreakdownData);
    expect(result.pending).toBe(2);
    expect(result.label).toBe('Cálculo provisional');
    expect(result.explanation).toContain('Faltan 2 preguntas por puntuar');
  });
  it('cobertura incompleta sin null no afirma que faltan cero preguntas', () => {
    const result = gradeCalculationPresentation({ cobertura_estado: 'incompleta', componentes: [] } as unknown as GradeBreakdownData);
    expect(result.label).toBe('Cálculo pendiente de revisión');
    expect(result.explanation).not.toContain('0');
  });
  it('distingue criterios y resultado completo', () => {
    expect(gradeCalculationPresentation({ cobertura_estado: 'completa', componentes: [{ tipo: 'rubrica', puntos_obtenidos: null }] } as GradeBreakdownData).explanation).toContain('Falta 1 criterio');
    expect(gradeCalculationPresentation({ cobertura_estado: 'completa', componentes: [] } as unknown as GradeBreakdownData).provisional).toBe(false);
  });
});
