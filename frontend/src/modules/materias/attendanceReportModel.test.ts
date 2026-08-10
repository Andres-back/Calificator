import { describe, expect, it } from 'vitest';
import {
  buildAttendanceReportCsv,
  monthReportRange,
  quarterReportRange,
  validateReportRange,
} from './attendanceReportModel';
import type { AsistenciaReporte } from './asistenciaApi';

describe('attendanceReportModel', () => {
  it('builds complete month ranges and caps the current month at today', () => {
    expect(monthReportRange('2026-07', '2026-08-08')).toEqual({
      desde: '2026-07-01',
      hasta: '2026-07-31',
    });
    expect(monthReportRange('2026-08', '2026-08-08')).toEqual({
      desde: '2026-08-01',
      hasta: '2026-08-08',
    });
  });

  it('builds quarter ranges and rejects future periods', () => {
    expect(quarterReportRange(2026, 2, '2026-08-08')).toEqual({
      desde: '2026-04-01',
      hasta: '2026-06-30',
    });
    expect(() => quarterReportRange(2026, 4, '2026-08-08')).toThrow(/fechas futuras/i);
  });

  it('validates custom ranges', () => {
    expect(validateReportRange('2026-08-02', '2026-08-01', '2026-08-08')).toMatch(
      /fecha inicial/i,
    );
    expect(validateReportRange('2026-08-01', '2026-08-08', '2026-08-08')).toBeNull();
  });

  it('exports both student and daily detail as spreadsheet-safe CSV', () => {
    const report: AsistenciaReporte = {
      materia_id: 'materia-1',
      fecha_desde: '2026-08-01',
      fecha_hasta: '2026-08-08',
      jornadas_registradas: 1,
      resumen: {
        total_registros: 2,
        presentes: 1,
        tarde: 1,
        ausentes: 0,
        excusas: 0,
        porcentaje_asistencia: 100,
      },
      estudiantes: [{
        estudiante_id: 'student-1',
        estudiante_nombre: '=Ana',
        estudiante_email: 'ana@example.test',
        total_registros: 1,
        presentes: 1,
        tarde: 0,
        ausentes: 0,
        excusas: 0,
        porcentaje_asistencia: 100,
      }],
      jornadas: [{
        fecha: '2026-08-01',
        total_registros: 2,
        presentes: 1,
        tarde: 1,
        ausentes: 0,
        excusas: 0,
        porcentaje_asistencia: 100,
      }],
    };

    const csv = buildAttendanceReportCsv(report, 'Biología');
    expect(csv).toContain('Resumen por estudiante');
    expect(csv).toContain('Detalle por jornada');
    expect(csv).toContain(`'=Ana`);
    expect(csv).toContain('2026-08-01');
  });
});
