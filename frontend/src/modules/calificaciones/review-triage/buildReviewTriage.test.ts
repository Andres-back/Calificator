import { describe, expect, it } from 'vitest';
import type { GradeBreakdownData, GradeComponentData } from '@/types/api';
import { buildReviewTriage, classifyReviewComponent, describeReviewBlocker, hasVerifierReviewSignals } from './buildReviewTriage';

const component = (overrides: Partial<GradeComponentData> = {}): GradeComponentData => ({
  id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta 1',
  respuesta_estudiante: 'Respuesta', respuesta_referencia: 'Referencia', puntos_obtenidos: 1,
  puntos_maximos: 1, estado: 'correcta', explicacion: 'La respuesta coincide con la referencia.',
  origen: 'consenso_ia', requiere_revision: false, evidencia_paginas: [1],
  valoraciones: [
    { evaluador: 'A', puntaje: 1, estado: 'correcta', confianza: 0.92 },
    { evaluador: 'B', puntaje: 1, estado: 'correcta', confianza: 0.89 },
  ],
  ...overrides,
});

const breakdown = (componentes: GradeComponentData[]): GradeBreakdownData => ({
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: false, formula: { puntos_obtenidos: 1, puntos_posibles: 1, nota_maxima: 5,
    nota_base: 5, ajuste_global: 0, nota_antes_redondeo: 5, regla_redondeo: 'half_up', decimales: 2, nota_final: 5 },
  componentes, created_at: '2026-09-19T00:00:00Z',
});

