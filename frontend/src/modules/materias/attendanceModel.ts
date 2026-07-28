import type {
  AsistenciaDia,
  AsistenciaDiaInput,
  AsistenciaEstado,
  AsistenciaResumen,
} from './asistenciaApi';

export interface AttendanceDraftRow {
  estado: AsistenciaEstado | null;
  observacion: string;
}

export type AttendanceDraft = Record<string, AttendanceDraftRow>;

export function createAttendanceDraft(day: AsistenciaDia): AttendanceDraft {
  return Object.fromEntries(
    day.registros.map((record) => [
      record.estudiante_id,
      {
        estado: record.estado,
        observacion: record.observacion ?? '',
      },
    ]),
  );
}

export function summarizeAttendanceDraft(draft: AttendanceDraft): AsistenciaResumen {
  const rows = Object.values(draft);
  const summary: AsistenciaResumen = {
    total: rows.length,
    presentes: 0,
    tarde: 0,
    ausentes: 0,
    excusas: 0,
    pendientes: 0,
  };

  for (const row of rows) {
    if (row.estado === 'presente') summary.presentes += 1;
    else if (row.estado === 'tarde') summary.tarde += 1;
    else if (row.estado === 'ausente') summary.ausentes += 1;
    else if (row.estado === 'excusa') summary.excusas += 1;
    else summary.pendientes += 1;
  }
  return summary;
}

export function markPendingPresent(draft: AttendanceDraft): AttendanceDraft {
  return Object.fromEntries(
    Object.entries(draft).map(([studentId, row]) => [
      studentId,
      row.estado ? row : { ...row, estado: 'presente' as const },
    ]),
  );
}

function normalizeObservation(value: string): string {
  return value.trim();
}

export function isAttendanceDraftDirty(
  draft: AttendanceDraft,
  baseline: AttendanceDraft,
): boolean {
  const studentIds = Object.keys(draft);
  if (studentIds.length !== Object.keys(baseline).length) return true;
  return studentIds.some((studentId) => {
    const current = draft[studentId];
    const saved = baseline[studentId];
    return (
      !saved ||
      current.estado !== saved.estado ||
      normalizeObservation(current.observacion) !== normalizeObservation(saved.observacion)
    );
  });
}

export function buildAttendancePayload(
  fecha: string,
  draft: AttendanceDraft,
): AsistenciaDiaInput | null {
  if (Object.values(draft).some((row) => row.estado === null)) return null;
  return {
    fecha,
    registros: Object.entries(draft).map(([estudiante_id, row]) => ({
      estudiante_id,
      estado: row.estado as AsistenciaEstado,
      observacion: normalizeObservation(row.observacion) || null,
    })),
  };
}

export function localDateIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
