import { describe, expect, it } from 'vitest';
import type { GradeBreakdownData, GradeComponentData } from '@/types/api';
import { buildReviewTriage, describeReviewBlocker, missingQuestionsInPhotos, photosWithoutAnswers } from './buildReviewTriage';

// Spec 207: una respuesta que no aparece en las fotos se nombra y lleva a la evidencia.
const pendiente = (numero: string, overrides: Partial<GradeComponentData> = {}): GradeComponentData => ({
  id: `p${numero}`, clave: `pregunta:${numero}`, orden: Number(numero) - 1, tipo: 'pregunta', numero, titulo: `Pregunta ${numero}`,
  respuesta_estudiante: '', respuesta_referencia: 'Referencia', puntos_obtenidos: null, puntos_maximos: 1.67,
  estado: 'revision_pendiente', explicacion: 'La valoración de esta respuesta no tiene consenso verificable.',
  origen: 'consenso_ia', requiere_revision: true, evidencia_paginas: [1],
  valoraciones: [{ evaluador: 'A', puntaje: 0, estado: 'sin_respuesta', confianza: 0.5 }, { evaluador: 'B', puntaje: 0, estado: 'no_evaluable' }],
  ...overrides,
});
const correcta = pendiente('1', { estado: 'correcta', puntos_obtenidos: 1.67, requiere_revision: false, respuesta_estudiante: 'La planta no podría hacer fotosíntesis.',
  valoraciones: [{ evaluador: 'A', puntaje: 1.67, estado: 'correcta', confianza: 0.95 }, { evaluador: 'B', puntaje: 1.67, estado: 'correcta', confianza: 0.95 }] });
const desglose = (componentes: GradeComponentData[]): GradeBreakdownData => ({
  id: 'd1', calificacion_id: 'c1', version: 2, origen: 'automatico', cobertura_estado: 'parcial', requiere_revision: true,
  formula: { puntos_obtenidos: 1.67, puntos_posibles: 5, nota_maxima: 5, nota_base: 1.67, ajuste_global: 0, nota_antes_redondeo: 1.67, regla_redondeo: 'half_up', decimales: 2, nota_final: 1.67 },
  componentes, created_at: '2026-11-20T00:00:00Z',
  bloqueos: ['componente_pendiente:pregunta:2', 'componente_pendiente:pregunta:3', 'cobertura_evidencia_incompleta'],
} as GradeBreakdownData);

