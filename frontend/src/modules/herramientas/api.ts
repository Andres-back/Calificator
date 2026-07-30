import { api } from '@/lib/api';
import type { Material, MaterialListItem } from '@/types/api';

const BASE = '/herramientas';

export async function listMaterials(tipo?: string): Promise<MaterialListItem[]> {
  const { data } = await api.get<MaterialListItem[]>(BASE, { params: tipo ? { tipo } : undefined });
  return data;
}

export async function getMaterial(id: string): Promise<Material> {
  const { data } = await api.get<Material>(`${BASE}/${id}`);
  return data;
}

export async function generateMaterial(endpoint: string, payload: Record<string, unknown>): Promise<Material> {
  const { data } = await api.post<Material>(`${BASE}/${endpoint}`, payload);
  return data;
}

export async function deleteMaterial(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function updateMaterial(id: string, payload: { materia_id?: string; titulo?: string }): Promise<Material> {
  const { data } = await api.patch<Material>(`${BASE}/${id}`, payload);
  return data;
}

export async function editMaterial(id: string, payload: { titulo?: string; contenido_json?: Record<string, unknown> }): Promise<Material> {
  const { data } = await api.patch<Material>(`${BASE}/${id}`, payload);
  return data;
}

export async function duplicateMaterial(id: string): Promise<Material> {
  const { data } = await api.post<Material>(`${BASE}/${id}/duplicar`);
  return data;
}

export interface ConvertirResponse {
  evaluacion_id: string;
  nombre: string;
  tipo: string;
  estado: string;
  nota_maxima: number;
  total_preguntas: number;
}

export async function convertToEvaluacion(
  id: string,
  payload: { materia_id?: string; nombre?: string; nota_maxima?: number },
): Promise<ConvertirResponse> {
  const { data } = await api.post<ConvertirResponse>(`${BASE}/${id}/convertir-evaluacion`, payload);
  return data;
}

/** URL del PDF (estudiante o soluciones). El navegador envía la cookie de sesión. */
export function pdfUrl(id: string, soluciones = false): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}${BASE}/${id}/pdf${soluciones ? '?soluciones=true' : ''}`;
}
