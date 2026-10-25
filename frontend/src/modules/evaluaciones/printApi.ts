import { api } from '@/lib/api';
import type { Evaluacion, EvaluationPrintSettings, EvaluationVisualManifest } from '@/types/api';

export interface PrintDraft {
  nombre?: string; descripcion?: string; lectura?: string | null;
  preguntas?: Record<string, unknown>[]; contenido_visual?: EvaluationVisualManifest;
}
export interface PrintJob {
  estado: string; error?: string;
  resultado_json: { configuracion?: EvaluationPrintSettings; paginas_reales?: number; meta_alcanzada?: boolean; advertencias?: string[] };
}
export async function preparePrint(evaluation: Evaluacion, configuracion: EvaluationPrintSettings, borrador?: PrintDraft) {
  return (await api.post<{ job_id: string }>('/evaluaciones/impresion/preparar', {
    evaluacion_id: evaluation.id, expected_updated_at: evaluation.updated_at,
    expected_content_version_id: evaluation.contenido_version_id ?? null, configuracion, ...(borrador ? { borrador } : {}),
  })).data;
}
export async function readPrintJob(id: string, signal?: AbortSignal) {
  return (await api.get<PrintJob>(`/jobs/${encodeURIComponent(id)}`, { signal })).data;
}
export async function preparedPrintPdf(id: string, signal?: AbortSignal) {
  const blob = (await api.get<Blob>(`/evaluaciones/impresion/${encodeURIComponent(id)}/pdf`, { responseType: 'blob', signal })).data;
  if (blob.type !== 'application/pdf') throw new Error('No pudimos abrir la vista preparada.');
  return blob;
}
export async function cancelPrint(id: string) { await api.post(`/jobs/${encodeURIComponent(id)}/cancelar`); }
