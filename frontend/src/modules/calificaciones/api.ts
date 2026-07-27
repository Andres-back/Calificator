import { api } from '@/lib/api';
import type { BatchResult, BoletinItem, Calificacion, CalificacionDetalle, ResumenAcademico, SalonSesionRead } from '@/types/api';

export async function listCalificaciones(evaluacionId: string): Promise<Calificacion[]> {
  const { data } = await api.get<Calificacion[]>(`/evaluaciones/${evaluacionId}/calificaciones`);
  return data;
}
export async function confirmarNota(id: string, nota: number): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${id}/confirmar`, { nota_confirmada: nota });
  return data;
}
export async function ajustarNota(id: string, nota: number, feedback?: string): Promise<Calificacion> {
  const { data } = await api.patch<Calificacion>(`/calificaciones/${id}/ajustar`, { nota_confirmada: nota, feedback });
  return data;
}
export async function calificarFoto(evaluacionId: string, estudianteId: string, file: File): Promise<Calificacion> {
  const formData = new FormData();
  formData.append('evaluacion_id', evaluacionId);
  formData.append('estudiante_id', estudianteId);
  formData.append('foto', file);
  const { data } = await api.post<Calificacion>('/calificaciones/foto', formData);
  return data;
}
export async function iniciarSalon(evaluacionId: string): Promise<SalonSesionRead> {
  const { data } = await api.post<SalonSesionRead>('/calificaciones/modo-salon/iniciar', null, {
    params: { evaluacion_id: evaluacionId },
  });
  return data;
}
export async function getSalonSesion(sesionId: string): Promise<SalonSesionRead> {
  const { data } = await api.get<SalonSesionRead>(`/calificaciones/modo-salon/${sesionId}`);
  return data;
}

export async function salonFoto(sesionId: string, estudianteId: string, file: File): Promise<Calificacion> {
  const formData = new FormData();
  formData.append('estudiante_id', estudianteId);
  formData.append('foto', file);
  const { data } = await api.post<Calificacion>(`/calificaciones/modo-salon/${sesionId}/foto`, formData);
  return data;
}
export async function cerrarSalon(sesionId: string): Promise<void> {
  await api.delete(`/calificaciones/modo-salon/${sesionId}`);
}
export async function getBoletin(estudianteId: string, materiaId: string): Promise<BoletinItem[]> {
  const { data } = await api.get<BoletinItem[]>(`/estudiantes/${estudianteId}/boletin`, {
    params: { materia_id: materiaId },
  });
  return data;
}
export async function getResumenAcademico(estudianteId: string): Promise<ResumenAcademico> {
  const { data } = await api.get<ResumenAcademico>(`/estudiantes/${estudianteId}/resumen-academico`);
  return data;
}


/* ── Detalle ── */

export async function getCalificacionDetalle(calificacionId: string): Promise<CalificacionDetalle> {
  const { data } = await api.get<CalificacionDetalle>(`/calificaciones/${calificacionId}/detalle`);
  return data;
}


/* ── Batch ── */

export async function confirmarNotaBatch(items: { calificacion_id: string; nota_confirmada: number }[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/confirmar', { items });
  return data;
}

export async function ajustarNotaBatch(items: { calificacion_id: string; nota_confirmada: number; feedback?: string }[]): Promise<BatchResult> {
  const { data } = await api.post<BatchResult>('/calificaciones/lote/ajustar', { items });
  return data;
}