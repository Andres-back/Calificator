import { describe, expect, it } from 'vitest';
import type { Calificacion, Evaluacion } from '@/types/api';
import {
  buildFollowUpRows,
  latestGrade,
  normalizeNumeric,
  summarizeFollowUp,
} from './gradebookModel';

function grade(
  overrides: Partial<Calificacion> & {
    estudiante_id: string;
    evaluacion_id: string;
  },
): Calificacion {
  return {
    id: crypto.randomUUID(),
    materia_id: 'materia-1',
    nota_sugerida: null,
    nota_confirmada: null,
    confianza: null,
    feedback: null,
    estado: 'sugerida',
    revisado_por_docente: false,
    resultado_json: {},
    created_at: '2026-07-28T10:00:00Z',
    updated_at: '2026-07-28T10:00:00Z',
    ...overrides,
  };
}

const evaluations = [
  {
    id: 'eval-1',
    nombre: 'Evaluación sobre cinco',
    nota_maxima: 5,
  },
  {
    id: 'eval-2',
    nombre: 'Evaluación sobre diez',
    nota_maxima: 10,
  },
] as Evaluacion[];

describe('gradebookModel', () => {
  it('normaliza números aunque la API serialice decimales como texto', () => {
    expect(normalizeNumeric('4.20')).toBe(4.2);
    expect(normalizeNumeric(3.8)).toBe(3.8);
    expect(normalizeNumeric('')).toBeNull();
    expect(normalizeNumeric('no-numero')).toBeNull();
  });

  it('elige el intento más reciente de un estudiante', () => {
    const older = grade({
      id: 'old',
      estudiante_id: 'student-1',
      evaluacion_id: 'eval-1',
      updated_at: '2026-07-28T08:00:00Z',
    });
    const newer = grade({
      id: 'new',
      estudiante_id: 'student-1',
      evaluacion_id: 'eval-1',
      updated_at: '2026-07-28T09:00:00Z',
    });
    expect(latestGrade([older, newer], 'student-1')?.id).toBe('new');
  });

  it('considera confirmada, ajustada y publicada como decisiones docentes', () => {
    const gradesByEvaluation = new Map<string, Calificacion[]>([
      [
        'eval-1',
        [
          grade({
            estudiante_id: 'student-1',
            evaluacion_id: 'eval-1',
            estado: 'ajustada',
            nota_confirmada: 4,
            revisado_por_docente: true,
          }),
        ],
      ],
      [
        'eval-2',
        [
          grade({
            estudiante_id: 'student-1',
            evaluacion_id: 'eval-2',
            estado: 'publicada',
            nota_confirmada: 8,
            revisado_por_docente: true,
          }),
        ],
      ],
    ]);
    const [row] = buildFollowUpRows({
      students: [
        { id: 'student-1', nombre: 'Ana', email: 'ana@example.com' },
      ],
      evaluations,
      gradesByEvaluation,
    });
    expect(row.decided).toBe(2);
    expect(row.averagePercent).toBe(80);
    expect(row.priority).toBe('estable');
  });

  it('normaliza escalas distintas antes de calcular el promedio', () => {
    const gradesByEvaluation = new Map<string, Calificacion[]>([
      [
        'eval-1',
        [
          grade({
            estudiante_id: 'student-1',
            evaluacion_id: 'eval-1',
            estado: 'confirmada',
            nota_confirmada: 2.5,
            revisado_por_docente: true,
          }),
        ],
      ],
      [
        'eval-2',
        [
          grade({
            estudiante_id: 'student-1',
            evaluacion_id: 'eval-2',
            estado: 'confirmada',
            nota_confirmada: 10,
            revisado_por_docente: true,
          }),
        ],
      ],
    ]);
    const [row] = buildFollowUpRows({
      students: [
        { id: 'student-1', nombre: 'Ana', email: 'ana@example.com' },
      ],
      evaluations,
      gradesByEvaluation,
    });
    expect(row.averagePercent).toBe(75);
  });

  it('prioriza promedio bajo y distingue sugerencias pendientes', () => {
    const gradesByEvaluation = new Map<string, Calificacion[]>([
      [
        'eval-1',
        [
          grade({
            estudiante_id: 'student-low',
            evaluacion_id: 'eval-1',
            estado: 'confirmada',
            nota_confirmada: 2,
            revisado_por_docente: true,
          }),
          grade({
            estudiante_id: 'student-review',
            evaluacion_id: 'eval-1',
            estado: 'sugerida',
            nota_sugerida: 4,
          }),
        ],
      ],
    ]);
    const rows = buildFollowUpRows({
      students: [
        {
          id: 'student-review',
          nombre: 'Beatriz',
          email: 'bea@example.com',
        },
        {
          id: 'student-low',
          nombre: 'Andrés',
          email: 'andres@example.com',
        },
      ],
      evaluations: [evaluations[0]],
      gradesByEvaluation,
    });
    expect(rows[0].id).toBe('student-low');
    expect(rows[0].priority).toBe('alta');
    expect(rows[1].pendingReview).toBe(1);
    expect(rows[1].priority).toBe('seguimiento');
  });

  it('resume prioridades y decisiones del grupo', () => {
    const rows = buildFollowUpRows({
      students: [
        { id: 'student-1', nombre: 'Ana', email: 'ana@example.com' },
        { id: 'student-2', nombre: 'Luis', email: 'luis@example.com' },
      ],
      evaluations: [evaluations[0]],
      gradesByEvaluation: new Map([
        [
          'eval-1',
          [
            grade({
              estudiante_id: 'student-1',
              evaluacion_id: 'eval-1',
              estado: 'confirmada',
              nota_confirmada: 2,
              revisado_por_docente: true,
            }),
          ],
        ],
      ]),
    });
    expect(summarizeFollowUp(rows)).toEqual({
      students: 2,
      highPriority: 1,
      needsFollowUp: 1,
      pendingGrades: 0,
      teacherDecisions: 1,
    });
  });
});
