import { describe, expect, it } from 'vitest';
import { fitScanViewport } from './scanViewport';
import { conservativeScanSuggestion, validScanQuad } from './scanGeometry';

describe('encaje de la foto completa antes de ampliar', () => {
  it.each([[312, 420, 1.6], [312, 420, .47], [720, 280, 1.6], [650, 600, .47]])('encaja las cuatro esquinas en %s × %s', (width, height, ratio) => {
    const fit = fitScanViewport(width, height, ratio);
    expect(fit.width).toBeLessThanOrEqual(width);
    expect(fit.height).toBeLessThanOrEqual(height);
    expect(fit.height / fit.width).toBeCloseTo(ratio);
    expect(fit.width === width || fit.height === height).toBe(true);
  });
  it('no devuelve dimensiones inválidas durante el montaje', () => {
    expect(fitScanViewport(0, 0, 0)).toEqual({ width: 1, height: 1 });
  });
  it('una sugerencia asistida mantiene margen, incluso junto al marco de la foto', () => {
    const source = [[.055, .002], [.945, .002], [.945, .735], [.055, .735]] as const;
    const guarded = conservativeScanSuggestion(source.map(p => [...p]) as import('./scanGeometry').ScanQuad);
    expect(guarded.slice(0, 2)).toEqual([[0, 0], [1, 0]]);
    expect(guarded[2][1]).toBeCloseTo(.795, 8);
    expect(guarded[3][1]).toBeCloseTo(.795, 8);
    expect(validScanQuad(guarded)).toBe(true);
    expect(conservativeScanSuggestion([[0, 0], [1, 0], [1, 1], [0, 1]])).toEqual([[0, 0], [1, 0], [1, 1], [0, 1]]);
  });
});
