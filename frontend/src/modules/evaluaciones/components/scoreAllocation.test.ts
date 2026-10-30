import { describe, expect, it } from 'vitest';
import { compileScorePlan, formatAllocationScore, type ScorePlan } from './scoreAllocation';

const keys = Array.from({ length: 9 }, (_, index) => `pregunta:${index + 1}`);
const example = (): ScorePlan => ({ schema_version: 1, modo: 'bloques', grupos: [
  { id: 'a', titulo: '1 a 5', claves: keys.slice(0, 5), presupuesto: '2', fijados: {} },
  { id: 'b', titulo: '6 a 9', claves: keys.slice(5), presupuesto: '3', fijados: {} },
] });

describe('137 reparto exacto de puntos', () => {
  it('rangos colectivos 2 y 3 sin multiplicar de nuevo ni modificar la entrada', () => {
    const plan = example(); const before = structuredClone(plan);
    const result = compileScorePlan(plan, keys, '5');
    expect(Object.values(result)).toEqual([...Array(5).fill('0.4'), ...Array(4).fill('0.75')]);
    expect(plan).toEqual(before);
  });
  it('siete ABCD comparten 2,50 y dos abiertas 2,50 sin perder residuos', () => {
    const plan = example();
    plan.grupos[0] = { ...plan.grupos[0], claves: keys.slice(0, 7), presupuesto: '2,50' };
    plan.grupos[1] = { ...plan.grupos[1], claves: keys.slice(7), presupuesto: '2,50' };
    expect(Object.values(compileScorePlan(plan, keys, '5'))).toEqual(['0.3572', '0.3572', '0.3572', '0.3571', '0.3571', '0.3571', '0.3571', '1.25', '1.25']);
  });
  it('fijar una pregunta solo redistribuye su bloque', () => {
    const plan = example(); plan.grupos[0].fijados[keys[0]] = '0,9';
    expect(Object.values(compileScorePlan(plan, keys, '5'))).toEqual(['0.9', '0.275', '0.275', '0.275', '0.275', '0.75', '0.75', '0.75', '0.75']);
  });
  it.each(['overlap', 'missing', 'overspent', 'zero', 'precision'])('rechaza %s sin normalizar silenciosamente', condition => {
    const plan = example();
    if (condition === 'overlap') plan.grupos[1].claves.push(keys[0]);
    if (condition === 'missing') plan.grupos[0].claves.pop();
    if (condition === 'overspent') plan.grupos[0].fijados[keys[0]] = '2';
    if (condition === 'zero') plan.grupos[0].presupuesto = '0';
    if (condition === 'precision') plan.grupos[0].presupuesto = '.00001';
    expect(() => compileScorePlan(plan, keys, '5')).toThrow();
  });
  it('muestra decimales reales sin ceros finales o artefactos flotantes', () => {
    expect(formatAllocationScore('1.2500')).toBe('1,25');
    expect(formatAllocationScore('0.0000')).toBe('0');
    expect(formatAllocationScore('0.3571')).toBe('0,3571');
  });
});
