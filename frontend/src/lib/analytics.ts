/**
 * Cliente analítico tipado y fire-and-forget.
 *
 * Las referencias académicas viajan en campos canónicos y nunca dentro de
 * metadata. La identidad y el rol se derivan exclusivamente de la sesión.
 */
import { api } from './api';

export type AnalyticsSurface =
  | 'inicio'
  | 'materias'
  | 'actividades'
  | 'resultados'
  | 'xali'
  | 'calificaciones'
  | 'presentaciones';

type EvaluationReference = { evaluacion_id: string };
type BatchReference = EvaluationReference & { metadata_json: { batch_size: number } };

export type AnalyticsEventPayloads = {
  session_view_opened: { metadata_json: { surface: AnalyticsSurface } };
  workspace_opened: EvaluationReference & { metadata_json: { materia_id: string } };
  calificacion_opened: EvaluationReference & { calificacion_id: string };
  calificacion_confirmed: EvaluationReference;
  grade_adjusted: EvaluationReference;
  grade_marked_manual_review: EvaluationReference;
  batch_confirmed: BatchReference;
  batch_adjusted: BatchReference;
  calificacion_published: EvaluationReference;
  batch_published: BatchReference;
};

export type AnalyticsEventType = keyof AnalyticsEventPayloads;

export function trackEvent<T extends AnalyticsEventType>(
  tipo: T,
  payload: AnalyticsEventPayloads[T],
): void {
  void api.post('/analytics/evento', { tipo, ...payload }).catch(() => {
    // La telemetría nunca bloquea ni revierte la acción académica principal.
  });
}

export function surfaceForPath(pathname: string): AnalyticsSurface {
  const path = pathname.toLowerCase();
  if (path.includes('/calificaciones/boletin') || path.includes('/resultados')) return 'resultados';
  if (path.startsWith('/app/calificaciones')) return 'calificaciones';
  if (path.startsWith('/app/presentaciones')) return 'presentaciones';
  if (path.startsWith('/app/evaluaciones') || path.startsWith('/app/actividades')) return 'actividades';
  if (path.startsWith('/app/materias')) return 'materias';
  if (path.startsWith('/app/xali')) return 'xali';
  return 'inicio';
}
