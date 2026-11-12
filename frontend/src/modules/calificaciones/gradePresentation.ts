import type { Calificacion, TieDecision } from '@/types/api';

export type TieOptions = Record<TieDecision, string>;

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
 * llevado a un decimal) conserva dos decimales hasta que el docente decida (Spec 150).
 */
export function formatGradeScore(score: number | string, notaMaxima?: number | string | null, decision?: TieDecision | null): string {
  const cents = Math.round(Number(score) * 100);
  const tie = tieOptions(score, notaMaxima);
  if (tie) return decision ? tie[decision] : (cents / 100).toFixed(2);
  return (Math.floor((cents + 5) / 10) / 10).toFixed(1);
}

/** Spec 150: las dos cifras entre las que decide el docente, o `null` si la nota no está en empate. */
export function tieOptions(score: number | string, notaMaxima?: number | string | null): TieOptions | null {
  const maximum = notaMaxima == null ? NaN : Number(notaMaxima);
  if (!Number.isFinite(maximum) || maximum <= 0) return null;
  const thresholdTenths = Math.floor((Math.round(maximum * 100) * 6 + 50) / 100);
  if (Math.round(Number(score) * 100) !== thresholdTenths * 10 - 5) return null;
  return { abajo: ((thresholdTenths - 1) / 10).toFixed(1), arriba: (thresholdTenths / 10).toFixed(1) };
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

export type ReviewRowTone = 'neutral' | 'progress' | 'attention' | 'suggested' | 'done' | 'published' | 'danger';

const REVIEW_ROW_STATUS: Record<string, { label: string; tone: ReviewRowTone }> = {
  sin_entrega: { label: 'Sin entrega', tone: 'neutral' },
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  procesando: { label: 'Calificando', tone: 'progress' },
  requiere_revision: { label: 'Requiere revisión', tone: 'attention' },
  requiere_reintento: { label: 'Requiere reintento', tone: 'danger' },
  sugerida: { label: 'Nota sugerida', tone: 'suggested' },
  confirmada: { label: 'Confirmada', tone: 'done' },
  ajustada: { label: 'Ajustada', tone: 'done' },
  publicada: { label: 'Publicada', tone: 'published' },
  anulada: { label: 'Anulada', tone: 'danger' },
};

/** Estado de una fila de la lista de revisión, con su nombre correcto y un tono para distinguirlo de un vistazo. */
export function reviewRowStatus(estado: string): { label: string; tone: ReviewRowTone } {
  const known = REVIEW_ROW_STATUS[estado];
  if (known) return known;
  const text = estado.replace(/_/g, ' ').trim();
  return { label: text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Sin estado', tone: 'neutral' };
}
