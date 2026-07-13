import { api } from '@/lib/api';
import type { Materia, MateriaConEstudiantes } from '@/types/api';

export interface MateriaCreate {
  nombre: string;
  area?: string;
  grado?: string;
  descripcion?: string;
  requiere_aprobacion?: boolean;
}

export async function listMaterias(): Promise<Materia[]> {
  const { data } = await api.get<Materia[]>('/materias');
  return data;
}
export async function getMateria(id: string): Promise<Materia> {
  const { data } = await api.get<Materia>(`/materias/${id}`);
  return data;
}
export async function getMateriaEstudiantes(id: string): Promise<MateriaConEstudiantes> {
  const { data } = await api.get<MateriaConEstudiantes>(`/materias/${id}/estudiantes`);
  return data;
}
export async function createMateria(payload: MateriaCreate): Promise<Materia> {
  const { data } = await api.post<Materia>('/materias', payload);
  return data;
}
export async function unirseMateria(codigo: string): Promise<unknown> {
  const { data } = await api.post('/matriculas/unirse', { codigo_matricula: codigo });
  return data;
}
export async function regenerateCode(id: string): Promise<Materia> {
  const { data } = await api.post<Materia>(`/materias/${id}/regenerar-codigo`);
  return data;
}
export async function updateMateria(id: string, payload: Partial<MateriaCreate> & { estado?: string; codigo_activo?: boolean }): Promise<Materia> {
  const { data } = await api.patch<Materia>(`/materias/${id}`, payload);
  return data;
}
