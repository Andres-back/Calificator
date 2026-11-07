import { describe, expect, it } from 'vitest';
import { adjustOtherScores, parseScoreInput, scoreSummary } from './scoreEditing';

const total = (scores: number[]) => Math.round(scores.reduce((sum, score) => sum + score, 0) * 10000) / 10000;

describe('parseScoreInput', () => {
  it.each([['0,5', 0.5], ['0.5', 0.5], [' 2 ', 2], ['1,25', 1.25], [',5', 0.5], ['0,1234', 0.1234]])('lee %s', (text, value) => {
    expect(parseScoreInput(text)).toBe(value);
  });
  it.each(['', '  ', 'abc', '1,2,3', '-1', '1e2', '0,12345'])('rechaza %s como cero', text => {
    expect(parseScoreInput(text)).toBe(0);
  });
});

describe('scoreSummary', () => {
  it('indica lo que sobra', () => {
    expect(scoreSummary([1, 1, 1, 1, 1, 1], 5)).toEqual({ total: 6, difference: 1, matches: false });
  });
  it('indica lo que falta', () => {
    expect(scoreSummary([2, 2.5], 5)).toEqual({ total: 4.5, difference: -0.5, matches: false });
  });
  it('coincide sin errores de coma flotante', () => {
    expect(scoreSummary([0.1, 0.2, 4.7], 5)).toEqual({ total: 5, difference: 0, matches: true });
  });
  it('acepta la misma tolerancia que el servidor', () => {
    expect(scoreSummary([1.6667, 1.6667, 1.6667], 5).matches).toBe(true);
  });
});

describe('adjustOtherScores', () => {
  it('reparte lo restante y conserva la pregunta abierta', () => {
    expect(adjustOtherScores([1, 1, 1, 1, 1, 1], 5, 5)).toEqual([0.8, 0.8, 0.8, 0.8, 0.8, 1]);
  });
  it('mantiene la proporción de las demás', () => {
    expect(adjustOtherScores([2, 2, 1, 1], 3, 5)).toEqual([1.6, 1.6, 0.8, 1]);
  });
  it('la suma es exacta aunque la división no lo sea', () => {
    const result = adjustOtherScores([1, 1, 1, 0.5], 3, 5);
    expect(result).not.toBeNull();
    expect(total(result as number[])).toBe(5);
    expect((result as number[])[3]).toBe(0.5);
  });
  it('funciona con decimales en la pregunta abierta', () => {
    const result = adjustOtherScores([1, 1, 1.2345], 2, 5) as number[];
    expect(total(result)).toBe(5);
    expect(result[2]).toBe(1.2345);
  });
  it('reparte por igual si las demás valen cero', () => {
    expect(adjustOtherScores([0, 0, 1], 2, 5)).toEqual([2, 2, 1]);
  });
  it('da a cada una al menos 0,01', () => {
    const result = adjustOtherScores([100, 0.01, 1], 2, 2) as number[];
    expect(result[1]).toBeGreaterThanOrEqual(0.01);
    expect(total(result)).toBe(2);
  });
  it('no modifica la lista recibida', () => {
    const scores = [1, 1, 1];
    adjustOtherScores(scores, 2, 5);
    expect(scores).toEqual([1, 1, 1]);
  });
  it.each([
    ['no deja puntos', [1, 1, 5], 2, 5],
    ['supera la nota', [1, 1, 6], 2, 5],
    ['no alcanza para 0,01 por pregunta', [1, 1, 4.995], 2, 5],
    ['la pregunta abierta es inválida', [1, 1, 0], 2, 5],
    ['es la única pregunta', [1], 0, 5],
  ])('devuelve null si %s', (_name, scores, index, maximum) => {
    expect(adjustOtherScores(scores as number[], index as number, maximum as number)).toBeNull();
  });
});
