import type { Calificacion, Evaluacion } from '@/types/api';
import { hasTeacherDecision } from './gradingFlowModel';

export type FollowUpPriority =
  | 'alta'
  | 'seguimiento'
  | 'estable'
  | 'sin_datos';

export type FollowUpCellStatus = 'decidida' | 'por_revisar' | 'sin_nota';

export type FollowUpCell = {
  evaluationId: string;
  evaluationName: string;
  maximumScore: number;
  grade?: Calificacion;
  score: number | null;
  percentage: number | null;
  status: FollowUpCellStatus;
};

export type FollowUpRow = {
  id: string;
  nombre: string;
  email: string;
  cells: FollowUpCell[];
  averagePercent: number | null;
  decided: number;
  pendingReview: number;
  missing: number;
  priority: FollowUpPriority;
  reason: string;
};

export type FollowUpSummary = {
  students: number;
  highPriority: number;
  needsFollowUp: number;
  pendingGrades: number;
  teacherDecisions: number;
};

type StudentInput = {
  id: string;
  nombre: string;
  email: string;
};

type EvaluationInput = Pick<Evaluacion, 'id' | 'nombre' | 'nota_maxima'>;

export function normalizeNumeric(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function latestGrade(
  grades: Calificacion[] | undefined,
  studentId: string,
): Calificacion | undefined {
  return grades
    ?.filter((grade) => grade.estudiante_id === studentId)
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0];
}

function priorityFor({
  averagePercent,
  pendingReview,
  missing,
}: {
  averagePercent: number | null;
  pendingReview: number;
  missing: number;
}): Pick<FollowUpRow, 'priority' | 'reason'> {
  if (averagePercent != null && averagePercent < 60) {
    return {
      priority: 'alta',
      reason: 'El promedio está por debajo del 60% del puntaje disponible.',
    };
  }
  if (pendingReview > 0) {
    return {
      priority: 'seguimiento',
      reason: `${pendingReview} sugerencia${pendingReview === 1 ? '' : 'es'} pendiente${pendingReview === 1 ? '' : 's'} de decisión docente.`,
    };
  }
  if (missing > 0) {
    return {
      priority: averagePercent == null ? 'sin_datos' : 'seguimiento',
      reason: `${missing} evaluación${missing === 1 ? '' : 'es'} sin calificación.`,
    };
  }
  if (averagePercent != null && averagePercent < 75) {
    return {
      priority: 'seguimiento',
      reason: 'El promedio está entre el 60% y el 75% del puntaje disponible.',
    };
  }
  if (averagePercent != null) {
    return {
      priority: 'estable',
      reason: 'Tiene decisiones docentes en todas las evaluaciones cerradas.',
    };
  }
  return {
    priority: 'sin_datos',
    reason: 'Todavía no hay decisiones docentes para orientar el seguimiento.',
  };
}

export function buildFollowUpRows({
  students,
  evaluations,
  gradesByEvaluation,
}: {
  students: StudentInput[];
  evaluations: EvaluationInput[];
  gradesByEvaluation: Map<string, Calificacion[]>;
}): FollowUpRow[] {
  const rows = students.map<FollowUpRow>((student) => {
    const cells = evaluations.map<FollowUpCell>((evaluation) => {
      const grade = latestGrade(
        gradesByEvaluation.get(evaluation.id),
        student.id,
      );
      const maximumScore = normalizeNumeric(evaluation.nota_maxima) ?? 0;
      const decision = hasTeacherDecision(grade);
      const score = decision
        ? normalizeNumeric(grade?.nota_confirmada ?? grade?.nota_sugerida)
        : null;
      const percentage =
        score != null && maximumScore > 0
          ? Math.max(0, Math.min(100, (score / maximumScore) * 100))
          : null;
      return {
        evaluationId: evaluation.id,
        evaluationName: evaluation.nombre,
        maximumScore,
        grade,
        score,
        percentage,
        status: decision
          ? 'decidida'
          : grade
            ? 'por_revisar'
            : 'sin_nota',
      };
    });

    const decidedCells = cells.filter((cell) => cell.status === 'decidida');
    const averagePercent =
      decidedCells.length > 0
        ? decidedCells.reduce(
            (total, cell) => total + (cell.percentage ?? 0),
            0,
          ) / decidedCells.length
        : null;
    const pendingReview = cells.filter(
      (cell) => cell.status === 'por_revisar',
    ).length;
    const missing = cells.filter((cell) => cell.status === 'sin_nota').length;
    const priority = priorityFor({
      averagePercent,
      pendingReview,
      missing,
    });

    return {
      ...student,
      cells,
      averagePercent,
      decided: decidedCells.length,
      pendingReview,
      missing,
      ...priority,
    };
  });

  const priorityRank: Record<FollowUpPriority, number> = {
    alta: 0,
    seguimiento: 1,
    sin_datos: 2,
    estable: 3,
  };

  return rows.sort((a, b) => {
    const priorityDifference =
      priorityRank[a.priority] - priorityRank[b.priority];
    if (priorityDifference !== 0) return priorityDifference;
    if (a.averagePercent == null && b.averagePercent != null) return 1;
    if (a.averagePercent != null && b.averagePercent == null) return -1;
    if (a.averagePercent != null && b.averagePercent != null) {
      const averageDifference = a.averagePercent - b.averagePercent;
      if (averageDifference !== 0) return averageDifference;
    }
    return a.nombre.localeCompare(b.nombre);
  });
}

export function summarizeFollowUp(rows: FollowUpRow[]): FollowUpSummary {
  return rows.reduce<FollowUpSummary>(
    (summary, row) => {
      summary.students += 1;
      if (row.priority === 'alta') summary.highPriority += 1;
      if (row.priority === 'seguimiento' || row.priority === 'sin_datos') {
        summary.needsFollowUp += 1;
      }
      summary.pendingGrades += row.pendingReview;
      summary.teacherDecisions += row.decided;
      return summary;
    },
    {
      students: 0,
      highPriority: 0,
      needsFollowUp: 0,
      pendingGrades: 0,
      teacherDecisions: 0,
    },
  );
}
