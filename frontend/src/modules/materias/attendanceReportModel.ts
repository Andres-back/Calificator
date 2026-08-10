import type { AsistenciaReporte } from './asistenciaApi';

export interface AttendanceReportRange {
  desde: string;
  hasta: string;
}

function dateIso(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dateDay}`;
}

export function validateReportRange(
  desde: string,
  hasta: string,
  today: string,
): string | null {
  if (!desde || !hasta) return 'Selecciona las dos fechas del reporte.';
  if (desde > hasta) return 'La fecha inicial no puede ser posterior a la fecha final.';
  if (hasta > today) return 'El reporte no puede incluir fechas futuras.';
  return null;
}

export function monthReportRange(monthValue: string, today: string): AttendanceReportRange {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!match) throw new Error('Selecciona un mes válido.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const desde = dateIso(year, month - 1, 1);
  const monthEnd = dateIso(year, month, 0);
  if (desde > today) throw new Error('El reporte no puede incluir fechas futuras.');
  const hasta = monthEnd > today ? today : monthEnd;
  const error = validateReportRange(desde, hasta, today);
  if (error) throw new Error(error);
  return { desde, hasta };
}

export function quarterReportRange(
  year: number,
  quarter: number,
  today: string,
): AttendanceReportRange {
  if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new Error('Selecciona un trimestre válido.');
  }
  const firstMonth = (quarter - 1) * 3;
  const desde = dateIso(year, firstMonth, 1);
  const quarterEnd = dateIso(year, firstMonth + 3, 0);
  if (desde > today) throw new Error('El reporte no puede incluir fechas futuras.');
  const hasta = quarterEnd > today ? today : quarterEnd;
  const error = validateReportRange(desde, hasta, today);
  if (error) throw new Error(error);
  return { desde, hasta };
}

function csvCell(value: string | number): string {
  const quote = String.fromCharCode(34);
  let safe = String(value);
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  safe = safe.split(quote).join(quote + quote);
  return `${quote}${safe}${quote}`;
}

export function buildAttendanceReportCsv(
  report: AsistenciaReporte,
  materiaNombre: string,
): string {
  const rows: Array<Array<string | number>> = [
    ['Reporte de asistencia'],
    ['Materia', materiaNombre],
    ['Desde', report.fecha_desde],
    ['Hasta', report.fecha_hasta],
    ['Jornadas registradas', report.jornadas_registradas],
    ['Porcentaje de asistencia', `${report.resumen.porcentaje_asistencia}%`],
    [],
    ['Resumen por estudiante'],
    ['Estudiante', 'Correo', 'Registros', 'Presentes', 'Tarde', 'Ausentes', 'Excusas', 'Asistencia'],
    ...report.estudiantes.map((student) => [
      student.estudiante_nombre,
      student.estudiante_email,
      student.total_registros,
      student.presentes,
      student.tarde,
      student.ausentes,
      student.excusas,
      `${student.porcentaje_asistencia}%`,
    ]),
    [],
    ['Detalle por jornada'],
    ['Fecha', 'Registros', 'Presentes', 'Tarde', 'Ausentes', 'Excusas', 'Asistencia'],
    ...report.jornadas.map((day) => [
      day.fecha,
      day.total_registros,
      day.presentes,
      day.tarde,
      day.ausentes,
      day.excusas,
      `${day.porcentaje_asistencia}%`,
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
}
