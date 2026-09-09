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
type GradeReference = EvaluationReference & { calificacion_id: string };
type BatchReference = EvaluationReference & { metadata_json: { batch_size: number } };

export type AnalyticsEventPayloads = {
  session_view_opened: { metadata_json: { surface: AnalyticsSurface } };
  workspace_opened: EvaluationReference & { metadata_json: { materia_id: string } };
  calificacion_opened: EvaluationReference & { calificacion_id: string };
  calificacion_confirmed: GradeReference;
  grade_adjusted: GradeReference;
  grade_marked_manual_review: GradeReference;
  batch_confirmed: BatchReference;
  batch_adjusted: BatchReference;
  calificacion_published: GradeReference;
  batch_published: BatchReference;
};

export type AnalyticsEventType = keyof AnalyticsEventPayloads;

export type TeacherWorkCondition = 'manual' | 'asistida';
export type TeacherWorkPhase = 'preparacion' | 'revision' | 'correccion' | 'finalizacion';
export type TeacherWorkState = 'active' | 'paused' | 'completed' | 'incomplete';
export type TeacherWorkAction =
  | 'iniciar_intervalo'
  | 'heartbeat'
  | 'pausar'
  | 'reanudar'
  | 'cambiar_fase'
  | 'finalizar'
  | 'ajustar'
  | 'traspasar';

export type TeacherWorkSession = {
  id: string;
  version: number;
  estado: TeacherWorkState;
  condicion: TeacherWorkCondition;
  fase: TeacherWorkPhase;
  evaluacion_id: string | null;
  calificacion_id: string | null;
  batch_job_id: string | null;
  duracion_confirmada_ms: number;
  incertidumbre_ms: number;
  origen: 'observado' | 'importado' | 'ajustado';
  motivo_ajuste: string | null;
  started_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
  owner_token?: string;
  replayed?: boolean;
  rollover?: boolean;
  continuation?: TeacherWorkSession;
};

export type TeacherWorkSessionPage = {
  total: number;
  limit: number;
  offset: number;
  items: TeacherWorkSession[];
};

export function newWorkEventId(): string {
  return crypto.randomUUID();
}

export function elapsedFromMonotonic(startedAt: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.round(now - startedAt));
}

export async function startTeacherWorkSession(input: {
  condicion: TeacherWorkCondition;
  fase: TeacherWorkPhase;
  evaluacion_id?: string;
  calificacion_id?: string;
  batch_job_id?: string;
}): Promise<TeacherWorkSession> {
  const response = await api.post<TeacherWorkSession>('/analytics/sesiones-trabajo', {
    ...input,
    event_id: newWorkEventId(),
    acepta_medicion: true,
  });
  return response.data;
}

export async function sendTeacherWorkCommand(input: {
  sessionId: string;
  expectedVersion: number;
  ownerToken: string;
  accion: TeacherWorkAction;
  elapsedMs?: number;
  fase?: TeacherWorkPhase;
  motivo?: string;
  eventId?: string;
}): Promise<TeacherWorkSession> {
  const response = await api.post<TeacherWorkSession>(
    `/analytics/sesiones-trabajo/${input.sessionId}/eventos`,
    {
      event_id: input.eventId ?? newWorkEventId(),
      expected_version: input.expectedVersion,
      owner_token: input.ownerToken,
      accion: input.accion,
      elapsed_ms: input.elapsedMs ?? 0,
      fase: input.fase,
      motivo: input.motivo,
    },
  );
  return response.data;
}

export async function listTeacherWorkSessions(): Promise<TeacherWorkSessionPage> {
  const response = await api.get<TeacherWorkSessionPage>('/analytics/sesiones-trabajo', {
    params: { limit: 30, offset: 0 },
  });
  return response.data;
}

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
