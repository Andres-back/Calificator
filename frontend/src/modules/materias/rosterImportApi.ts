import { api } from '@/lib/api';

export interface RosterRow {
  id: string;
  orden: number;
  nombre_detectado: string;
  nombre_revisado: string;
  confianza: number;
  requiere_revision: boolean;
  duplicado_confirmado: boolean;
  decision: 'crear' | 'omitir' | 'asociar';
  estudiante_existente_id: string | null;
  advertencias: string[];
}

export interface RosterBatch {
  id: string;
  materia_id: string;
  job_id: string | null;
  archivo_nombre: string;
  estado: 'procesando' | 'revision' | 'confirmado' | 'cancelado' | 'error';
  resultado_json: Record<string, unknown>;
  filas: RosterRow[];
  created_at: string;
}

export interface ExistingStudent {
  id: string;
  nombre: string;
  email: string;
  materias: string[];
}

export interface RosterConfirmation {
  creados: number;
  matriculados_existentes: number;
  ya_matriculados: number;
  omitidos: number;
  credenciales: { estudiante_id: string; nombre: string; email: string; password_temporal: string }[];
  credenciales_mostradas_una_vez: boolean;
}

export async function createRosterImport(materiaId: string, file: File) {
  const form = new FormData();
  form.append('archivo', file);
  const { data } = await api.post<{ id: string; job_id: string; estado: string }>(`/materias/${materiaId}/importaciones-estudiantes`, form);
  return data;
}
export async function getRosterImport(materiaId: string, batchId: string) {
  const { data } = await api.get<RosterBatch>(`/materias/${materiaId}/importaciones-estudiantes/${batchId}`);
  return data;
}
export async function listRosterImports(materiaId: string) {
  const { data } = await api.get<RosterBatch[]>(`/materias/${materiaId}/importaciones-estudiantes`);
  return data;
}
export async function cancelRosterImport(materiaId: string, batchId: string) {
  await api.delete(`/materias/${materiaId}/importaciones-estudiantes/${batchId}`);
}
export async function updateRosterImport(materiaId: string, batchId: string, rows: RosterRow[]) {
  const { data } = await api.put<RosterBatch>(`/materias/${materiaId}/importaciones-estudiantes/${batchId}`, { filas: rows.map(({ id, nombre_revisado, decision, estudiante_existente_id, duplicado_confirmado }) => ({ id, nombre_revisado, decision, estudiante_existente_id, duplicado_confirmado })) });
  return data;
}
export async function confirmRosterImport(materiaId: string, batchId: string) {
  const { data } = await api.post<RosterConfirmation>(`/materias/${materiaId}/importaciones-estudiantes/${batchId}/confirmar`);
  return data;
}
export async function listExistingStudents(materiaId: string, q = '') {
  const { data } = await api.get<ExistingStudent[]>(`/materias/${materiaId}/estudiantes-existentes`, { params: { q } });
  return data;
}
export async function enrollExistingStudents(materiaId: string, ids: string[]) {
  const { data } = await api.post<{ matriculados: number; ya_matriculados: number }>(`/materias/${materiaId}/estudiantes-existentes/matricular`, { estudiante_ids: ids });
  return data;
}
export async function resetTemporaryPassword(materiaId: string, studentId: string) {
  const { data } = await api.post<{ estudiante_id: string; email: string; password_temporal: string }>(`/materias/${materiaId}/estudiantes/${studentId}/clave-temporal`);
  return data;
}
