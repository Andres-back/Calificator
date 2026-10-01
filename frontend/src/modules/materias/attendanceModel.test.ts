import { describe, expect, it } from 'vitest';
import {
  buildAttendancePayload,
  createAttendanceDraft,
  searchAttendanceRecords,
  isAttendanceDraftDirty,
  localDateIso,
  markPendingPresent,
  summarizeAttendanceDraft,
} from './attendanceModel';
import type { AsistenciaDia } from './asistenciaApi';

const day: AsistenciaDia = {
  materia_id: 'materia-1',
  fecha: '2026-07-28',
  registros: [
    {
      estudiante_id: 'student-1',
      estudiante_nombre: 'Ana',
      estudiante_email: 'ana@example.test',
      estado: 'presente',
      observacion: null,
    },
    {
      estudiante_id: 'student-2',
      estudiante_nombre: 'Luis',
      estudiante_email: 'luis@example.test',
      estado: null,
      observacion: null,
    },
  ],
  resumen: {
    total: 2,
    presentes: 1,
    tarde: 0,
    ausentes: 0,
    excusas: 0,
    pendientes: 1,
  },
};

describe('attendanceModel', () => {
  it('searches names and email without changing identities or original positions', () => {
    const records = [...day.registros, { ...day.registros[0], estudiante_id: 'student-3', estudiante_nombre: 'María José', estudiante_email: 'interna-3@example.test' }];
    expect(searchAttendanceRecords(records, '  MARIA JOSE  ')).toEqual([{ student: records[2], index: 2 }]);
    expect(searchAttendanceRecords(records, 'INTERNA-3')).toEqual([{ student: records[2], index: 2 }]);
    expect(searchAttendanceRecords(records, '   ')).toHaveLength(3);
    expect(searchAttendanceRecords(records, 'sin coincidencias')).toEqual([]);
  });

  it('filters 100 students quickly while saving still includes hidden students and observations', () => {
    const records = Array.from({ length: 100 }, (_, index) => ({ ...day.registros[0], estudiante_id: `student-${index}`, estudiante_nombre: `Alumno ${index}`, estado: null, observacion: null }));
    const draft = createAttendanceDraft({ ...day, registros: records });
    draft['student-1'] = { estado: 'tarde', observacion: 'Autorización' };
    const start = performance.now();
    expect(searchAttendanceRecords(records, 'Alumno 99')).toHaveLength(1);
    expect(performance.now() - start).toBeLessThan(1000);
    expect(summarizeAttendanceDraft(draft).pendientes).toBe(99);
    expect(buildAttendancePayload(day.fecha, draft)).toBeNull();
    const complete = markPendingPresent(draft);
    expect(buildAttendancePayload(day.fecha, complete)?.registros).toHaveLength(100);
    expect(complete['student-1']).toEqual({ estado: 'tarde', observacion: 'Autorización' });
    expect(searchAttendanceRecords(records, '')).toHaveLength(100);
  });
  it('keeps saved marks and exposes pending students', () => {
    const draft = createAttendanceDraft(day);

    expect(draft['student-1'].estado).toBe('presente');
    expect(summarizeAttendanceDraft(draft).pendientes).toBe(1);
    expect(buildAttendancePayload(day.fecha, draft)).toBeNull();
  });

  it('marks only pending students as present and builds a complete payload', () => {
    const initial = createAttendanceDraft(day);
    const complete = markPendingPresent(initial);
    const payload = buildAttendancePayload(day.fecha, complete);

    expect(complete['student-1'].estado).toBe('presente');
    expect(complete['student-2'].estado).toBe('presente');
    expect(payload?.registros).toHaveLength(2);
    expect(summarizeAttendanceDraft(complete).pendientes).toBe(0);
  });

  it('detects meaningful local changes but ignores surrounding spaces in notes', () => {
    const baseline = createAttendanceDraft(day);
    const same = {
      ...baseline,
      'student-1': { ...baseline['student-1'], observacion: '   ' },
    };
    const changed = {
      ...baseline,
      'student-1': { ...baseline['student-1'], estado: 'tarde' as const },
    };

    expect(isAttendanceDraftDirty(same, baseline)).toBe(false);
    expect(isAttendanceDraftDirty(changed, baseline)).toBe(true);
  });

  it('creates a local date without UTC day shifts', () => {
    expect(localDateIso(new Date(2026, 6, 28, 23, 30))).toBe('2026-07-28');
  });
});
