import { api } from '@/lib/api';
import type { DBAPersonalizado, DBAUnifiedItem } from '@/types/api';

export interface DBAPersonalizadoInput {
  enunciado: string;
  evidencias_aprendizaje?: string;
  ejemplo?: string;
  area?: string;
  grado?: string;
}

export async function listDbaPersonalizados(materiaId: string): Promise<DBAPersonalizado[]> {
  const { data } = await api.get<DBAPersonalizado[]>(`/materias/${materiaId}/dba-personalizados`);
  return data;
}

export async function listDbaCombinado(materiaId: string): Promise<DBAUnifiedItem[]> {
  const { data } = await api.get<DBAUnifiedItem[]>(`/materias/${materiaId}/dba`);
  return data;
}

export async function createDbaPersonalizado(materiaId: string, payload: DBAPersonalizadoInput): Promise<DBAPersonalizado> {
  const { data } = await api.post<DBAPersonalizado>(`/materias/${materiaId}/dba-personalizados`, payload);
  return data;
}

export async function updateDbaPersonalizado(id: string, payload: Partial<DBAPersonalizadoInput> & { activo?: boolean }): Promise<DBAPersonalizado> {
  const { data } = await api.patch<DBAPersonalizado>(`/dba-personalizados/${id}`, payload);
  return data;
}

export async function deleteDbaPersonalizado(id: string): Promise<void> {
  await api.delete(`/dba-personalizados/${id}`);
}
