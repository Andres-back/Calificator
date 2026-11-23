import { describe, expect, it } from 'vitest';
import type { GradeBreakdownData } from '@/types/api';
import { BULK_EXPLANATIONS, BULK_REASONS, bulkMarkChanges, bulkMarkPreview, canBulkMark, questionList } from './bulkQuestionMark';

type Component = GradeBreakdownData['componentes'][number];

function component(id: string, overrides: Partial<Component> = {}): Component {
  const number = id.replace(/\D/g, '');
  return {
    id, clave: `pregunta:${number}`, orden: Number(number) - 1, tipo: 'pregunta', numero: number,
    titulo: `Pregunta ${number}`, respuesta_estudiante: 'x', respuesta_referencia: 'y',
    puntos_obtenidos: 0, puntos_maximos: 1, estado: 'incorrecta', explicacion: 'La opción marcada no coincide.',
    origen: 'consenso_ia', requiere_revision: false, evidencia_paginas: [1], valoraciones: [],
    ...overrides,
  };
}

const formula = { puntos_obtenidos: 1, puntos_posibles: 4, nota_maxima: 5, nota_base: 1.25, ajuste_global: 0, nota_antes_redondeo: 1.25, regla_redondeo: 'half_up', decimales: 2, nota_final: 1.25 };

describe('215 marcar varias preguntas', () => {
  it('correctas reciben el puntaje completo e incorrectas cero, con el motivo del lote', () => {
    const components = [component('p1'), component('p2', { puntos_maximos: '0.5556' }), component('p3')];

    const correct = bulkMarkChanges(components, new Set(['p1', 'p2']), 'correcta');
    expect(correct).toEqual([
      { componente_id: 'p1', puntos_obtenidos: 1, estado: 'correcta', motivo_interno: BULK_REASONS.correcta, explicacion_estudiante: BULK_EXPLANATIONS.correcta },
      { componente_id: 'p2', puntos_obtenidos: 0.5556, estado: 'correcta', motivo_interno: BULK_REASONS.correcta, explicacion_estudiante: BULK_EXPLANATIONS.correcta },
    ]);

    const wrong = bulkMarkChanges([component('p1', { estado: 'correcta', puntos_obtenidos: 1 })], new Set(['p1']), 'incorrecta');
    expect(wrong).toEqual([
      { componente_id: 'p1', puntos_obtenidos: 0, estado: 'incorrecta', motivo_interno: BULK_REASONS.incorrecta, explicacion_estudiante: BULK_EXPLANATIONS.incorrecta },
    ]);
  });

  it('una pregunta que ya estaba así conserva su explicación; si cambia o estaba pendiente, recibe la frase corta', () => {
    const components = [
      component('p1', { estado: 'incorrecta', puntos_obtenidos: 0, explicacion: 'Sumaste los denominadores.' }),
      component('p2', { estado: 'no_evaluable', puntos_obtenidos: null, explicacion: 'La foto no deja leer la respuesta.' }),
      component('p3', { estado: 'incorrecta', puntos_obtenidos: 0, explicacion: '  ' }),
    ];

    const changes = bulkMarkChanges(components, new Set(['p1', 'p2', 'p3']), 'incorrecta');

    expect(changes.map((change) => change.explicacion_estudiante)).toEqual(['Sumaste los denominadores.', BULK_EXPLANATIONS.incorrecta, BULK_EXPLANATIONS.incorrecta]);
    expect(changes.every((change) => change.motivo_interno.length >= 3 && change.explicacion_estudiante.length >= 3)).toBe(true);
  });

  it('los criterios de rúbrica no entran en el lote y el orden es el de la evaluación', () => {
    const rubric = component('p9', { tipo: 'rubrica' });
    const components = [component('p1'), rubric, component('p3')];

    expect(canBulkMark(rubric)).toBe(false);
    expect(bulkMarkChanges(components, new Set(['p3', 'p9', 'p1']), 'correcta').map((change) => change.componente_id)).toEqual(['p1', 'p3']);
  });

  it('anticipa la nota con la misma fórmula del editor de una pregunta', () => {
    const components = [
      component('p1', { estado: 'correcta', puntos_obtenidos: 1 }),
      component('p2', { estado: 'no_evaluable', puntos_obtenidos: null }),
      component('p3'),
      component('p4'),
    ];

    expect(bulkMarkPreview(formula, components, new Set(['p2', 'p3']), 'correcta')).toEqual({ current: '1.25', next: '3.75' });
    expect(bulkMarkPreview(formula, components, new Set(['p1']), 'incorrecta')).toEqual({ current: '1.25', next: '0.00' });
    // El ajuste global se respeta y la nota no pasa del máximo.
    expect(bulkMarkPreview({ ...formula, ajuste_global: 2 }, components, new Set(['p2', 'p3', 'p4']), 'correcta')).toEqual({ current: '3.25', next: '5.00' });
  });

  it('nombra las preguntas en una frase legible', () => {
    expect(questionList([component('p3')])).toBe('3');
    expect(questionList([component('p1'), component('p3')])).toBe('1 y 3');
    expect(questionList([component('p1'), component('p3'), component('p5')])).toBe('1, 3 y 5');
    expect(questionList([component('p1', { numero: null })])).toBe('1');
  });
});
