import { describe, expect, it } from 'vitest';
import { ANSWER_FOCUS_MAX_ZOOM, clampEvidenceViewport, expandAnswerRegion, evidenceImageLayout, evidenceRegionRect, fitEvidenceWidth, focusEvidenceRegion, panEvidenceViewport, rotateEvidenceBox, validEvidenceBox, zoomEvidenceViewport, type EvidenceBox, type EvidenceRotation } from './evidenceViewport';

const dimensions = { width: 400, height: 300, imageWidth: 800, imageHeight: 1200 };
const initial = { zoom: 1, centerX: 0.5, centerY: 0.5 };

describe('evidenceViewport', () => {
  it.each<[EvidenceRotation, EvidenceBox]>([
    [0, [0.1, 0.2, 0.3, 0.4]],
    [90, [0.4, 0.1, 0.4, 0.3]],
    [180, [0.6, 0.4, 0.3, 0.4]],
    [270, [0.2, 0.6, 0.4, 0.3]],
  ])('proyecta la región original en un giro de %i grados', (rotation, expected) => {
    const region = rotateEvidenceBox([0.1, 0.2, 0.3, 0.4], rotation);
    region.forEach((value, index) => expect(value).toBeCloseTo(expected[index]));
    expect(validEvidenceBox(region)).toBe(true);
    expect(rotateEvidenceBox([0, 0, 1, 1], rotation)).toEqual([0, 0, 1, 1]);
  });
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

describe('175 recuadro de la zona de una respuesta', () => {
  it('ubica la zona en píxeles del marco con la hoja completa y con la vista ampliada', () => {
    // A hoja completa la imagen de 800 × 1200 mide 200 × 300 y queda centrada en un marco de 400 × 300.
    expect(evidenceRegionRect(dimensions, initial, [0.1, 0.2, 0.4, 0.1])).toEqual({ left: 120, top: 60, width: 80, height: 30 });
    const zoomed = evidenceRegionRect(dimensions, { zoom: 2, centerX: 0.5, centerY: 0.5 }, [0.1, 0.2, 0.4, 0.1]);
    expect(zoomed).toEqual({ left: 40, top: -30, width: 160, height: 60 });
  });

  it('no inventa un recuadro sin zona válida o sin medidas', () => {
    expect(evidenceRegionRect(dimensions, initial, [0.9, 0.9, 0.5, 0.5])).toBeNull();
    expect(evidenceRegionRect(dimensions, initial, undefined)).toBeNull();
    expect(evidenceRegionRect({ ...dimensions, imageWidth: 0 }, initial, [0.1, 0.2, 0.4, 0.1])).toBeNull();
  });
});

describe('176 hoja ajustada al ancho', () => {
  it('amplía una hoja vertical hasta el ancho del marco y la deja arriba', () => {
    const view = fitEvidenceWidth(dimensions);
    expect(view.zoom).toBe(2);
    expect(evidenceImageLayout(dimensions, view)).toMatchObject({ left: 0, top: 0, width: 400, height: 600 });
  });

  it('no pasa de 2,5 aumentos ni amplía una hoja que ya llena el ancho', () => {
    expect(fitEvidenceWidth({ width: 1200, height: 300, imageWidth: 800, imageHeight: 1200 }).zoom).toBe(2.5);
    expect(fitEvidenceWidth({ width: 400, height: 300, imageWidth: 1200, imageHeight: 800 })).toEqual(initial);
    expect(fitEvidenceWidth({ ...dimensions, imageWidth: 0 })).toEqual(initial);
  });
});

describe('178 enfoque de una respuesta con la pregunta a la vista', () => {
  it('centra la zona sin pasar del límite pedido y sin límite conserva el enfoque ajustado', () => {
    const tight = focusEvidenceRegion(dimensions, [0.3, 0.4, 0.1, 0.03]);
    const capped = focusEvidenceRegion(dimensions, [0.3, 0.4, 0.1, 0.03], ANSWER_FOCUS_MAX_ZOOM);
    expect(ANSWER_FOCUS_MAX_ZOOM).toBe(2.5);
    expect(tight.zoom).toBeGreaterThan(6);
    expect(capped.zoom).toBe(2.5);
    expect(capped.centerX).toBeCloseTo(0.4, 1);
    expect(capped.centerY).toBeCloseTo(0.415, 2);
  });

  it('una zona grande que ya cabe con menos aumento no se amplía hasta el límite', () => {
    expect(focusEvidenceRegion(dimensions, [0.05, 0.05, 0.9, 0.9], ANSWER_FOCUS_MAX_ZOOM).zoom).toBeLessThan(1.2);
  });
});

describe('180 recuadro que abarca la pregunta', () => {
  const close = (actual: number[] | undefined, expected: number[]) => expected.forEach((value, index) => expect(actual![index]).toBeCloseTo(value, 5));

  it('en una hoja derecha crece a lo largo del renglón y a ambos lados, arriba y abajo', () => {
    // Fila de opciones: 30 % del ancho y 5 % del alto de la hoja.
    close(expandAnswerRegion([0.4, 0.5, 0.3, 0.05]), [0.2, 0.44, 0.7, 0.17]);
  });

  it('en una hoja de lado crece a lo largo de la columna y a ambos lados, sin suponer dónde está el enunciado', () => {
    // Caso real: la marca de la opción B en una foto girada 90°.
    close(expandAnswerRegion([0.48, 0.3, 0.024, 0.057]), [0.44, 0.1575, 0.104, 0.342]);
  });

  it('una marca pequeña recibe un margen mínimo en vez de un recuadro diminuto', () => {
    close(expandAnswerRegion([0.5, 0.5, 0.02, 0.02]), [0.44, 0.46, 0.14, 0.1]);
  });

  it('no se sale de la hoja y no inventa recuadro sin zona válida', () => {
    close(expandAnswerRegion([0.01, 0.02, 0.4, 0.1]), [0, 0, 0.61, 0.24]);
    close(expandAnswerRegion([0.7, 0.9, 0.29, 0.09]), [0.5, 0.792, 0.5, 0.208]);
    expect(expandAnswerRegion([0.9, 0.9, 0.5, 0.5])).toBeUndefined();
    expect(expandAnswerRegion(undefined)).toBeUndefined();
  });

  it('el recuadro ampliado contiene siempre la zona original', () => {
    for (const box of [[0.1, 0.2, 0.4, 0.1], [0.5, 0.5, 0.02, 0.02], [0, 0, 1, 1], [0.6, 0.85, 0.35, 0.1], [0.48, 0.3, 0.024, 0.057]] as const) {
      const [x, y, width, height] = expandAnswerRegion([...box])!;
      expect(x).toBeLessThanOrEqual(box[0]);
      expect(y).toBeLessThanOrEqual(box[1]);
      expect(x + width).toBeGreaterThanOrEqual(box[0] + box[2] - 1e-9);
      expect(y + height).toBeGreaterThanOrEqual(box[1] + box[3] - 1e-9);
      expect(x + width).toBeLessThanOrEqual(1 + 1e-9);
      expect(y + height).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
