import type { Calificacion } from '@/types/api';

const ACTIVE_PIPELINE_STATES = new Set(['queued', 'running', 'retrying', 'waiting_connector']);

export function effectiveGradeScore(grade: Pick<Calificacion, 'nota_confirmada' | 'nota_sugerida'>): number | null {
  const raw = grade.nota_confirmada ?? grade.nota_sugerida;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Cifra de cálculo o auditoría: conserva hasta dos decimales significativos (no es la nota final mostrada). */
export function formatScoreDetail(score: number): string {
  const rounded = Math.round((score + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded * 10) ? rounded.toFixed(1) : rounded.toFixed(2);
}

/**
 * Spec 145: nota final con un decimal, la mitad hacia arriba, en aritmética entera.
 * Excepción: el empate exacto en el umbral de aprobación (60 % de la nota máxima,
 * llevado a un decimal) conserva dos decimales, porque lo decide el docente.
 */
export function formatGradeScore(score: number | string, notaMaxima?: number | string | null): string {
  const cents = Math.round(Number(score) * 100);
  const tenths = Math.floor((cents + 5) / 10);
  const maximum = notaMaxima == null ? NaN : Number(notaMaxima);
  if (Number.isFinite(maximum) && maximum > 0) {
    const thresholdTenths = Math.floor((Math.round(maximum * 100) * 6 + 50) / 100);
    if (cents === thresholdTenths * 10 - 5) return (cents / 100).toFixed(2);
  }
  return (tenths / 10).toFixed(1);
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
  if (grade.estado === 'publicada') return { label: 'Publicada', score, processing: false };
  if (grade.nota_confirmada != null) return { label: 'Confirmada', score, processing: false };
  if (score != null) return { label: 'Sugerida', score, processing: false };
  return { label: 'Revisión necesaria', score: null, processing: false };
}
