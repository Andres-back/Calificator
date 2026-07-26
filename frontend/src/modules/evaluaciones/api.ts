import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import type { DBARead, EntregaOnlineCreate, EntregaRead, Evaluacion, EvaluacionModalidad } from '@/types/api';

export interface EvaluacionCreate {
  materia_id: string;
  nombre: string;
  descripcion?: string;
  tipo_origen?: string;
  modalidad?: EvaluacionModalidad;
  nota_maxima?: number;
  dba_ids?: string[];
  dba_personalizado_ids?: string[];
  metas_profesor?: string[];
  criterios?: Record<string, unknown>[];
  preguntas?: Record<string, unknown>[];
  respuestas_esperadas?: Record<string, unknown>[];
}

export type EvaluacionUpdate = Partial<Omit<EvaluacionCreate, 'materia_id' | 'tipo_origen'>>;

export interface ListDBAParams {
  area?: string;
  grado?: string;
}

export async function listEvaluaciones(materiaId: string): Promise<Evaluacion[]> {
  const { data } = await api.get<Evaluacion[]>(`/materias/${materiaId}/evaluaciones`);
  return data;
}
export async function getEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.get<Evaluacion>(`/evaluaciones/${id}`);
  return data;
}
export async function createEvaluacion(payload: EvaluacionCreate): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>('/evaluaciones', payload);
  return data;
}
export async function updateEvaluacion(id: string, payload: EvaluacionUpdate): Promise<Evaluacion> {
  const { data } = await api.patch<Evaluacion>(`/evaluaciones/${id}`, payload);
  return data;
}
export async function publicarEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/publicar`);
  return data;
}
export async function cerrarEvaluacion(id: string): Promise<Evaluacion> {
  const { data } = await api.post<Evaluacion>(`/evaluaciones/${id}/cerrar`);
  return data;
}
export async function crearEntregaOnline(evaluacionId: string, payload: EntregaOnlineCreate): Promise<EntregaRead> {
  const { data } = await api.post<EntregaRead>(`/evaluaciones/${evaluacionId}/entregas`, payload);
  return data;
}
export async function listDBA(params?: ListDBAParams): Promise<DBARead[]> {
  const { data } = await api.get<DBARead[]>('/dba', { params });
  return data;
}

export function useEvaluacion(id: string) {
  return useQuery({
    queryKey: ['evaluacion', id],
    queryFn: () => getEvaluacion(id),
    enabled: Boolean(id),
  });
}
