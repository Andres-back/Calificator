import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTeacherReviewResume, readTeacherReviewResume, saveTeacherReviewResume, teacherReviewResumeHref, TEACHER_REVIEW_RESUME_PREFIX } from './teacherReviewResume';

const context = { materiaId: 'm1', evaluacionId: 'e1', estudianteId: 's1', calificacionId: 'c1' };
const now = 1_800_000_000_000;
beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('marcador docente mínimo', () => {
  it('conserva solo IDs y construye destino interno sin modo de carga', () => {
    saveTeacherReviewResume('p1', { ...context, nombre: 'No guardar', nota: 5, url: 'https://other.test' } as typeof context, now);
    const saved = readTeacherReviewResume('p1', now)!;
    expect(saved).toEqual({ version: 1, userId: 'p1', ...context, updatedAt: now });
    expect(teacherReviewResumeHref(saved)).toBe('/app/calificaciones?materia=m1&evaluacion=e1&estudiante=s1&calificacion=c1');
    expect(localStorage.getItem(TEACHER_REVIEW_RESUME_PREFIX + 'p1')).not.toMatch(/No guardar|nota|https/);
  });
  it('aísla cuentas y elimina únicamente la referencia solicitada', () => {
    saveTeacherReviewResume('p1', context, now);
    expect(readTeacherReviewResume('p2', now)).toBeNull();
    saveTeacherReviewResume('p2', { materiaId: 'm2', evaluacionId: 'e2' }, now);
    clearTeacherReviewResume('p1');
    expect(readTeacherReviewResume('p1', now)).toBeNull();
    expect(readTeacherReviewResume('p2', now)?.materiaId).toBe('m2');
    localStorage.setItem('xc-theme', 'dark');
    clearTeacherReviewResume();
    expect(readTeacherReviewResume('p2', now)).toBeNull();
    expect(localStorage.getItem('xc-theme')).toBe('dark');
  });
  it.each([now + 7 * 86400000, now - 1])('descarta referencia caducada o futura al leer en %s', (readAt) => {
    saveTeacherReviewResume('p1', context, now);
    expect(readTeacherReviewResume('p1', readAt)).toBeNull();
  });
  it.each(['not-json', '[]', '{"version":9}', JSON.stringify({ version: 1, userId: 'p2', ...context, updatedAt: now })])('descarta datos malformados o de otra cuenta', (raw) => {
    localStorage.setItem(TEACHER_REVIEW_RESUME_PREFIX + 'p1', raw);
    expect(readTeacherReviewResume('p1', now)).toBeNull();
    expect(localStorage.getItem(TEACHER_REVIEW_RESUME_PREFIX + 'p1')).toBeNull();
  });
  it.each(['../m1', 'https://other.test', '', 'm1?x=1'])('rechaza identificadores que no son referencias internas: %s', (materiaId) => {
    saveTeacherReviewResume('p1', { ...context, materiaId }, now);
    expect(readTeacherReviewResume('p1', now)).toBeNull();
  });
  it('almacenamiento bloqueado nunca interrumpe navegación o sesión', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => saveTeacherReviewResume('p1', context, now)).not.toThrow();
    expect(readTeacherReviewResume('p1', now)).toBeNull();
    expect(() => clearTeacherReviewResume('p1')).not.toThrow();
  });
  it('no admite calificación sin identidad del estudiante para validarla', () => {
    saveTeacherReviewResume('p1', { materiaId: 'm1', evaluacionId: 'e1', calificacionId: 'c1' }, now);
    expect(readTeacherReviewResume('p1', now)).toBeNull();
  });
});
