import { expect, it } from 'vitest';

// Spec 172, comprobación temporal: esta prueba falla a propósito para ver el corte en la CI.
it('falla a propósito para comprobar que la CI se detiene', () => {
  expect('la CI sigue corriendo').toBe('la CI se detuvo');
});
