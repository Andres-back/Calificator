import { api } from '@/lib/api';
import type { ChatMessage, XaliEvaluacionEntregada, XaliEvaluationChatResponse, XaliStudentResource, XaliStudentResourceType } from '@/types/api';

export async function getHistory(materiaId?: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>('/xali/history', { params: materiaId ? { materia_id: materiaId } : undefined });
  return data;
}
export async function sendMessage(mensaje: string, materiaId?: string): Promise<{ respuesta: string }> {
  const { data } = await api.post<{ respuesta: string }>('/xali/chat', { mensaje, materia_id: materiaId ?? null });
  return data;
}
export async function listEvaluacionesEntregadas(): Promise<XaliEvaluacionEntregada[]> {
  const { data } = await api.get<XaliEvaluacionEntregada[]>('/xali/evaluaciones-entregadas');
  return data;
}
export async function sendEvaluationMessage(evaluacionId: string, mensaje: string): Promise<XaliEvaluationChatResponse> {
  const { data } = await api.post<XaliEvaluationChatResponse>(`/xali/evaluaciones/${evaluacionId}/chat`, { mensaje });
  return data;
}
export async function generateEvaluationResource(evaluacionId: string, tipo: XaliStudentResourceType): Promise<XaliStudentResource> {
  const { data } = await api.post<XaliStudentResource>(`/xali/evaluaciones/${evaluacionId}/recursos`, { tipo });
  return data;
}
export async function listEvaluationResources(evaluacionId: string): Promise<XaliStudentResource[]> {
  const { data } = await api.get<XaliStudentResource[]>(`/xali/evaluaciones/${evaluacionId}/recursos`);
  return data;
}
export async function clearHistory(materiaId?: string): Promise<void> {
  await api.delete('/xali/history', { params: materiaId ? { materia_id: materiaId } : undefined });
}
