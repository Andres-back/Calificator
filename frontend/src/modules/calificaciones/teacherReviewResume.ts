import { routes } from '@/config/routes';

export const TEACHER_REVIEW_RESUME_PREFIX = 'xcalificator.teacher-review.v1.';
const MAX_AGE_MS = 7 * 86400000;
export type TeacherReviewContext = { materiaId: string; evaluacionId: string; estudianteId?: string; calificacionId?: string };
export type TeacherReviewResume = TeacherReviewContext & { version: 1; userId: string; updatedAt: number };
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);

function normalize(value: unknown, userId: string, now: number): TeacherReviewResume | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || raw.userId !== userId || !validId(userId) || !validId(raw.materiaId) || !validId(raw.evaluacionId)
    || (raw.estudianteId !== undefined && !validId(raw.estudianteId)) || (raw.calificacionId !== undefined && (!validId(raw.calificacionId) || !validId(raw.estudianteId)))
    || typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt) || raw.updatedAt <= 0
    || raw.updatedAt > now || now - raw.updatedAt >= MAX_AGE_MS) return null;
  return { version: 1, userId, materiaId: raw.materiaId, evaluacionId: raw.evaluacionId, updatedAt: raw.updatedAt,
    ...(validId(raw.estudianteId) ? { estudianteId: raw.estudianteId } : {}),
    ...(validId(raw.calificacionId) ? { calificacionId: raw.calificacionId } : {}) };
}

export function saveTeacherReviewResume(userId: string, context: TeacherReviewContext, now = Date.now()) {
  const record = normalize({ ...context, version: 1, userId, updatedAt: now }, userId, now);
  if (!record) return;
  try { localStorage.setItem(TEACHER_REVIEW_RESUME_PREFIX + userId, JSON.stringify(record)); } catch { /* Optional convenience only. */ }
}

export function readTeacherReviewResume(userId: string, now = Date.now()): TeacherReviewResume | null {
  if (!validId(userId)) return null;
  try {
    const key = TEACHER_REVIEW_RESUME_PREFIX + userId;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const record = normalize(JSON.parse(raw), userId, now);
    if (!record) localStorage.removeItem(key);
    return record;
  } catch { clearTeacherReviewResume(userId); return null; }
}

export function clearTeacherReviewResume(userId?: string) {
  try {
    if (userId) { localStorage.removeItem(TEACHER_REVIEW_RESUME_PREFIX + userId); return; }
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    keys.forEach(key => { if (key?.startsWith(TEACHER_REVIEW_RESUME_PREFIX)) localStorage.removeItem(key); });
  } catch { /* Session cleanup must never depend on storage permission. */ }
}

export function teacherReviewResumeHref(record: TeacherReviewResume) {
  if (!validId(record.materiaId) || !validId(record.evaluacionId)) return routes.materias;
  const params = new URLSearchParams({ materia: record.materiaId, evaluacion: record.evaluacionId });
  if (validId(record.estudianteId)) params.set('estudiante', record.estudianteId);
  if (validId(record.calificacionId)) params.set('calificacion', record.calificacionId);
  return `${routes.calificacionesWorkspace}?${params.toString()}`;
}
