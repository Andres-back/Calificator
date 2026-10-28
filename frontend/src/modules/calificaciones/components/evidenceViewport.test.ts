import { describe, expect, it } from 'vitest';
import { clampEvidenceViewport, evidenceImageLayout, focusEvidenceRegion, panEvidenceViewport, validEvidenceBox, zoomEvidenceViewport } from './evidenceViewport';

const dimensions = { width: 400, height: 300, imageWidth: 800, imageHeight: 1200 };
const initial = { zoom: 1, centerX: 0.5, centerY: 0.5 };

describe('evidenceViewport', () => {
  it('ajusta la hoja entera descontando las bandas laterales', () => {
    expect(evidenceImageLayout(dimensions, initial)).toMatchObject({ width: 200, height: 300, left: 100, top: 0 });
  });
  it('centra una región conocida con margen y conserva proporciones', () => {
    const viewport = focusEvidenceRegion(dimensions, [0.2, 0.35, 0.3, 0.1]);
    const layout = evidenceImageLayout(dimensions, viewport)!;
    expect(viewport.zoom).toBeGreaterThan(1);
    expect(layout.width / layout.height).toBeCloseTo(800 / 1200);
    expect(layout.left + 0.35 * layout.width).toBeCloseTo(200);
    expect(layout.top + 0.4 * layout.height).toBeCloseTo(150);
  });
  it.each([null, [], [0, 0, 0, 1], [-0.1, 0, 1, 1], [0.9, 0, 0.2, 1], [0, 0, NaN, 1], [0, 0, Infinity, 1], ['0', 0, 1, 1]].map((box) => ({ box })))('rechaza una caja inválida sin inventar ubicación: $box', ({ box }) => {
    expect(validEvidenceBox(box)).toBe(false);
  });
  it('admite el borde y la hoja completa', () => {
    expect(validEvidenceBox([0, 0, 1, 1])).toBe(true);
    expect(focusEvidenceRegion(dimensions, [0, 0, 1, 1])).toEqual(initial);
  });
  it('sin región vuelve a la hoja completa y acota geometría no finita', () => {
    expect(focusEvidenceRegion(dimensions, undefined)).toEqual(initial);
    expect(clampEvidenceViewport(dimensions, { zoom: Infinity, centerX: NaN, centerY: Infinity })).toEqual(initial);
    expect(evidenceImageLayout({ ...dimensions, width: 0 }, initial)).toBeNull();
  });
  it('el zoom no mueve el punto de la imagen situado bajo el ancla', () => {
    const before = { ...initial, zoom: 3 };
    const anchor = { x: 150, y: 120 };
    const next = zoomEvidenceViewport(dimensions, before, 1.5, anchor);
    const a = evidenceImageLayout(dimensions, before)!;
    const b = evidenceImageLayout(dimensions, next)!;
    expect((anchor.x - a.left) / a.width).toBeCloseTo((anchor.x - b.left) / b.width);
    expect((anchor.y - a.top) / a.height).toBeCloseTo((anchor.y - b.top) / b.height);
  });
  it('acota desplazamiento y ampliación para no perder la hoja', () => {
    const next = panEvidenceViewport(dimensions, { ...initial, zoom: 2 }, 10000, -10000);
    const layout = evidenceImageLayout(dimensions, next)!;
    expect(layout.top).toBeLessThanOrEqual(0);
    expect(layout.top + layout.height).toBeGreaterThanOrEqual(dimensions.height);
    expect(zoomEvidenceViewport(dimensions, initial, 100).zoom).toBe(8);
    expect(zoomEvidenceViewport(dimensions, initial, 0.01).zoom).toBe(1);
  });
});
