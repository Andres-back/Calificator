import { describe, expect, it } from 'vitest';
import type { Evaluacion } from '@/types/api';
import { getStudentEvaluationAction } from './studentProgress';

function evaluation(overrides: Partial<Evaluacion> = {}): Evaluacion {
  return {
    id: 'evaluation-id',
    materia_id: 'subject-id',
    profesor_id: 'teacher-id',
    nombre: 'Actividad de prueba',
    descripcion: null,
    modalidad: 'fisica',
    nota_maxima: 5,
    tipo_origen: 'nativa',
    material_origen_id: null,
    dba_ids: [],
    dba_personalizado_ids: [],
    metas_profesor: [],
    criterios: [],
    preguntas: [],
    respuestas_esperadas: [],
    estado: 'publicada',
    recepcion_habilitada: true,
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-10T00:00:00Z',
    ...overrides,
  } as Evaluacion;
}

describe('getStudentEvaluationAction', () => {
  it('invita a ver una actividad asignada antes de resolverla o adjuntarla', () => {
    expect(getStudentEvaluationAction(evaluation({ material_origen_id: 'material-id' }))).toBe('Ver actividad');
  });

  it('invita a ver una evaluación nativa sin anticipar la modalidad de entrega', () => {
    expect(getStudentEvaluationAction(evaluation({ modalidad: 'online' }))).toBe('Ver evaluación');
  });

  it('mantiene el acceso a la entrega cuando el estudiante ya respondió', () => {
    expect(getStudentEvaluationAction(evaluation({ entrega_realizada: true, material_origen_id: 'material-id' }))).toBe('Ver entrega');
  });
});