import { describe, expect, it } from 'vitest';
import type { Calificacion } from '@/types/api';
import {
  currentGradingStep,
  hasTeacherDecision,
  nextStudentNeedingAttention,
  summarizeGradingStudents,
  validateAdjustedScore,
} from './gradingFlowModel';

function grade(overrides: Partial<Calificacion>): Calificacion {
  return {
    id: 'grade-1',
    evaluacion_id: 'evaluation-1',
    estudiante_id: 'student-1',
    materia_id: 'subject-1',
    nota_sugerida: 4,
    nota_confirmada: null,
    confianza: 0.9,
    feedback: null,
    estado: 'sugerida',
    revisado_por_docente: false,
    resultado_json: {},
    created_at: '2026-07-28T00:00:00Z',
    updated_at: '2026-07-28T00:00:00Z',
    ...overrides,
  };
}

describe('gradingFlowModel', () => {
  it('treats adjusted and published grades as final teacher decisions', () => {
    expect(hasTeacherDecision(grade({ estado: 'sugerida' }))).toBe(false);
    expect(
      hasTeacherDecision(
        grade({ estado: 'ajustada', nota_confirmada: 3.8, revisado_por_docente: true }),
      ),
    ).toBe(true);
    expect(hasTeacherDecision(grade({ estado: 'publicada', nota_confirmada: 4 }))).toBe(true);
  });

  it('summarizes pending, review and decided students without losing adjusted grades', () => {
    expect(
      summarizeGradingStudents([
        { id: 'student-1' },
        { id: 'student-2', calificacion: grade({ estado: 'sugerida' }) },
        {
          id: 'student-3',
          calificacion: grade({ estado: 'ajustada', nota_confirmada: 3.5 }),
        },
      ]),
    ).toEqual({ total: 3, pendientes: 1, porRevisar: 1, decididas: 1 });
  });

  it('reports the visible workflow step from the actual selection state', () => {
    expect(currentGradingStep({ evaluationId: '', studentId: '', result: null })).toBe(1);
    expect(
      currentGradingStep({ evaluationId: 'evaluation-1', studentId: '', result: null }),
    ).toBe(2);
    expect(
      currentGradingStep({
        evaluationId: 'evaluation-1',
        studentId: 'student-1',
        result: null,
      }),
    ).toBe(3);
    expect(
      currentGradingStep({
        evaluationId: 'evaluation-1',
        studentId: 'student-1',
        result: grade({}),
      }),
    ).toBe(4);
  });

  it('validates manual scores before sending them to the API', () => {
    expect(validateAdjustedScore('', 5).error).toBe('Escribe la nota que decidiste.');
    expect(validateAdjustedScore('5.1', 5).error).toBe('La nota debe estar entre 0 y 5.0.');
    expect(validateAdjustedScore('3.8', 5)).toEqual({ value: 3.8, error: null });
  });

  it('selects the next unresolved student and stops when the class is complete', () => {
    const decided = grade({ estado: 'confirmada', nota_confirmada: 4 });
    const suggested = grade({ estado: 'sugerida' });
    expect(
      nextStudentNeedingAttention(
        [
          { id: 'student-1', calificacion: decided },
          { id: 'student-2', calificacion: suggested },
          { id: 'student-3' },
        ],
        'student-1',
      ),
    ).toBe('student-2');
    expect(
      nextStudentNeedingAttention(
        [
          { id: 'student-1', calificacion: decided },
          { id: 'student-2', calificacion: decided },
        ],
        'student-1',
      ),
    ).toBeNull();
  });
});
