import { routes } from '@/config/routes';

/** Shared presentation routes. They never grant access to a subject or grade. */
export const REVIEW_CONTEXT_PATH = routes.calificacionesContextual;

const GLOBAL_REVIEW_PATH = '/app/calificaciones';
const CONTEXT_PATH = /^\/app\/materias\/([^/]+)\/evaluaciones\/([^/]+)\/revision$/;
const REFERENCE = /^[A-Za-z0-9_-]{1,128}$/;
const unsafeText = (value: string) => [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

export interface ReviewContext {
  materiaId: string;
  evaluationId: string;
  contextual: boolean;
  conflictingQuery: boolean;
}

function reference(value: string | undefined | null): string {
  return value && REFERENCE.test(value) ? value : '';
}

function pathReferences(path: string): Pick<ReviewContext, 'materiaId' | 'evaluationId'> | null {
  const match = CONTEXT_PATH.exec(path);
  if (!match) return null;
  try {
    const materiaId = reference(decodeURIComponent(match[1]));
    const evaluationId = reference(decodeURIComponent(match[2]));
    return materiaId && evaluationId ? { materiaId, evaluationId } : null;
  } catch {
    return null;
  }
}

export function isReviewPath(path: string): boolean {
  return path === GLOBAL_REVIEW_PATH || pathReferences(path) !== null;
}

export function resolveReviewContext(path: string, params: URLSearchParams): ReviewContext {
  const contextual = pathReferences(path);
  if (contextual) {
    const conflictingQuery = params.getAll('materia').some(value => value !== contextual.materiaId)
      || params.getAll('evaluacion').some(value => value !== contextual.evaluationId);
    return { ...contextual, contextual: true, conflictingQuery };
  }
  if (CONTEXT_PATH.test(path)) return { materiaId: '', evaluationId: '', contextual: true, conflictingQuery: true };
  return {
    materiaId: reference(params.get('materia')),
    evaluationId: reference(params.get('evaluacion')),
    contextual: false,
    conflictingQuery: false,
  };
}

/** The global inbox has no embedded workspace monitor. Keep both callers aligned. */
export function isPendingReviewRoute(path: string, params: URLSearchParams): boolean {
  const context = resolveReviewContext(path, params);
  return path === GLOBAL_REVIEW_PATH && !context.evaluationId && !context.materiaId
    && !params.has('modo') && !params.has('seleccionar');
}

/** Only the book of the current subject is a return destination, never an origin. */
export function safeReviewBookReturn(requested: string | null, materiaId: string): string | null {
  const subject = reference(materiaId);
  if (!requested || !subject || unsafeText(requested) || requested.includes('\\') || requested.includes('#')) return null;
  const book = `/app/materias/${encodeURIComponent(subject)}/boletin`;
  if (requested !== book && !requested.startsWith(`${book}?`)) return null;
  const query = new URLSearchParams(requested.slice(book.length + 1));
  if ([...query].some(([key, value]) => unsafeText(key) || unsafeText(value))) return null;
  return requested;
}

export interface ReviewHrefOptions {
  evaluationId?: string;
  materiaId?: string;
  gradeId?: string;
  studentId?: string;
  params?: URLSearchParams;
  permissions?: readonly string[];
}

export function buildReviewHref({ evaluationId, materiaId, gradeId, studentId, params, permissions }: ReviewHrefOptions): string {
  const next = new URLSearchParams();
  // URLSearchParams encodes text (including accents and question keys) without
  // interpreting values as paths. Preserve compatible extra navigation fields.
  params?.forEach((value, key) => {
    if (key && !unsafeText(key) && !unsafeText(value)) next.append(key, value);
  });
  for (const [key, explicit] of [
    ['materia', materiaId], ['evaluacion', evaluationId],
    ['calificacion', gradeId], ['estudiante', studentId],
  ] as const) {
    const value = reference(explicit ?? next.get(key));
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const subject = next.get('materia') ?? '';
  const evaluation = next.get('evaluacion') ?? '';
  const requestedReturn = next.get('volver');
  if (requestedReturn !== null && !safeReviewBookReturn(requestedReturn, subject)) next.delete('volver');
  const path = subject && evaluation && permissions?.includes('subjects.read')
    ? `/app/materias/${encodeURIComponent(subject)}/evaluaciones/${encodeURIComponent(evaluation)}/revision`
    : GLOBAL_REVIEW_PATH;
  const query = next.toString();
  return query ? `${path}?${query}` : path;
}
