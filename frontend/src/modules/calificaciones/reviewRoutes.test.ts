import { describe, expect, it, vi } from 'vitest';
import { buildReviewHref, isPendingReviewRoute, isReviewPath, resolveReviewContext, REVIEW_CONTEXT_PATH, safeReviewBookReturn } from './reviewRoutes';

describe('138 rutas de revisión compartidas', () => {
  it('distingue Pendientes del workspace para conservar un único monitor de trabajos', () => {
    expect(isPendingReviewRoute('/app/calificaciones', new URLSearchParams())).toBe(true);
    for (const query of ['evaluacion=e1', 'materia=m1', 'modo=carga', 'seleccionar=1']) {
      expect(isPendingReviewRoute('/app/calificaciones', new URLSearchParams(query))).toBe(false);
    }
    expect(isPendingReviewRoute('/app/materias/m1/evaluaciones/e1/revision', new URLSearchParams())).toBe(false);
    expect(isPendingReviewRoute('/app/calificaciones/boletin', new URLSearchParams())).toBe(false);
  });
  it('expone una ruta hermana y reconoce solo revisión global o contextual exacta', () => {
    expect(REVIEW_CONTEXT_PATH).toBe('/app/materias/:materiaId/evaluaciones/:evaluacionId/revision');
    expect(isReviewPath('/app/calificaciones')).toBe(true);
    expect(isReviewPath('/app/materias/m1/evaluaciones/e1/revision')).toBe(true);
    for (const path of ['/app/calificaciones/boletin', '/app/calificaciones-extra', '/app/materias/m1/boletin', '/app/materias/m1/evaluaciones/e1/revision/extra', '/app/materias/m1/evaluaciones/e1/revision/', '/app/materias/m%2F1/evaluaciones/e1/revision', '/app/materias/../evaluaciones/e1/revision', '/app/materias/%ZZ/evaluaciones/e1/revision']) {
      expect(isReviewPath(path), path).toBe(false);
    }
  });

  it('resuelve las referencias heredadas sin inventar contexto ni estado', () => {
    expect(resolveReviewContext('/app/calificaciones', new URLSearchParams('materia=m1&evaluacion=e1&calificacion=c1')))
      .toEqual({ materiaId: 'm1', evaluationId: 'e1', contextual: false, conflictingQuery: false });
    expect(resolveReviewContext('/app/calificaciones', new URLSearchParams()))
      .toEqual({ materiaId: '', evaluationId: '', contextual: false, conflictingQuery: false });
  });

  it('la ruta contextual prevalece y declara cualquier query de contexto contradictoria', () => {
    const path = '/app/materias/m1/evaluaciones/e1/revision';
    expect(resolveReviewContext(path, new URLSearchParams('materia=m1&evaluacion=e1&hoja=2')).conflictingQuery).toBe(false);
    expect(resolveReviewContext(path, new URLSearchParams()))
      .toEqual({ materiaId: 'm1', evaluationId: 'e1', contextual: true, conflictingQuery: false });
    for (const query of ['materia=m2', 'evaluacion=e2', 'materia=', 'evaluacion=', 'materia=m1&materia=m2']) {
      expect(resolveReviewContext(path, new URLSearchParams(query)), query)
        .toEqual({ materiaId: 'm1', evaluationId: 'e1', contextual: true, conflictingQuery: true });
    }
  });

  it('no degrada una ruta contextual malformada a un contexto global procedente de la query', () => {
    expect(resolveReviewContext('/app/materias/m%2F1/evaluaciones/e1/revision', new URLSearchParams('materia=m2&evaluacion=e2')))
      .toEqual({ materiaId: '', evaluationId: '', contextual: true, conflictingQuery: true });
  });

  it('construye ruta contextual solo cuando dispone de subjects.read y ambas referencias', () => {
    const options = { materiaId: 'm1', evaluationId: 'e1', gradeId: 'c1', studentId: 's1' };
    expect(buildReviewHref({ ...options, permissions: ['subjects.read'] }))
      .toBe('/app/materias/m1/evaluaciones/e1/revision?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
    for (const permissions of [undefined, [], ['grading.read'], ['grading.grade'], ['subjects.read-extra']]) {
      expect(buildReviewHref({ ...options, permissions }))
        .toBe('/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
    }
    expect(buildReviewHref({ materiaId: 'm1', permissions: ['subjects.read'] })).toBe('/app/calificaciones?materia=m1');
    expect(buildReviewHref({ permissions: ['subjects.read'] })).toBe('/app/calificaciones');
  });

  it('conserva selección, pregunta, hoja, modo, filtros, retorno seguro y parámetros adicionales sin mutarlos', () => {
    const params = new URLSearchParams({ materia: 'm1', evaluacion: 'e1', calificacion: 'c1', estudiante: 's1', pregunta: 'seccion-2:pregunta-1', hoja: '2', modo: 'revision', filtro: 'pendientes', vista: 'evidencia', q: 'Ríos y lagos', buscar: 'Ana María', volver: '/app/materias/m1/boletin?filtro=prioridad&buscar=Ana', ayuda: 'abierta' });
    const original = params.toString();
    const location = new URL(buildReviewHref({ params, permissions: ['subjects.read'] }), 'https://local.test');
    expect(location.pathname).toBe('/app/materias/m1/evaluaciones/e1/revision');
    expect(location.searchParams.toString()).toBe(original);
    expect(params.toString()).toBe(original);
  });

  it('las referencias explícitas sustituyen las heredadas sin modificar el objeto original', () => {
    const params = new URLSearchParams('materia=m-old&evaluacion=e-old&calificacion=c-old&estudiante=s-old&pregunta=pregunta%3A1');
    const result = new URL(buildReviewHref({ params, materiaId: 'm1', evaluationId: 'e1', gradeId: 'c1', studentId: 's1', permissions: ['subjects.read'] }), 'https://local.test');
    expect(result.pathname).toBe('/app/materias/m1/evaluaciones/e1/revision');
    expect(Object.fromEntries(result.searchParams)).toEqual({ materia: 'm1', evaluacion: 'e1', calificacion: 'c1', estudiante: 's1', pregunta: 'pregunta:1' });
    expect(params.get('materia')).toBe('m-old');
  });

  it('no crea rutas con referencias inseguras ni conserva parámetros malformados', () => {
    const params = new URLSearchParams({ materia: '../m1', evaluacion: 'e1', 'bad\nkey': 'x', titulo: 'bien', value: 'a\u0000b', volver: 'https://evil.test' });
    const url = new URL(buildReviewHref({ params, permissions: ['subjects.read'] }), 'https://local.test');
    expect(url.pathname).toBe('/app/calificaciones');
    expect(Object.fromEntries(url.searchParams)).toEqual({ evaluacion: 'e1', titulo: 'bien' });
    expect(buildReviewHref({ materiaId: 'm1', evaluationId: 'https://evil.test' })).toBe('/app/calificaciones?materia=m1');
  });

  it('no lee almacenamiento ni cambia la historia del navegador al construir destinos', () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('not allowed'); });
    expect(buildReviewHref({ materiaId: 'm1', evaluationId: 'e1' })).toContain('/app/calificaciones?');
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });
});

describe('138 retorno seguro al libro de la misma materia', () => {
  it('admite únicamente el libro exacto y su búsqueda propia', () => {
    expect(safeReviewBookReturn('/app/materias/m1/boletin', 'm1')).toBe('/app/materias/m1/boletin');
    const target = '/app/materias/m1/boletin?evaluacion=e1&filtro=prioridad&buscar=Ana%20Mar%C3%ADa';
    expect(safeReviewBookReturn(target, 'm1')).toBe(target);
  });
  it.each([null, '', '/app/materias/m2/boletin', 'https://evil.test/app/materias/m1/boletin', '//evil.test/app/materias/m1/boletin', '/app/materias/m1/boletin-extra', '/app/materias/m1/boletin/otra', '/app/materias/m1/boletin#fragmento', '/app/materias/m1/boletin?buscar=a\nb'])('rechaza destinos externos o ajenos: %s', (target) => {
    expect(safeReviewBookReturn(target, 'm1')).toBeNull();
  });
});
