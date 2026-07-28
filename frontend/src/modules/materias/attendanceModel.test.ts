import { describe, expect, it } from 'vitest';
import {
  buildAttendancePayload,
  createAttendanceDraft,
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
