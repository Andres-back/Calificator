import { api } from '@/lib/api';
import type { FeedbackResult } from './publicApi';

export interface FeedbackSelection { calificacion_id: string; fingerprint: string }
export interface FeedbackPreview {
  calificacion_id: string; elegible: boolean; motivo?: string; fingerprint?: string;
  resultado?: FeedbackResult; revision_retroalimentacion?: { signals?: string[] };
  borrador_docente?: { estado: string; nota: string | null; nota_maxima: string; retroalimentacion: string };
  seleccionable?: boolean; preparacion?: 'no_grade' | 'needs_review' | 'ready';
  revision_docente?: { source_fingerprint: string; feedback_text: string; detail_available: boolean };
  mensaje_editable?: { source_fingerprint: string; feedback_text: string; detail_available: boolean };
  batch_candidate?: FeedbackBatchCandidate;
  batch_unavailable_reason?: string;
}
export interface FeedbackBatchCandidate {
  source_fingerprint: string; nota: string; feedback_text: string;
  scope: 'summary' | 'detail'; avisos: string[];
}
export interface FeedbackBatchSelection { calificacion_id: string; source_fingerprint: string; feedback_text: string; scope: 'summary' | 'detail' }
export interface FeedbackBatchResultItem { calificacion_id: string; estado: 'published' | 'already_published' | 'failed'; estado_academico?: string; fingerprint?: string; code?: string; error?: string; retryable?: boolean }
export interface FeedbackBatchResult { id: string; request_id: string; total: number; exitosos: number; fallidos: number; resultados: FeedbackBatchResultItem[] }
export interface FeedbackCopiedAccess { id: string; calificacion_id?: string; estudiante?: string; url?: string; expires_at?: string; code?: string; error?: string }
export interface FeedbackReviewInput {
  calificacion_id: string; source_fingerprint: string; feedback_text: string;
  scope: 'summary' | 'detail'; request_id: string;
}
export interface FeedbackAccess {
  id: string; calificacion_id: string; estudiante: string;
  estado: 'active' | 'expired' | 'disabled' | 'suspended'; version: number;
  expires_at: string; fingerprint: string;
  copy_available?: boolean;
}
export interface IssuedFeedbackAccess {
  calificacion_id: string; id?: string; estado?: FeedbackAccess['estado']; version?: number;
  expires_at?: string; credential_available?: boolean; url?: string | null; error?: string;
}
interface Action { expected_version: number; request_id: string }
const path = (id: string) => `/evaluaciones/${encodeURIComponent(id)}/devoluciones`;
export async function feedbackAvailable(signal?: AbortSignal) {
  const { data } = await api.get<{ enabled: boolean }>('/devoluciones/disponibilidad', { signal });
  return data.enabled;
}
export async function previewFeedback(id: string, ids: string[], signal?: AbortSignal) {
  const { data } = await api.post<{ resultados: FeedbackPreview[] }>(path(id) + '/previsualizar', { calificacion_ids: ids }, { signal });
  return data.resultados;
}
export async function approveFeedbackReview(id: string, payload: FeedbackReviewInput, signal?: AbortSignal) {
  const { data } = await api.post<FeedbackPreview>(path(id) + '/revisar', payload, { signal });
  return data;
}
export async function saveFeedbackMessage(id: string, payload: Omit<FeedbackReviewInput, 'scope'>, signal?: AbortSignal) {
  const { data } = await api.post<FeedbackPreview>(path(id) + '/mensaje', payload, { signal });
  return data;
}
export async function issueFeedbackAccesses(id: string, payload: { request_id: string; selecciones: FeedbackSelection[]; duracion_dias: number; evidencia: boolean; solo_si_falta?: boolean }, signal?: AbortSignal) {
  const { data } = await api.post<{ resultados: IssuedFeedbackAccess[] }>(path(id) + '/accesos', payload, { signal });
  return data.resultados;
}
export async function listFeedbackAccesses(id: string, signal?: AbortSignal, gradeId?: string) {
  const results: FeedbackAccess[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const { data } = await api.get<{ resultados: FeedbackAccess[]; next_cursor: string | null }>(path(id) + '/accesos', { signal, params: { limit: 100, cursor, ...(gradeId ? {calificacion_id:gradeId} : {}) } });
    results.push(...data.resultados);
    cursor = data.next_cursor ?? undefined;
    if (cursor && seen.has(cursor)) throw new Error('No pudimos completar la lista de enlaces.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return results;
}
export async function prepareFeedbackPrint(id: string, selecciones: FeedbackSelection[], signal?: AbortSignal) {
  const { data } = await api.post<{ resultados: { calificacion_id: string; resultado?: FeedbackResult; error?: string }[] }>(path(id) + '/fichas', { selecciones }, { signal });
  return data.resultados;
}
export async function changeFeedbackAccess(access: FeedbackAccess, action: 'desactivar' | 'reactivar' | 'renovar', payload: Action & { duracion_dias?: number; fingerprint?: string; evidencia?: boolean; confirmar_reemplazo?: boolean; mantener_vencimiento?: boolean }, signal?: AbortSignal) {
  const { data } = await api.post<Omit<IssuedFeedbackAccess, 'calificacion_id'>>(`/devoluciones/accesos/${encodeURIComponent(access.id)}/${action}`, payload, { signal });
  return { ...data, calificacion_id: access.calificacion_id };
}

export async function publishFeedbackBatch(id: string, payload: {request_id:string; selecciones:FeedbackBatchSelection[]}, signal?: AbortSignal) {
  const {data}=await api.post<FeedbackBatchResult>(path(id)+'/aceptar-publicar',payload,{signal});
  return data;
}
export async function readFeedbackBatch(id: string, requestId: string, signal?: AbortSignal) {
  const {data}=await api.get<FeedbackBatchResult>(path(id)+'/lotes/'+encodeURIComponent(requestId),{signal});
  return data;
}
export async function copyFeedbackAccesses(id: string, accessIds: string[], signal?: AbortSignal) {
  const {data}=await api.post<{resultados:FeedbackCopiedAccess[]}>(path(id)+'/accesos/copiar',{access_ids:accessIds},{signal});
  return data.resultados;
}
