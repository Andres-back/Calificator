import { api } from '@/lib/api';
import type { Presentacion } from '@/types/api';

export interface PresentacionCreate {
  titulo: string;
  materia_id?: string;
  tema: string;
  grado?: string;
  area?: string;
  cantidad_slides?: number;
  instrucciones?: string;
  incluir_imagenes?: boolean;
  nivel?: 'preescolar' | 'primaria' | 'secundaria' | 'media';
  tono?: 'divulgativo' | 'academico' | 'ludico';
  densidad_imagenes?: 'baja' | 'media' | 'alta';
  proveedor_imagenes?: 'economico' | 'mixto' | 'premium';
}

export async function listPresentaciones(): Promise<Presentacion[]> {
  const { data } = await api.get<Presentacion[]>('/presentaciones');
  return data;
}
export async function createPresentacion(payload: PresentacionCreate): Promise<Presentacion> {
  const { data } = await api.post<Presentacion>('/presentaciones', payload);
  return data;
}
export async function getPresentacionEstado(id: string): Promise<{ id: string; estado: string; progreso: number; pptx_url: string | null; error: string | null }> {
  const { data } = await api.get(`/presentaciones/${id}/estado`);
  return data;
}

export async function exportPresentacion(id: string, format: 'pptx' | 'pdf'): Promise<Presentacion> {
  const { data } = await api.post<Presentacion>(`/presentaciones/${id}/exportar`, { format });
  return data;
}

export function presentacionFileUrl(id: string, format: 'pptx' | 'pdf'): string {
  const apiBase = String(import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
  return `${apiBase}/presentaciones/${encodeURIComponent(id)}/archivo/${format}`;
}

export interface PresentacionPreviewSlide {
  numero: number;
  titulo: string;
  image_url: string;
}

export interface PresentacionPreview {
  id: string;
  titulo: string;
  total: number;
  slides: PresentacionPreviewSlide[];
}

export async function getPresentacionPreview(id: string): Promise<PresentacionPreview> {
  const { data } = await api.get<PresentacionPreview>(`/presentaciones/${id}/preview`);
  return data;
}
export async function deletePresentacion(id: string): Promise<void> {
  await api.delete(`/presentaciones/${id}`);
}
