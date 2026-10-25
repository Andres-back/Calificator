import { api } from '@/lib/api';
import type { EvaluationVisualManifest, EvaluationVisualTable, EvaluationVisualChart } from '@/types/api';

export type TeacherVisualBlock = EvaluationVisualManifest['bloques'][number];
export interface VisualScope { materia_id: string; evaluacion_id: string; expected_version_id?: string | null }
export interface VisualRequest extends VisualScope {
  request_key: string; pregunta_id: string; tipo: 'imagen' | 'dibujo' | 'tabla' | 'grafica'; descripcion: string;
  tabla?: EvaluationVisualTable; grafica?: EvaluationVisualChart;
  uso?: 'academico' | 'decoracion'; blanco_negro?: boolean; fondo_transparente?: boolean;
}
export interface VisualJob {
  estado: string; error?: string | null;
  resultado_json: { bloque?: TeacherVisualBlock; expected_version_id?: string | null };
}
export async function getVisualCapabilities() {
  return (await api.get<{ editor: boolean; generacion: boolean; importacion: boolean; max_bytes: number }>('/evaluaciones/contenido-visual/capacidades')).data;
}
export async function uploadVisual(scope: VisualScope, file: File, kind: 'imagen' | 'dibujo') {
  const form = new FormData();
  form.set('materia_id', scope.materia_id); form.set('evaluacion_id', scope.evaluacion_id);
  form.set('request_key', crypto.randomUUID()); form.set('clase', kind); form.set('file', file);
  return (await api.post<{ id: string }>('/evaluaciones/recursos', form)).data;
}
export async function createStructuredVisual(request: VisualRequest) {
  return (await api.post<{ bloque: TeacherVisualBlock }>('/evaluaciones/recursos/estructurado', request)).data;
}
export async function cropVisual(request: VisualRequest & { source_resource_id: string; region: number[] }) {
  return (await api.post<{ bloque: TeacherVisualBlock }>('/evaluaciones/recursos/recortar', request)).data;
}
export async function generateVisual(request: VisualRequest) {
  return (await api.post<{ job_id: string }>('/evaluaciones/recursos/generar', request)).data;
}
export async function readVisualJob(id: string) { return (await api.get<VisualJob>(`/jobs/${encodeURIComponent(id)}`)).data; }
export async function cancelVisualJob(id: string) { await api.post(`/jobs/${encodeURIComponent(id)}/cancelar`); }
export async function getVisualProposal(id: string, signal?: AbortSignal) {
  const result = (await api.get<Blob>(`/evaluaciones/recursos/${encodeURIComponent(id)}/propuesta`, { responseType: 'blob', signal })).data;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(result.type)) throw new Error('Material no disponible');
  return result;
}
