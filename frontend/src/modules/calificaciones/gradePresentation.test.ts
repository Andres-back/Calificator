import { describe, expect, it } from 'vitest';
import type { Calificacion } from '@/types/api';
import { effectiveGradeScore, formatGradeScore, gradePresentation, tieOptions } from './gradePresentation';

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
  it('identifica la nota publicada sin cambiar la nota docente', () => {
    expect(gradePresentation(grade({ estado: 'publicada', nota_confirmada: 4.7, nota_sugerida: 5 })))
      .toEqual({ label: 'Publicada', score: 4.7, processing: false });
  });
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

  // Spec 145: un decimal, la mitad sube; el empate exacto en el umbral (60 %) conserva dos decimales.
  it.each([
    [2.94, 5, '2.9'],
    [2.95, 5, '2.95'],
    [2.96, 5, '3.0'],
    [3.45, 5, '3.5'],
    [1.15, 5, '1.2'],
    [4.67, 5, '4.7'],
    [5, 5, '5.0'],
    [0, 5, '0.0'],
    [8.05, 10, '8.1'],
    [5.95, 10, '5.95'],
    [2.95, 10, '3.0'],
    [59.95, 100, '59.95'],
    [2.65, 4.5, '2.65'],
    ['2.95', '5.00', '2.95'],
  ])('muestra %s sobre %s como %s', (score, maximum, expected) => {
    expect(formatGradeScore(score, maximum)).toBe(expected);
  });

  it.each([
    [2.95, 5, '2.9', '3.0'],
    ['2.95', '5.00', '2.9', '3.0'],
    [5.95, 10, '5.9', '6.0'],
    [59.95, 100, '59.9', '60.0'],
    [2.65, 4.5, '2.6', '2.7'],
  ])('reconoce el empate de %s sobre %s y sus dos cifras', (score, maximum, abajo, arriba) => {
    expect(tieOptions(score, maximum)).toEqual({ abajo, arriba });
    expect(formatGradeScore(score, maximum, 'abajo')).toBe(abajo);
    expect(formatGradeScore(score, maximum, 'arriba')).toBe(arriba);
  });

  it.each([[2.94, 5], [2.96, 5], [3, 5], [2.95, 10], [2.95, null], [2.95, 0]])('%s sobre %s no es empate', (score, maximum) => {
    expect(tieOptions(score, maximum)).toBeNull();
  });

  it('la decisión no cambia una nota sin empate y su ausencia conserva la cifra exacta', () => {
    expect(formatGradeScore(3.46, 5, 'arriba')).toBe('3.5');
    expect(formatGradeScore(2.95, 5, null)).toBe('2.95');
  });

  it('sin nota máxima aplica un decimal sin detectar empate', () => {
    expect(formatGradeScore(2.95)).toBe('3.0');
    expect(formatGradeScore(1.15)).toBe('1.2');
    expect(formatGradeScore(4.5)).toBe('4.5');
  });
});
