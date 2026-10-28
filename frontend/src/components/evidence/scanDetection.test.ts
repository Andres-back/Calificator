import { describe, expect, it } from 'vitest';
import { approximateScanBoundary, straightScanBoundary } from './scanDetection';
import type { ScanQuad } from './scanGeometry';

describe('abstención geométrica de hoja curvada', () => {
  const quad: ScanQuad = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]];
  it('admite bordes rectos y una desviación pequeña de rasterización', () => {
    const points = new Int32Array([80, 110, 720, 110, 721, 990, 80, 990, 81, 600]);
    expect(straightScanBoundary(points, quad, 801, 1101)).toBe(true);
  });
  it('rechaza un borde ondulado aunque sus extremos formen un rectángulo', () => {
    const points: number[] = [80, 110, 720, 110, 720, 990, 80, 990];
    for (let y = 150; y < 950; y += 20) points.push(Math.round(80 + 30 * Math.sin(y / 85)), y);
    expect(straightScanBoundary(new Int32Array(points), quad, 801, 1101)).toBe(false);
  });
  it('aproxima una curva mediante una caja exterior con margen, no con el rectángulo interior', () => {
    const points = new Int32Array([80, 110, 720, 110, 720, 990, 80, 990, 50, 600]);
    const result = approximateScanBoundary(points, 801, 1101)!;
    expect(result[0][0]).toBeLessThan(50 / 800);
    expect(result[2][0]).toBeGreaterThan(720 / 800);
    expect(result[2][1]).toBeGreaterThan(990 / 1100);
  });
  it('no propone una caja para ruido pequeño o una imagen ya completa', () => {
    expect(approximateScanBoundary(new Int32Array([1, 1, 2, 2, 3, 3]), 1000, 1000)).toBeNull();
    expect(approximateScanBoundary(new Int32Array([0, 0, 999, 0, 999, 999, 0, 999]), 1000, 1000)).toBeNull();
  });
});
