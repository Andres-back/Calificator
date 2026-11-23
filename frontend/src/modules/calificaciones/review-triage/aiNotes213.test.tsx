import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GradeBreakdownData, GradeComponentData } from '@/types/api';
import { buildReviewTriage, describeReviewBlocker, readableAiNote } from './buildReviewTriage';
import { ReviewTriagePanel } from './ReviewTriagePanel';

// Spec 213: el docente ve qué anotó la IA, en la pregunta que nombra.
const pregunta = (numero: string, overrides: Partial<GradeComponentData> = {}): GradeComponentData => ({
  id: `p${numero}`, clave: `pregunta:${numero}`, orden: Number(numero) - 1, tipo: 'pregunta', numero, titulo: `Pregunta ${numero}`,
  respuesta_estudiante: 'Respuesta visible', respuesta_referencia: 'Referencia', puntos_obtenidos: 1, puntos_maximos: 1,
  estado: 'correcta', explicacion: 'Coincide con la referencia.', origen: 'consenso_ia', requiere_revision: false, evidencia_paginas: [1],
  valoraciones: [{ evaluador: 'A', puntaje: 1, estado: 'correcta', confianza: 0.95 }, { evaluador: 'B', puntaje: 1, estado: 'correcta', confianza: 0.95 }],
  ...overrides,
});
const desglose = (componentes: GradeComponentData[]): GradeBreakdownData => ({
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: false,
  formula: { puntos_obtenidos: 3, puntos_posibles: 3, nota_maxima: 5, nota_base: 5, ajuste_global: 0, nota_antes_redondeo: 5, regla_redondeo: 'half_up', decimales: 2, nota_final: 5 },
  componentes, created_at: '2026-11-22T00:00:00Z', bloqueos: [],
} as GradeBreakdownData);

describe('213 notas de la IA con su texto', () => {
  it('pone en cada pregunta lo que anotaron el verificador y el modelo principal, en el formato «P3» o «Q2»', () => {
    const resumen = buildReviewTriage(desglose([pregunta('1'), pregunta('2'), pregunta('3')]),
      ['P3: la clave (C) no coincide con el orden de la lectura.', 'Suma verificada dígito a dígito: 5.0/5.0.'], [], null,
      ['Q2 incompleta: indica noviembre pero omite el grupo.']);

    expect(resumen.counts).toEqual({ safe: 1, attention: 2, blocked: 0 });
    const etiquetas = (numero: string) => resumen.items.find((item) => item.component.numero === numero)!.reasons.map((reason) => reason.label);
    expect(etiquetas('3')).toEqual(['El verificador anotó: «P3: la clave (C) no coincide con el orden de la lectura.»']);
    expect(etiquetas('2')).toEqual(['El modelo principal anotó: «Q2 incompleta: indica noviembre pero omite el grupo.»']);
    expect(resumen.globalReasons).toEqual(['nota_verificador:Suma verificada dígito a dígito: 5.0/5.0.']);
  });

  it('una nota sobre una pregunta que no está en el desglose no se pierde', () => {
    const resumen = buildReviewTriage(desglose([pregunta('1')]), ['P7: marca tenue junto a C.']);
    expect(resumen.globalReasons).toEqual(['nota_verificador:P7: marca tenue junto a C.']);
  });

  it('el aviso general muestra el texto y no repite el mensaje genérico', () => {
    const resumen = buildReviewTriage(desglose([pregunta('1')]), ['Foto rotada y con baja resolución.', 'Suma verificada: 5.0.']);
    render(<ReviewTriagePanel compact summary={resumen} onSelectComponent={() => undefined} />);

    expect(screen.getByRole('alert')).toHaveTextContent('El verificador anotó: «Foto rotada y con baja resolución.»');
    expect(screen.getByRole('alert')).toHaveTextContent('El verificador anotó: «Suma verificada: 5.0.»');
    expect(screen.queryByText('Hay información que debes comprobar antes de confirmar la nota.')).not.toBeInTheDocument();
  });

  it('no muestra diagnósticos técnicos aunque vengan como nota', () => {
    expect(readableAiNote('provider_error:HTTP_503_trace_ab12')).toBeNull();
    expect(readableAiNote('Traceback (most recent call last): error')).toBeNull();
    expect(describeReviewBlocker('nota_verificador:HTTP_503 trace ab12').message).toBe('La segunda revisión de IA encontró algo que debes comprobar.');
    expect(readableAiNote(`P1: ${'x '.repeat(200)}`)!.length).toBeLessThanOrEqual(280);
  });

  it('distingue quién pidió revisión y conserva el texto en el historial', () => {
    expect(describeReviewBlocker('principal_solicita_revision').message).toBe('El modelo principal pidió que revises esta calificación antes de confirmarla.');
    expect(describeReviewBlocker('nota_principal:P2: letra tenue en la segunda línea.', 'historical').message)
      .toBe('En el análisis inicial, el modelo principal anotó: «P2: letra tenue en la segunda línea.»');
    // Mientras la entrega sigue en análisis, la nota es provisional y no se muestra su texto.
    expect(describeReviewBlocker('nota_principal:Comprobar evidencia pendiente', 'processing').message)
      .toBe('En el análisis inicial se registró un aviso adicional. Puedes consultar las respuestas y la evidencia.');
  });

  it('las preguntas decididas por el docente no reciben notas nuevas', () => {
    const docente = pregunta('1', { origen: 'docente' });
    const resumen = buildReviewTriage(desglose([docente]), ['P1: revisar la marca.']);
    expect(resumen.items[0].level).toBe('safe');
  });
});
