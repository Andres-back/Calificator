import { api } from '@/lib/api';
import type { Evaluacion, EvaluacionModalidad, Material, MaterialListItem } from '@/types/api';

const BASE = '/herramientas';

export async function listMaterials(tipo?: string): Promise<MaterialListItem[]> {
  const { data } = await api.get<MaterialListItem[]>(BASE, { params: tipo ? { tipo } : undefined });
  return data;
}

export async function listMateriaResources(materiaId: string): Promise<MaterialListItem[]> {
  const { data } = await api.get<MaterialListItem[]>(`${BASE}/materias/${materiaId}/recursos`);
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

export async function updateMaterial(id: string, payload: { materia_id?: string | null; titulo?: string }): Promise<Material> {
  const { data } = await api.patch<Material>(`${BASE}/${id}`, payload);
  return data;
}

export async function editMaterial(id: string, payload: { titulo?: string; contenido_json?: Record<string, unknown> }): Promise<Material> {
  const { data } = await api.patch<Material>(`${BASE}/${id}`, payload);
  return data;
}

export async function assignMaterialAsSupport(id: string, materiaId: string): Promise<Material> {
  const { data } = await api.post<Material>(`${BASE}/${id}/asignar-apoyo`, { materia_id: materiaId });
  return data;
}

export async function withdrawSupportMaterial(id: string): Promise<Material> {
  const { data } = await api.post<Material>(`${BASE}/${id}/retirar-apoyo`);
  return data;
}

export async function duplicateMaterial(id: string): Promise<Material> {
  const { data } = await api.post<Material>(`${BASE}/${id}/duplicar`);
  return data;
}

export type IntentPolicy = 'un_intento' | 'multiples_intentos' | 'mejor_puntaje' | 'ultimo_intento' | 'practica_libre';

export interface ConvertirEvaluacionPayload {
  materia_id?: string;
  nombre?: string;
  nota_maxima?: number;
  modalidad: EvaluacionModalidad;
  politica_intento?: IntentPolicy;
  intentos_permitidos?: number;
  tiempo_limite_minutos?: number;
}

export async function convertToEvaluacion(
  id: string,
  payload: ConvertirEvaluacionPayload,
): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`${BASE}/${id}/convertir-evaluacion`, payload);
  return data;
}

export async function listMaterialEvaluaciones(id: string): Promise<Evaluacion[]> {
  const { data } = await api.get<Evaluacion[]>(`${BASE}/${id}/evaluaciones`);
  return data;
}
/** URL del PDF (estudiante o soluciones). El navegador envía la cookie de sesión. */

export function pdfUrl(id: string, soluciones = false): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}${BASE}/${id}/pdf${soluciones ? '?soluciones=true' : ''}`;
}
