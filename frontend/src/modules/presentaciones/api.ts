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

export async function downloadPresentacionFile(id: string, format: 'pptx' | 'pdf', title?: string): Promise<void> {
  const mime =
    format === 'pptx'
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/pdf';
  const { data, headers } = await api.get<Blob>(`/presentaciones/${id}/archivo/${format}`, {
    responseType: 'blob',
    headers: { Accept: mime },
  });

  const contentType = String(headers['content-type'] ?? data.type ?? '');
  const validType =
    format === 'pptx'
      ? contentType.includes('presentation') || contentType.includes('octet-stream')
      : contentType.includes('pdf') || contentType.includes('octet-stream');
  if (!validType) {
    const message = await data.text().catch(() => '');
    throw new Error(message || 'El backend no devolvio un archivo valido.');
  }

  const disposition = String(headers['content-disposition'] ?? '');
  const filename = filenameFromDisposition(disposition) ?? `${sanitizeFilename(title || 'presentacion')}.${format}`;
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getPresentacionEditorUrl(id: string): Promise<{ url: string; expires_in: number }> {
  const { data } = await api.post<{ url: string; expires_in: number }>(`/presentaciones/${id}/editor-url`);
  return data;
}

export async function deletePresentacion(id: string): Promise<void> {
  await api.delete(`/presentaciones/${id}`);
}

function filenameFromDisposition(disposition: string): string | null {
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ''));
  const plain = disposition.match(/filename="?([^";]+)"?/i);
  return plain?.[1]?.trim() || null;
}

function sanitizeFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'presentacion';
}
