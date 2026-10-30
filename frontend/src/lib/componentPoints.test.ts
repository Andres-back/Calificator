import { expect, it } from 'vitest';
import { componentPoints } from './componentPoints';
it('137 conserva precisión significativa por pregunta sin ceros repetidos', () => {
  expect(componentPoints('.3572')).toBe('0.3572');
  expect(componentPoints('1.2500')).toBe('1.25');
  expect(componentPoints(0)).toBe('0.00');
  expect(componentPoints(null)).toBe('—');
  expect(componentPoints(.1 + .2)).toBe('0.30');
});
