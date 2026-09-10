import type { Calificacion } from '@/types/api';

const ACTIVE_PIPELINE_STATES = new Set(['queued', 'running', 'retrying', 'waiting_connector']);

export function effectiveGradeScore(grade: Pick<Calificacion, 'nota_confirmada' | 'nota_sugerida'>): number | null {
  const raw = grade.nota_confirmada ?? grade.nota_sugerida;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isGradeProcessing(grade: Pick<Calificacion, 'estado' | 'resultado_json'>): boolean {
  if (['confirmada', 'ajustada', 'publicada', 'anulada'].includes(grade.estado)) return false;
  const pipelineStatus = String(grade.resultado_json?.pipeline_status ?? '').toLowerCase();
  return grade.estado === 'procesando' || ACTIVE_PIPELINE_STATES.has(pipelineStatus);
}

export function gradePresentation(grade: Pick<Calificacion, 'estado' | 'resultado_json' | 'nota_sugerida' | 'nota_confirmada'>): {
  label: string;
  score: number | null;
  processing: boolean;
} {
  const score = effectiveGradeScore(grade);
  const processing = isGradeProcessing(grade) && score == null;
  if (processing) return { label: 'Calificando', score: null, processing: true };
  if (grade.nota_confirmada != null) return { label: 'Confirmada', score, processing: false };
  if (score != null) return { label: 'Sugerida', score, processing: false };
  return { label: 'Revisión necesaria', score: null, processing: false };
}