describe('classifyReviewComponent', () => {
  it('bloquea una respuesta marcada, ilegible, no evaluable o sin puntaje', () => {
    for (const candidate of [
      component({ requiere_revision: true }),
      component({ estado: 'ilegible' }),
      component({ estado: 'no_evaluable' }),
      component({ puntos_obtenidos: null }),
    ]) {
      expect(classifyReviewComponent(candidate).level).toBe('blocked');
    }
  });

  it('prioriza bloqueos sobre señales de atención y no duplica razones', () => {
    const result = classifyReviewComponent(component({
      requiere_revision: true, puntos_obtenidos: null, explicacion: '',
      valoraciones: [{ evaluador: 'A', puntaje: 0, estado: 'incorrecta', confianza: 0.4 }],
    }));
    expect(result.level).toBe('blocked');
    expect(new Set(result.reasons.map((reason) => reason.code)).size).toBe(result.reasons.length);
  });

  it('prioriza en rojo baja confianza y contradicciones y en amarillo información insuficiente', () => {
    expect(classifyReviewComponent(component({
      valoraciones: [
        { evaluador: 'A', puntaje: 1, estado: 'correcta', confianza: 0.95 },
        { evaluador: 'B', puntaje: 0, estado: 'incorrecta', confianza: 0.92 },
      ],
    }))).toMatchObject({ level: 'blocked' });
    expect(classifyReviewComponent(component({ valoraciones: [{ evaluador: 'A', puntaje: 1, estado: 'correcta', confianza: 0.4 }] }))).toMatchObject({ level: 'blocked' });
    expect(classifyReviewComponent(component({ explicacion: '  ' }))).toMatchObject({ level: 'attention' });
    expect(classifyReviewComponent(component({ valoraciones: [] }))).toMatchObject({ level: 'attention' });
  });

  it.each([
    [0.69, 'blocked'], [0.7, 'attention'], [0.84, 'attention'], [0.85, 'safe'],
    [85, 'safe'], [69, 'blocked'], [null, 'attention'], ['', 'attention'],
    [true, 'attention'], [101, 'attention'], [-1, 'attention'], ['NaN', 'attention'],
  ])('normaliza confianza %s sin inventar seguridad: %s', (confidence, level) => {
    expect(classifyReviewComponent(component({ valoraciones: [
      { puntaje: 1, estado: 'correcta', confianza: confidence },
      { puntaje: 1, estado: 'correcta', confianza: 0.95 },
    ] })).level).toBe(level);
  });

  it('una valoración alta no sustituye una segunda comprobación', () => {
    expect(classifyReviewComponent(component({ valoraciones: [{ puntaje: 1, estado: 'correcta', confianza: 0.99 }] })).level).toBe('attention');
  });

  it('una diferencia pequeña sigue amarilla y datos de puntaje inválidos son rojos', () => {
    expect(classifyReviewComponent(component({ valoraciones: [
      { puntaje: 1, estado: 'correcta', confianza: 0.95 },
      { puntaje: 0.95, estado: 'parcial', confianza: 0.95 },
    ] })).level).toBe('attention');
    for (const points of ['', '-1', '2', 'Infinity']) {
      expect(classifyReviewComponent(component({ puntos_obtenidos: points })).level).toBe('blocked');
    }
  });

  it('la corrección individual docente distingue valoraciones iniciales sin limpiar nuevas banderas', () => {
    const reviewed = component({ origen: 'docente', valoraciones: [{ puntaje: 1, confianza: 0.2 }] });
    expect(classifyReviewComponent(reviewed).level).toBe('safe');
    expect(classifyReviewComponent({ ...reviewed, requiere_revision: true }).level).toBe('blocked');
  });

  it('clasifica cien preguntas sin modificar el contenido ni perder motivos', () => {
    const input = breakdown(Array.from({ length: 100 }, (_, index) => component({
      id: `p${index}`, clave: `pregunta:${index}`, orden: index, numero: String(index),
      requiere_revision: index % 3 === 0,
    })));
    const before = JSON.stringify(input);
    const result = buildReviewTriage(input);
    expect(result.items).toHaveLength(100);
    expect(result.counts).toEqual({ safe: 66, attention: 0, blocked: 34 });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('no confunde el desempeño incorrecto, parcial o sin respuesta con incertidumbre', () => {
    for (const estado of ['incorrecta', 'parcial', 'sin_respuesta']) {
      expect(classifyReviewComponent(component({ estado })).level).toBe('safe');
    }
  });
});

describe('buildReviewTriage', () => {
  it('preserva motivos originales, sin desglose y sin certificar exactitud', () => {
    const raw = 'feedback_quality:nota_global_no_coincide_con_suma';
    const result = buildReviewTriage({ ...breakdown([component()]), bloqueos: [raw] });
    expect(result.globalReasons).toContain(raw);
    expect(result.counts).toEqual({ safe: 1, attention: 0, blocked: 0 });
    expect(describeReviewBlocker(raw)).toMatchObject({ target: 'revision', action: 'Revisar puntajes por pregunta' });
    expect(buildReviewTriage(null).items).toEqual([]);
    expect(describeReviewBlocker('aviso_nuevo')).toMatchObject({ message: 'Hay información que debes comprobar antes de confirmar la nota.' });
  });
  it('produce grupos exclusivos y ordena bloqueadas antes que atención', () => {
    const safe = component({ id: 'safe', clave: 'pregunta:1', orden: 0 });
    const attention = component({ id: 'attention', clave: 'pregunta:2', orden: 1, valoraciones: [] });
    const blocked = component({ id: 'blocked', clave: 'pregunta:3', orden: 2, estado: 'ilegible' });
    const result = buildReviewTriage(breakdown([safe, attention, blocked]));
    expect(result.counts).toEqual({ safe: 1, attention: 1, blocked: 1 });
    expect(result.exceptions.map((item) => item.component.id)).toEqual(['blocked', 'attention']);
    expect(result.items).toHaveLength(3);
  });

  it('mantiene los bloqueos globales separados de la clasificación por respuesta', () => {
    const result = buildReviewTriage({ ...breakdown([component()]), cobertura_estado: 'incompleta', bloqueos: ['hoja_faltante'] });
    expect(result.counts.safe).toBe(1);
    expect(result.globalBlockers).toEqual(expect.arrayContaining(['Cobertura incompleta', 'hoja faltante']));
  });

  it('envía a atención las preguntas nombradas por el verificador y conserva alertas generales', () => {
    const result = buildReviewTriage(breakdown([
      component({ id: 'p1', numero: '1', orden: 0 }),
      component({ id: 'p2', numero: '2', orden: 1 }),
      component({ id: 'p3', numero: '3', orden: 2 }),
    ]), [
      'Revisar la respuesta de la pregunta 3 y la pregunta 2.',
      'La clave general requiere validación docente.',
    ]);

    expect(result.counts).toEqual({ safe: 1, attention: 2, blocked: 0 });
    expect(result.attention.map((item) => item.component.numero)).toEqual(['2', '3']);
    expect(result.globalBlockers).toContain('La clave general requiere validación docente.');
  });

  it('detecta revisión del verificador aunque la nota numérica coincida', () => {
    expect(hasVerifierReviewSignals({ alertas: ['Revisar clave'] }, {})).toBe(true);
    expect(hasVerifierReviewSignals({ requiere_revision_docente: true }, {})).toBe(true);
    expect(hasVerifierReviewSignals({}, { arbiter_reason: 'verifier_requested' })).toBe(true);
    expect(hasVerifierReviewSignals({}, { arbiter_reason: null })).toBe(false);
  });
});
