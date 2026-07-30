import { describe, expect, it } from 'vitest';
import type { Calificacion } from '@/types/api';
import {
  getTechnicalFailureReason,
  isTechnicalGradingFailure,
} from './gradingFailure';

function grade(overrides: Partial<Calificacion>): Calificacion {
  return {
    id: 'grade-1',
    evaluacion_id: 'evaluation-1',
    estudiante_id: 'student-1',
    materia_id: 'subject-1',
    nota_sugerida: null,
    nota_confirmada: null,
    confianza: null,
    feedback: null,
    estado: 'requiere_revision',
    revisado_por_docente: false,
    resultado_json: {},
    created_at: '2026-07-30T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
    ...overrides,
  };
}

describe('gradingFailure', () => {
  it('classifies a review state without a score as a technical failure', () => {
    expect(isTechnicalGradingFailure(grade({}))).toBe(true);
  });

  it('keeps a legitimate academic zero as a valid suggestion', () => {
    expect(
      isTechnicalGradingFailure(
        grade({ estado: 'sugerida', nota_sugerida: 0, confianza: 0.86 }),
      ),
    ).toBe(false);
  });

  it('maps the stable review reason from resultado_json', () => {
    const failed = grade({
      resultado_json: { motivo_revision: 'image_not_usable' },
    });
    expect(getTechnicalFailureReason(failed)).toBe(
      'La fotografía no tiene calidad suficiente para leer las respuestas.',
    );
  });
});
