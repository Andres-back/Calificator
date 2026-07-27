/**
 * Utilidad de analítica — eventos fire-and-forget desde el frontend.
 *
 * Uso:
 *   trackEvent('workspace_opened', { evaluacion_id: '...' })
 *   trackEvent('calificacion_confirmed', { calificacion_id: '...', override_delta: 0.5 })
 *
 * Los eventos se envían al backend sin afectar la UX (fire-and-forget).
 * Si falla el envío, se silencia — no debe interferir con el flujo del docente.
 */
import { api } from './api';

type EventPayload = Record<string, unknown>;

/** Envía un evento de analítica al backend. Silencioso si falla. */
export function trackEvent(
  tipo: string,
  metadata?: EventPayload,
): void {
  api.post('/analytics/evento', {
    tipo,
    metadata_json: metadata ?? {},
  }).catch(() => {
    // Fire-and-forget: silencioso
  });
}
