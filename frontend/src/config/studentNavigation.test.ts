import { describe, expect, it } from 'vitest';

import { adminNav, estudianteNav, profesorNav, visibleNavigationItems } from './nav';

describe('navegación del estudiante', () => {
  it('solo ofrece aprendizaje, entregas, resultados y ayuda', () => {
    expect(estudianteNav.map((item) => item.label)).toEqual([
      'Inicio',
      'Mis materias',
      'Mis actividades',
      'Mis resultados',
      'Ayuda con Xali',
    ]);
    expect(estudianteNav.map((item) => item.to)).not.toContain('/app/herramientas');
    expect(estudianteNav.map((item) => item.to)).not.toContain('/app/reportes');
    expect(estudianteNav.map((item) => item.to)).not.toContain('/app/admin/configuracion-ia');
  });

  it('builds a mixed menu from effective permissions without exposing other modules', () => {
    const allowed = new Set(['presentations.read']);
    const mixed = [...adminNav, ...profesorNav, ...estudianteNav]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.to === item.to) === index)
      .filter((item) => !item.permission || allowed.has(item.permission));

    expect(mixed.map((item) => item.label)).toEqual(['Inicio', 'Presentaciones']);
    expect(mixed.map((item) => item.label)).not.toContain('Usuarios');
    expect(mixed.map((item) => item.label)).not.toContain('Recursos');
  });
});

describe('calificación desde las evaluaciones', () => {
  it('oculta el acceso duplicado cuando el docente puede entrar desde materias', () => {
    const nav = visibleNavigationItems(profesorNav, new Set(['subjects.read', 'evaluations.read', 'grading.read']));
    expect(nav.map((item) => item.to)).toEqual(['/app', '/app/materias']);
  });

  it('conserva el acceso para roles sin navegación contextual y respeta permisos', () => {
    expect(visibleNavigationItems(profesorNav, new Set(['grading.read'])).map((item) => item.to))
      .toEqual(['/app', '/app/calificaciones']);
    expect(visibleNavigationItems(profesorNav, new Set(['subjects.read'])).map((item) => item.to))
      .toEqual(['/app', '/app/materias']);
  });

  it('no modifica resultados estudiantiles ni administración', () => {
    expect(visibleNavigationItems(estudianteNav, new Set(estudianteNav.map((item) => item.permission ?? '')))).toEqual(estudianteNav);
    expect(visibleNavigationItems(adminNav, new Set(adminNav.map((item) => item.permission ?? '')))).toEqual(adminNav);
  });
});
