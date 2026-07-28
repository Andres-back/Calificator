import { routes } from '@/config/routes';

export type TeacherActionIntent =
  | 'calificar'
  | 'asistencia'
  | 'evaluar'
  | 'seguimiento';

export interface TeacherActionGuide {
  intent: TeacherActionIntent;
  title: string;
  description: string;
  buttonLabel: string;
  destination: (materiaId: string) => string;
}

const ACTION_GUIDES: Record<TeacherActionIntent, TeacherActionGuide> = {
  calificar: {
    intent: 'calificar',
    title: 'Elige la materia que vas a calificar',
    description:
      'Al abrirla podrás seleccionar la evaluación, el estudiante y cargar la fotografía.',
    buttonLabel: 'Ir a calificar',
    destination: routes.materiaCalificar,
  },
  asistencia: {
    intent: 'asistencia',
    title: 'Elige la materia para tomar asistencia',
    description:
      'Al abrirla verás directamente la lista de estudiantes del día.',
    buttonLabel: 'Tomar asistencia',
    destination: routes.materiaAsistencia,
  },
  evaluar: {
    intent: 'evaluar',
    title: 'Elige la materia para preparar la evaluación',
    description:
      'La evaluación quedará organizada dentro de la clase correcta.',
    buttonLabel: 'Preparar evaluación',
    destination: routes.materiaEvaluaciones,
  },
  seguimiento: {
    intent: 'seguimiento',
    title: 'Elige la materia que quieres revisar',
    description:
      'Verás el avance del grupo, las prioridades y las notas que aún necesitan revisión.',
    buttonLabel: 'Ver seguimiento',
    destination: routes.materiaBoletin,
  },
};

export function getTeacherActionGuide(
  value: string | null,
): TeacherActionGuide | null {
  if (!value || !(value in ACTION_GUIDES)) return null;
  return ACTION_GUIDES[value as TeacherActionIntent];
}

export function getPostCreateDestination(
  intent: TeacherActionIntent | null,
  materiaId: string,
): string {
  // Preparing an evaluation is possible immediately. Attendance, grading and
  // follow-up need students (and usually an evaluation), so a new class first
  // opens its overview where the teacher is guided to share the enrollment code.
  if (intent === 'evaluar') {
    return routes.materiaEvaluaciones(materiaId);
  }
  return routes.materia(materiaId);
}

export type RecommendedTeacherStep = 'invite' | 'evaluate' | 'grade';

export interface TeacherJourneyState {
  hasStudents: boolean;
  hasEvaluations: boolean;
  canGrade: boolean;
  recommendedStep: RecommendedTeacherStep;
}

export function getTeacherJourneyState({
  studentCount,
  evaluationCount,
}: {
  studentCount: number;
  evaluationCount: number;
}): TeacherJourneyState {
  const hasStudents = studentCount > 0;
  const hasEvaluations = evaluationCount > 0;

  return {
    hasStudents,
    hasEvaluations,
    canGrade: hasStudents && hasEvaluations,
    recommendedStep: !hasStudents
      ? 'invite'
      : !hasEvaluations
        ? 'evaluate'
        : 'grade',
  };
}
