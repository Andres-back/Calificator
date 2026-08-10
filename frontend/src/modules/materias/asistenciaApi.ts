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

export interface AsistenciaReporteResumen {
  total_registros: number;
  presentes: number;
  tarde: number;
  ausentes: number;
  excusas: number;
  porcentaje_asistencia: number;
}

export interface AsistenciaReporteEstudiante extends AsistenciaReporteResumen {
  estudiante_id: string;
  estudiante_nombre: string;
  estudiante_email: string;
}

export interface AsistenciaReporteDia extends AsistenciaReporteResumen {
  fecha: string;
}

export interface AsistenciaReporte {
  materia_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  jornadas_registradas: number;
  resumen: AsistenciaReporteResumen;
  estudiantes: AsistenciaReporteEstudiante[];
  jornadas: AsistenciaReporteDia[];
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

export async function getAsistenciaReporte(
  materiaId: string,
  fechaDesde: string,
  fechaHasta: string,
): Promise<AsistenciaReporte> {
  const { data } = await api.get<AsistenciaReporte>(
    `/materias/${materiaId}/asistencia/reporte`,
    { params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta } },
  );
  return data;
}

export async function saveAsistenciaDia(
  materiaId: string,
  payload: AsistenciaDiaInput,
): Promise<AsistenciaDia> {
  const { data } = await api.put<AsistenciaDia>(`/materias/${materiaId}/asistencia`, payload);
  return data;
}
