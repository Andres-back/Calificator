import { describe, expect, it } from 'vitest';
import {
  getTeacherActionGuide,
  getTeacherJourneyState,
  getPostCreateDestination,
} from './teacherFlowModel';

describe('getTeacherActionGuide', () => {
  it.each([
    ['calificar', '/app/materias/materia-1/calificar'],
    ['asistencia', '/app/materias/materia-1/asistencia'],
    ['evaluar', '/app/materias/materia-1/evaluaciones'],
    ['seguimiento', '/app/materias/materia-1/boletin'],
  ])('maps %s to the matching subject destination', (intent, destination) => {
    const guide = getTeacherActionGuide(intent);

    expect(guide).not.toBeNull();
    expect(guide?.destination('materia-1')).toBe(destination);
  });

  it('ignores unknown or missing actions', () => {
    expect(getTeacherActionGuide(null)).toBeNull();
    expect(getTeacherActionGuide('eliminar')).toBeNull();
  });
});

describe('getPostCreateDestination', () => {
  it('continues directly to evaluations when that was the original intention', () => {
    expect(getPostCreateDestination('evaluar', 'materia-1')).toBe(
      '/app/materias/materia-1/evaluaciones',
    );
  });

  it.each([null, 'calificar', 'asistencia', 'seguimiento'] as const)(
    'opens the guided overview for a new empty class when intent is %s',
    (intent) => {
      expect(getPostCreateDestination(intent, 'materia-1')).toBe(
        '/app/materias/materia-1',
      );
    },
  );
});

describe('getTeacherJourneyState', () => {
  it('starts by helping the teacher invite students', () => {
    expect(
      getTeacherJourneyState({ studentCount: 0, evaluationCount: 0 }),
    ).toMatchObject({
      recommendedStep: 'invite',
      canGrade: false,
    });
  });

  it('recommends preparing an evaluation after students join', () => {
    expect(
      getTeacherJourneyState({ studentCount: 12, evaluationCount: 0 }),
    ).toMatchObject({
      recommendedStep: 'evaluate',
      hasStudents: true,
      canGrade: false,
    });
  });

  it('enables grading when the class has students and evaluations', () => {
    expect(
      getTeacherJourneyState({ studentCount: 12, evaluationCount: 2 }),
    ).toEqual({
      hasStudents: true,
      hasEvaluations: true,
      canGrade: true,
      recommendedStep: 'grade',
    });
  });
});
