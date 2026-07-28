import type { Calificacion } from '@/types/api';

export const TEACHER_DECISION_STATES = new Set([
  'confirmada',
  'ajustada',
  'publicada',
]);

export type GradingStudent = {
  id: string;
  calificacion?: Calificacion;
};

export type GradingCounts = {
  total: number;
  pendientes: number;
  porRevisar: number;
  decididas: number;
};

export function hasTeacherDecision(
  grade: Pick<Calificacion, 'estado' | 'nota_confirmada' | 'revisado_por_docente'> | undefined,
): boolean {
  if (!grade) return false;
  return (
    TEACHER_DECISION_STATES.has(grade.estado) ||
    (grade.revisado_por_docente && grade.nota_confirmada != null)
  );
}

export function summarizeGradingStudents(students: GradingStudent[]): GradingCounts {
  return students.reduce<GradingCounts>(
    (summary, student) => {
      summary.total += 1;
      if (!student.calificacion) summary.pendientes += 1;
      else if (hasTeacherDecision(student.calificacion)) summary.decididas += 1;
      else summary.porRevisar += 1;
      return summary;
    },
    { total: 0, pendientes: 0, porRevisar: 0, decididas: 0 },
  );
}

export function currentGradingStep({
  evaluationId,
  studentId,
  result,
}: {
  evaluationId: string;
  studentId: string;
  result: Calificacion | null;
}): 1 | 2 | 3 | 4 {
  if (!evaluationId) return 1;
  if (!studentId) return 2;
  if (result) return 4;
  return 3;
}

export function validateAdjustedScore(
  rawValue: string,
  maximum: number,
): { value: number | null; error: string | null } {
  if (!rawValue.trim()) {
    return { value: null, error: 'Escribe la nota que decidiste.' };
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return { value: null, error: 'La nota debe ser un número válido.' };
  }
  if (value < 0 || value > maximum) {
    return {
      value: null,
      error: `La nota debe estar entre 0 y ${maximum.toFixed(1)}.`,
    };
  }
  return { value, error: null };
}

export function nextStudentNeedingAttention(
  students: GradingStudent[],
  currentStudentId: string,
): string | null {
  if (students.length === 0) return null;
  const currentIndex = Math.max(
    students.findIndex((student) => student.id === currentStudentId),
    0,
  );
  for (let offset = 1; offset <= students.length; offset += 1) {
    const candidate = students[(currentIndex + offset) % students.length];
    if (!candidate.calificacion || !hasTeacherDecision(candidate.calificacion)) {
      return candidate.id;
    }
  }
  return null;
}
