import { describe, expect, it } from 'vitest';
import type { GradeBreakdownData } from '@/types/api';
import { buildFeedbackStory } from './buildFeedbackStory';

const breakdown: GradeBreakdownData = {
  id: 'breakdown-1', calificacion_id: 'grade-1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: false, created_at: '2026-09-19T00:00:00Z',
  formula: { puntos_obtenidos: 3, puntos_posibles: 5, nota_maxima: 5, nota_base: 3, ajuste_global: 0, nota_antes_redondeo: 3, regla_redondeo: 'half_up', decimales: 1, nota_final: 3 },
  componentes: [
    { id: 'good', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta 1', respuesta_estudiante: 'A', respuesta_referencia: 'A', puntos_obtenidos: 2, puntos_maximos: 2, estado: 'correcta', explicacion: 'Relacionaste correctamente las ideas principales.', explicacion_estudiante: 'Relacionaste correctamente las ideas principales.', origen: 'ia', requiere_revision: false, evidencia_paginas: [1] },
    { id: 'improve', clave: 'pregunta:2', orden: 1, tipo: 'pregunta', numero: '2', titulo: 'Pregunta 2', respuesta_estudiante: 'B', respuesta_referencia: 'C', puntos_obtenidos: 1, puntos_maximos: 3, estado: 'parcial', explicacion: 'La conclusión necesita conectarse con la evidencia.', orientacion_mejora: 'Subraya el dato principal y úsalo para justificar tu conclusión.', origen: 'ia', requiere_revision: false, evidencia_paginas: [1] },
  ],
};

describe('buildFeedbackStory', () => {
  it('builds a concise, evidence-based four-scene story', () => {
    const scenes = buildFeedbackStory(breakdown);
    expect(scenes).toHaveLength(4);
    expect(scenes.map((scene) => scene.kind)).toEqual(['welcome', 'strength', 'improvement', 'next_step']);
    expect(scenes[1].message).toContain('Relacionaste correctamente');
    expect(scenes[3].message).toContain('Subraya el dato principal');
  });

  it('does not celebrate a provisional or blocked breakdown', () => {
    expect(buildFeedbackStory({ ...breakdown, requiere_revision: true })).toEqual([]);
    expect(buildFeedbackStory({ ...breakdown, bloqueos: ['cobertura_incompleta'] })).toEqual([]);
  });

  it('never invents an improvement when none was published', () => {
    const scenes = buildFeedbackStory({ ...breakdown, componentes: [breakdown.componentes[0]] });
    expect(scenes.map((scene) => scene.kind)).toEqual(['welcome', 'strength']);
  });
});
