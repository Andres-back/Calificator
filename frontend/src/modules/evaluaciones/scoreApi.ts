import { api } from '@/lib/api';
import type { ScorePlan, ScoreQuestion } from './components/scoreAllocation';

export interface ScoreDefinition {
  plan: ScorePlan; nota_maxima: string; preguntas: ScoreQuestion[]; updated_at: string;
  contenido_version_id: string | null; definition_fingerprint: string;
}
export interface ScoreProposalRow { calificacion_id: string; nombre: string; elegible: boolean; nota_actual: string | null; nota_propuesta: string | null; fingerprint: string | null; motivo: string | null }
export interface ScorePreview { definition_fingerprint: string; resultados: ScoreProposalRow[]; siguiente_cursor: string | null; aviso: string }
export interface ScoreApplyRequest { request_id: string; definition_fingerprint: string; confirmar: true; selecciones: { calificacion_id: string; fingerprint: string }[] }
export interface ScoreReceipt { request_id: string; definition_fingerprint: string; resultados: { calificacion_id: string; estado: 'applied' | 'excluded' | 'conflict' | 'failed'; nota_anterior?: string; nota_nueva?: string; motivo?: string }[] }

export async function readScoreDefinition(id: string, signal?: AbortSignal): Promise<ScoreDefinition> {
  return (await api.get<ScoreDefinition>(`/evaluaciones/${id}/reparto`, { signal })).data;
}
export async function saveScoreDefinition(id: string, definition: ScoreDefinition, plan: ScorePlan, signal?: AbortSignal): Promise<ScoreDefinition> {
  return (await api.put<ScoreDefinition>(`/evaluaciones/${id}/reparto`, { plan, expected_updated_at: definition.updated_at, expected_content_version_id: definition.contenido_version_id }, { signal })).data;
}
export async function previewScoreNotes(id: string, cursor?: string | null, signal?: AbortSignal): Promise<ScorePreview> {
  return (await api.post<ScorePreview>(`/evaluaciones/${id}/reparto/notas/previsualizar`, null, { params: { limit: 100, ...(cursor ? { cursor } : {}) }, signal })).data;
}
export async function applyScoreNotes(id: string, request: ScoreApplyRequest, signal?: AbortSignal): Promise<ScoreReceipt> {
  return (await api.post<ScoreReceipt>(`/evaluaciones/${id}/reparto/notas/aplicar`, request, { signal })).data;
}
export async function readScoreReceipt(id: string, requestId: string, signal?: AbortSignal): Promise<ScoreReceipt> {
  return (await api.get<ScoreReceipt>(`/evaluaciones/${id}/reparto/notas/operaciones/${requestId}`, { signal })).data;
}
