import { describe, expect, it } from 'vitest';
import { imageHeaderDimensions, scanImageBudget } from './imageHeader';

function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width); view.setUint32(20, height);
  return bytes;
}

describe('preflight de escaneo sin decodificar la foto', () => {
  it('admite PNG por bytes y limita píxeles antes de decodificar', () => {
    expect(imageHeaderDimensions(png(4000, 3000))).toEqual({ width: 4000, height: 3000, mime: 'image/png' });
    expect(scanImageBudget(png(8000, 6000), 100_000)).toBe('pixel_budget');
    expect(scanImageBudget(png(4000, 4000), 100_000)).toBeNull();
    expect(scanImageBudget(png(4000, 3000), 11 * 1024 * 1024)).toBe('source_size_budget');
  });
  it('lee SOF de JPEG sin interpretar la orientación como dimensiones nuevas', () => {
    const bytes = new Uint8Array([255, 216, 255, 224, 0, 4, 0, 0, 255, 194, 0, 17, 8, 4, 176, 6, 64, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0]);
    expect(imageHeaderDimensions(bytes)).toEqual({ width: 1600, height: 1200, mime: 'image/jpeg' });
  });
  it('lee WebP extendido y rechaza cabeceras falsas, truncadas o vacías', () => {
    const bytes = new Uint8Array(30);
    bytes.set(new TextEncoder().encode('RIFF'), 0); bytes.set(new TextEncoder().encode('WEBPVP8X'), 8);
    bytes[24] = 255; bytes[25] = 3; bytes[27] = 255; bytes[28] = 2;
    expect(imageHeaderDimensions(bytes)).toEqual({ width: 1024, height: 768, mime: 'image/webp' });
    for (const invalid of [new Uint8Array(), bytes.slice(0, 20), png(0, 100), new Uint8Array([255, 216, 255, 225, 255, 255])]) {
      expect(imageHeaderDimensions(invalid)).toBeNull();
      expect(scanImageBudget(invalid, 100)).toBe('unsupported_image');
    }
  });
});
