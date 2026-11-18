import { api } from '@/lib/api';

export interface CapturedText {
  texto: string;
  origen: string;
  advertencias: string[];
  paginas: number;
}

/** Tipos que el servidor sabe leer; las fotos también pueden venir de la cámara. */
export const TEXT_CAPTURE_ACCEPT = [
  'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  '.pdf', '.docx', '.xlsx', '.csv', '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv', 'text/plain',
].join(',');

export const TEXT_CAPTURE_MAX_BYTES = 20 * 1024 * 1024;

/** Lee el texto de una foto o un archivo. El servidor no guarda el archivo. */
export async function captureText(file: File, signal?: AbortSignal): Promise<CapturedText> {
  const form = new FormData();
  form.append('archivo', file);
  const { data } = await api.post<CapturedText>('/captura-texto', form, { signal, timeout: 180_000 });
  return data;
}

/** Añade el texto leído sin borrar lo que el docente ya había escrito. */
export function mergeCapturedText(current: string | null | undefined, incoming: string, maxLength?: number): string {
  const existing = (current ?? '').trimEnd();
  const merged = existing ? `${existing}\n\n${incoming.trim()}` : incoming.trim();
  return maxLength ? merged.slice(0, maxLength) : merged;
}
