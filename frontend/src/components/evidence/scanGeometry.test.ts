import { describe, expect, it } from 'vitest';
import { scanOutputSize, validScanQuad, rotateScanPoint, type ScanQuad } from './scanGeometry';

const full: ScanQuad = [[0, 0], [1, 0], [1, 1], [0, 1]];

describe('scanGeometry', () => {
  it('admite hoja completa y tira ABCD sin imponer proporción A4', () => {
    expect(validScanQuad(full)).toBe(true);
    expect(scanOutputSize(1200, 300, full)).toEqual({ width: 1200, height: 300 });
    expect(scanOutputSize(4000, 3000, full)).toEqual({ width: 2200, height: 1650 });
  });
  it.each([
    [], [[0, 0], [1, 1], [1, 0], [0, 1]], [[0, 0], [1, 0], [0.1, 0.1], [0, 1]],
    [[0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0.0001]],
    [[0, 0], [1.1, 0], [1, 1], [0, 1]], [[0, 0], [NaN, 0], [1, 1], [0, 1]],
  ].map((points) => ({ points })))('rechaza un contorno inválido o degenerado: $points', ({ points }) => {
    expect(validScanQuad(points)).toBe(false);
    expect(() => scanOutputSize(800, 1200, points as unknown as ScanQuad)).toThrow();
  });
  it('orienta esquinas de forma reversible sin acumular filtros', () => {
    const point: [number, number] = [0.2, 0.3];
    expect(rotateScanPoint(point, 90)).toEqual([0.7, 0.2]);
    expect(rotateScanPoint(rotateScanPoint(point, 90), 270)[0]).toBeCloseTo(point[0]);
    expect(rotateScanPoint(rotateScanPoint(point, 90), 270)[1]).toBeCloseTo(point[1]);
  });
});
