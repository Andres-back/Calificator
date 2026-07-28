import { api } from '@/lib/api';

export type AsistenciaEstado = 'presente' | 'tarde' | 'ausente' | 'excusa';

export interface AsistenciaEstudiante {
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_email: string;
  estado: AsistenciaEstado | null;
  observacion: string | null;
}

export interface AsistenciaResumen {
  total: number;
  presentes: number;
  tarde: number;
  ausentes: number;
  excusas: number;
  pendientes: number;
}

export interface AsistenciaDia {
  materia_id: string;
  fecha: string;
  registros: AsistenciaEstudiante[];
  resumen: AsistenciaResumen;
}

export interface AsistenciaRegistroInput {
  estudiante_id: string;
  estado: AsistenciaEstado;
  observacion?: string | null;
}

export interface AsistenciaDiaInput {
  fecha: string;
  registros: AsistenciaRegistroInput[];
}

export async function getAsistenciaDia(materiaId: string, fecha: string): Promise<AsistenciaDia> {
  const { data } = await api.get<AsistenciaDia>(`/materias/${materiaId}/asistencia`, {
    params: { fecha },
  });
  return data;
}

export async function saveAsistenciaDia(
  materiaId: string,
  payload: AsistenciaDiaInput,
): Promise<AsistenciaDia> {
  const { data } = await api.put<AsistenciaDia>(`/materias/${materiaId}/asistencia`, payload);
  return data;
}