describe('207 respuestas que no aparecen en las fotos', () => {
  it('lee las preguntas faltantes del resultado de la calificación', () => {
    expect(missingQuestionsInPhotos({ evidence_coverage: { faltantes: [2, 3], requiere_revision: true } })).toEqual(['2', '3']);
    expect(missingQuestionsInPhotos({ evidence_coverage: { faltantes: [2], requiere_revision: false } })).toEqual([]);
    expect(missingQuestionsInPhotos({})).toEqual([]);
    expect(missingQuestionsInPhotos(null)).toEqual([]);
    expect(missingQuestionsInPhotos({ evidence_coverage: { faltantes: ['<b>x</b>', 21] } })).toEqual(['21']);
  });

  it('el aviso general nombra las preguntas y lleva a la evidencia', () => {
    const resumen = buildReviewTriage(desglose([correcta, pendiente('2'), pendiente('3')]), [], ['2', '3']);

    expect(resumen.globalReasons).toContain('faltan_en_fotos:2,3');
    expect(resumen.globalReasons).not.toContain('cobertura_evidencia_incompleta');
    expect(resumen.globalReasons).not.toContain('Cobertura parcial');
    const aviso = describeReviewBlocker('faltan_en_fotos:2,3');
    expect(aviso.message).toBe('Las respuestas de las preguntas 2 y 3 no aparecen en las fotos.');
    expect(aviso.guidance).toMatch(/reverso/);
    expect(aviso).toMatchObject({ target: 'evidencia', action: 'Añadir la foto que falta' });
  });

  it('cada pregunta faltante muestra su motivo y las demás no cambian', () => {
    const resumen = buildReviewTriage(desglose([correcta, pendiente('2'), pendiente('3')]), [], ['2', '3']);
    const motivo = (numero: string) => resumen.items.find((item) => item.component.numero === numero)!.reasons.map((reason) => reason.code);

    expect(motivo('2')[0]).toBe('missing_in_photos');
    expect(motivo('3')).toContain('missing_in_photos');
    expect(motivo('1')).not.toContain('missing_in_photos');
  });

  it('una pregunta ya decidida por el docente no muestra el motivo ni entra en el aviso', () => {
    const decidida = pendiente('3', { origen: 'docente', requiere_revision: false, estado: 'correcta', puntos_obtenidos: 1.66 });
    const resumen = buildReviewTriage(desglose([correcta, pendiente('2'), decidida]), [], ['2', '3']);

    expect(resumen.items.find((item) => item.component.numero === '3')!.reasons.map((reason) => reason.code)).not.toContain('missing_in_photos');
    expect(resumen.globalReasons).toContain('faltan_en_fotos:2');
    expect(describeReviewBlocker('faltan_en_fotos:2').message).toBe('La respuesta de la pregunta 2 no aparece en las fotos.');
  });

  it('sin el detalle de preguntas el aviso de cobertura también lleva a la evidencia', () => {
    const resumen = buildReviewTriage(desglose([correcta, pendiente('2')]));
    expect(resumen.globalReasons).toContain('cobertura_evidencia_incompleta');
    expect(describeReviewBlocker('cobertura_evidencia_incompleta')).toMatchObject({
      message: 'Faltan respuestas en las fotos de la entrega.', target: 'evidencia',
    });
    expect(describeReviewBlocker('cobertura_evidencia_incompleta', 'historical').message).toMatch(/faltaban respuestas en las fotos/);
  });

  it('tres o más preguntas se enumeran con comas', () => {
    expect(describeReviewBlocker('faltan_en_fotos:21,22,23,24').message).toBe('Las respuestas de las preguntas 21, 22, 23 y 24 no aparecen en las fotos.');
  });
});

describe('207 la foto no trae respuestas a la evaluación', () => {
  const resultado = {
    motivo_revision: 'image_not_usable', orchestrator: 'vision_failed',
    alertas: ['La hoja no contiene las preguntas 1-3 del contexto; es una página de apuntes sobre el proceso de la fotosíntesis.', 'Posibles errores ortográficos.'],
  };

  it('toma lo que explicó la IA y solo en esos casos', () => {
    expect(photosWithoutAnswers(resultado)).toBe('La hoja no contiene las preguntas 1-3 del contexto; es una página de apuntes sobre el proceso de la fotosíntesis.');
    expect(photosWithoutAnswers({ ...resultado, motivo_revision: 'student_answers_not_detected' })).toMatch(/^La hoja no contiene/);
    expect(photosWithoutAnswers({ ...resultado, alertas: ['Imagen no utilizable'] })).toBe('');
    expect(photosWithoutAnswers({ motivo_revision: 'vision_failed_temporary', alertas: ['x'] })).toBeNull();
    expect(photosWithoutAnswers({})).toBeNull();
    expect(photosWithoutAnswers({ ...resultado, alertas: ['a'.repeat(400)] })!.length).toBeLessThanOrEqual(280);
  });

  it('todas las preguntas muestran el motivo y el aviso explica qué vio la IA', () => {
    const resumen = buildReviewTriage(desglose([pendiente('1'), pendiente('2'), pendiente('3')]), [], [], photosWithoutAnswers(resultado));
    const aviso = resumen.globalReasons!.find((reason) => reason.startsWith('fotos_sin_respuestas:'))!;

    expect(resumen.items.every((item) => item.reasons[0].code === 'missing_in_photos')).toBe(true);
    expect(resumen.globalReasons).not.toContain('feedback_quality:componentes_o_evidencia_pendientes');
    expect(describeReviewBlocker(aviso)).toMatchObject({ message: 'La IA no encontró en las fotos respuestas a esta evaluación.', target: 'evidencia', leads: true });
    expect(describeReviewBlocker(aviso).guidance).toMatch(/Lo que vio: «La hoja no contiene.*fotosíntesis\.» Comprueba que la foto sea de esta evaluación/);
  });
});
