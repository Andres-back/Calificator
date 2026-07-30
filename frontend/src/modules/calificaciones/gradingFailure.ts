import type { Calificacion } from '@/types/api';

export const REVIEW_REASON_MESSAGES: Record<string, string> = {
  image_not_usable:
    'La fotografía no tiene calidad suficiente para leer las respuestas.',
  vision_failed:
    'No fue posible extraer una respuesta válida de la imagen.',
  all_graders_failed:
    'Los evaluadores de IA no pudieron completar la calificación.',
  pipeline_error:
    'Ocurrió un error técnico durante el procesamiento.',
};

export function isTechnicalGradingFailure(
  grade: Calificacion | null | undefined,
): boolean {
  return (
    grade?.estado === 'requiere_revision' &&
    grade.nota_sugerida == null
  );
}

export function getTechnicalFailureReason(
  grade: Calificacion | null | undefined,
): string | null {
  if (!isTechnicalGradingFailure(grade)) return null;
  const rawReason =
    grade?.motivo_revision ??
    grade?.resultado_json?.motivo_revision;
  const reason = typeof rawReason === 'string' ? rawReason : 'pipeline_error';
  return REVIEW_REASON_MESSAGES[reason] ?? REVIEW_REASON_MESSAGES.pipeline_error;
}
