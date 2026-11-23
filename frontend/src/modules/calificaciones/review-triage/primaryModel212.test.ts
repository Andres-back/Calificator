import { describe, expect, it } from 'vitest';
import type { GradeComponentData } from '@/types/api';
import { classifyReviewComponent } from './buildReviewTriage';

// Spec 212: si el verificador discrepa se usa el modelo principal; la pregunta pide atención, no bloquea.
const pregunta = (overrides: Partial<GradeComponentData> = {}): GradeComponentData => ({
  id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Explica la fotosíntesis',
  respuesta_estudiante: 'La planta usa luz y agua.', respuesta_referencia: 'Luz, agua y CO2', puntos_obtenidos: 2.5, puntos_maximos: 2.5,
  estado: 'correcta', explicacion: 'Explica la luz y el agua.', origen: 'modelo_principal', requiere_revision: false, evidencia_paginas: [1],
  valoraciones: [{ evaluador: 'A', puntaje: 2.5, estado: 'correcta', confianza: 0.9 }, { evaluador: 'B', puntaje: 1, estado: 'parcial', confianza: 0.4 }],
  ...overrides,
});

describe('212 desacuerdo resuelto con el modelo principal', () => {
  it('avisa lo que propuso el verificador sin bloquear la pregunta', () => {
    const item = classifyReviewComponent(pregunta());

    expect(item.level).toBe('attention');
    expect(item.reasons.map((reason) => reason.code)).toEqual(['primary_model_used']);
    expect(item.reasons[0].label).toBe('El verificador propuso 1 puntos; se usó la valoración del modelo principal');
  });

  it('dice cuando el verificador no pudo valorarla', () => {
    const item = classifyReviewComponent(pregunta({ valoraciones: [{ evaluador: 'A', puntaje: 2.5, estado: 'correcta', confianza: 0.9 }, { evaluador: 'B', estado: 'no_evaluable' }] }));

    expect(item.level).toBe('attention');
    expect(item.reasons[0].label).toBe('El verificador no pudo valorarla; se usó la valoración del modelo principal');
  });

  it('la baja confianza del modelo principal sí bloquea', () => {
    const item = classifyReviewComponent(pregunta({ valoraciones: [{ evaluador: 'A', puntaje: 2.5, estado: 'correcta', confianza: 0.5 }, { evaluador: 'B', puntaje: 1, estado: 'parcial', confianza: 0.9 }] }));

    expect(item.level).toBe('blocked');
    expect(item.reasons.map((reason) => reason.code)).toContain('low_confidence');
  });

  it('el desacuerdo sin la regla del modelo principal sigue bloqueando', () => {
    const item = classifyReviewComponent(pregunta({ origen: 'consenso_ia', valoraciones: [{ evaluador: 'A', puntaje: 2.5, estado: 'correcta', confianza: 0.9 }, { evaluador: 'B', puntaje: 1, estado: 'parcial', confianza: 0.9 }] }));

    expect(item.level).toBe('blocked');
    expect(item.reasons.map((reason) => reason.code)).toContain('valuation_disagreement');
  });
});
