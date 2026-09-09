import { describe, expect, it } from 'vitest';
import type { Calificacion } from '@/types/api';
import { effectiveGradeScore, gradePresentation } from './gradePresentation';

function grade(overrides: Partial<Calificacion> = {}): Calificacion {
  return {
    id: 'grade-id', evaluacion_id: 'evaluation-id', estudiante_id: 'student-id',
    materia_id: 'subject-id', nota_sugerida: null, nota_confirmada: null,
    confianza: null, feedback: null, estado: 'procesando', revisado_por_docente: false,
    resultado_json: { pipeline_status: 'queued' }, created_at: '', updated_at: '',
    ...overrides,
  };
}

describe('gradePresentation', () => {
  it.each(['queued', 'running', 'retrying', 'waiting_connector'])('mantiene %s sin nota provisional', (pipeline_status) => {
    expect(gradePresentation(grade({ estado: 'sugerida', resultado_json: { pipeline_status } })))
      .toEqual({ label: 'Calificando', score: null, processing: true });
  });

  it('termina la animación cuando se requiere revisión sin nota', () => {
    expect(gradePresentation(grade({ estado: 'requiere_revision', resultado_json: { pipeline_status: 'failed' } })))
      .toEqual({ label: 'Revisión necesaria', score: null, processing: false });
  });

  it('la decisión docente termina el procesamiento aunque quede metadata antigua', () => {
    expect(gradePresentation(grade({ estado: 'confirmada', nota_confirmada: 0 })))
      .toEqual({ label: 'Confirmada', score: 0, processing: false });
  });

  it('no convierte una nota ausente en cero', () => {
    expect(effectiveGradeScore(grade())).toBeNull();
    expect(gradePresentation(grade())).toEqual({ label: 'Calificando', score: null, processing: true });
  });

  it('distingue una nota real de cero', () => {
    expect(gradePresentation(grade({
      estado: 'sugerida', nota_sugerida: 0, resultado_json: { pipeline_status: 'success' },
    }))).toEqual({ label: 'Sugerida', score: 0, processing: false });
  });
});
