import { describe, expect, it } from 'vitest';

import { estudianteNav } from './nav';

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
});
