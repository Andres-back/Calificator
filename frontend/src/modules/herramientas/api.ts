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

/** URL del PDF (estudiante o soluciones). El navegador envía la cookie de sesión. */
export function pdfUrl(id: string, soluciones = false): string {
  const base = import.meta.env.VITE_API_URL ?? '/api';
  return `${base}${BASE}/${id}/pdf${soluciones ? '?soluciones=true' : ''}`;
}
