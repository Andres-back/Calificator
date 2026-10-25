import type { Calificacion, Evaluacion } from '@/types/api';
import { hasTeacherDecision } from './gradingFlowModel';
import { isGradeProcessing } from '@/modules/calificaciones/gradePresentation';

export type ExportMode = 'final' | 'provisional';
type CellKind = 'final' | 'suggested' | 'processing' | 'missing' | 'error';
type ExportCell = { score: number | null; kind: CellKind; label: string };
export type GradeExport = {
  headings: string[];
  rows: { id: string; nombre: string; cells: ExportCell[] }[];
  counts: Record<CellKind, number>;
};

function numericScore(value: unknown, maximum: number): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= maximum ? number : null;
}

function cellFor(grade: Calificacion | undefined, maximum: number): ExportCell {
  if (!grade) return { score: null, kind: 'missing', label: 'Sin nota' };
  // A retry can retain previous numbers in the payload. They are not its result.
  if (isGradeProcessing(grade)) return { score: null, kind: 'processing', label: 'Calificando' };
  if (hasTeacherDecision(grade)) {
    const score = numericScore(grade.nota_confirmada ?? grade.nota_sugerida, maximum);
    return score == null ? { score: null, kind: 'missing', label: 'Sin nota válida' }
      : { score, kind: 'final', label: grade.estado === 'publicada' ? 'Publicada' : grade.estado === 'ajustada' ? 'Ajustada' : 'Confirmada' };
  }
  const status = String(grade.resultado_json?.pipeline_status ?? '').toLowerCase();
  if (['failed', 'error', 'cancelled'].includes(status) || ['error', 'requiere_reintento'].includes(grade.estado)) {
    return { score: null, kind: 'error', label: 'Requiere reintento' };
  }
  const score = numericScore(grade.nota_sugerida, maximum);
  return score == null ? { score: null, kind: 'missing', label: 'Sin nota' }
    : { score, kind: 'suggested', label: 'Sugerida · pendiente de revisión' };
}

export function buildGradeExport(
  students: { id: string; nombre: string }[],
  evaluations: Pick<Evaluacion, 'id' | 'nombre' | 'nota_maxima'>[],
  grades: Map<string, Calificacion[]>,
): GradeExport {
  const reserved = new Set(evaluations.map(item => item.nombre));
  const used = new Set(['Nombre del estudiante']);
  const headings = evaluations.map(item => {
    let label = item.nombre;
    if (used.has(label) || evaluations.filter(other => other.nombre === label).length > 1) {
      let ordinal = 1;
      do { label = `${item.nombre} (${ordinal++})`; } while (reserved.has(label) || used.has(label));
    }
    used.add(label);
    return label;
  });
  // The server selects the official attempt according to the evaluation's policy.
  const indexes = evaluations.map(evaluation => {
    const index = new Map<string, Calificacion>();
    for (const grade of grades.get(evaluation.id) ?? []) {
      if (grade.evaluacion_id && grade.evaluacion_id !== evaluation.id) throw new Error('Las notas no corresponden a la evaluación elegida. Actualiza la vista previa.');
      if (grade.estado === 'anulada') continue;
      if (index.has(grade.estudiante_id)) throw new Error('Hay intentos sin resolver. Actualiza las notas antes de exportar.');
      index.set(grade.estudiante_id, grade);
    }
    return index;
  });
  const counts = { final: 0, suggested: 0, processing: 0, missing: 0, error: 0 };
  const rows = [...students].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.id.localeCompare(b.id)).map(student => ({
    ...student,
    cells: evaluations.map((evaluation, i) => {
      const cell = cellFor(indexes[i].get(student.id), Number(evaluation.nota_maxima));
      counts[cell.kind]++;
      return cell;
    }),
  }));
  return { headings, rows, counts };
}

export function exportCsvRows(report: GradeExport, mode: ExportMode): string[][] {
  const provisional = mode === 'provisional';
  const headings = provisional ? report.headings.flatMap(name => [`${name} · Nota provisional`, `${name} · Estado`]) : report.headings;
  return [
    ['Nombre del estudiante', ...headings],
    ...report.rows.map(row => [row.nombre, ...row.cells.flatMap(cell => {
      const score = cell.kind === 'final' || (provisional && cell.kind === 'suggested') ? cell.score : null;
      const text = score == null ? '' : String(score).replace('.', ',');
      return provisional ? [text, cell.label] : [text];
    })]),
  ];
}
