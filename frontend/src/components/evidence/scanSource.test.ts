import { Blob as NativeBlob, File as NativeFile } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orientedScanFrame, scanSource } from './scanSource';

function tiff(orientation: number) {
  const bytes = new Uint8Array(26), view = new DataView(bytes.buffer);
  bytes.set([73, 73, 42, 0, 8, 0, 0, 0]);
  view.setUint16(8, 1, true); view.setUint16(10, 274, true); view.setUint16(12, 3, true);
  view.setUint32(14, 1, true); view.setUint16(18, orientation, true);
  return bytes;
}
function png(orientation: number, afterPixels = false) {
  const ihdr = new Uint8Array(25), view = new DataView(ihdr.buffer);
  view.setUint32(0, 13); ihdr.set([73, 72, 68, 82], 4);
  view.setUint32(8, 1100); view.setUint32(12, 800);
  const exif = new Uint8Array(38); new DataView(exif.buffer).setUint32(0, 26);
  exif.set([101, 88, 73, 102], 4); exif.set(tiff(orientation), 8);
  const idat = new Uint8Array([0, 0, 0, 0, 73, 68, 65, 84, 0, 0, 0, 0]);
  const iend = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0]);
  return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, ...ihdr, ...(afterPixels ? idat : exif), ...(afterPixels ? exif : idat), ...iend]);
}
function jpeg(orientation: number) {
  const payload = new Uint8Array([69, 120, 105, 102, 0, 0, ...tiff(orientation)]);
  return new Uint8Array([255, 216, 255, 225, 0, payload.length + 2, ...payload,
    255, 192, 0, 17, 8, 3, 32, 4, 76, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0, 255, 218, 0, 2, 255, 217]);
}
function webp(orientation: number) {
  const bytes = new Uint8Array(64), view = new DataView(bytes.buffer);
  bytes.set(new TextEncoder().encode('RIFF'), 0); view.setUint32(4, bytes.length - 8, true);
  bytes.set(new TextEncoder().encode('WEBPVP8X'), 8); view.setUint32(16, 10, true);
  bytes[20] = 8; bytes[24] = 75; bytes[25] = 4; bytes[27] = 31; bytes[28] = 3;
  bytes.set(new TextEncoder().encode('EXIF'), 30); view.setUint32(34, 26, true); bytes.set(tiff(orientation), 38);
  return bytes;
}
const file = (bytes: Uint8Array, type: string) => new NativeFile([bytes], 'source', { type }) as unknown as File;
beforeEach(() => vi.stubGlobal('Blob', NativeBlob));
afterEach(() => vi.unstubAllGlobals());

describe('deterministic scanner orientation without modifying the received file', () => {
  it('extracts/removes PNG EXIF even after pixels and keeps original bytes', async () => {
    for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) for (const late of [false, true]) {
      const bytes = png(orientation, late), original = file(bytes, 'image/png');
      const result = await scanSource(original);
      expect(result.orientation).toBe(orientation);
      expect(result.frame.width).toBe(orientation >= 5 ? 800 : 1100);
      expect(result.frame.height).toBe(orientation >= 5 ? 1100 : 800);
      expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(png(1).filter((_value, index) => index < 33 || index >= 71));
      expect(new Uint8Array(await original.arrayBuffer())).toEqual(bytes);
    }
  });
  it('removes JPEG APP1 and WebP EXIF without changing any encoded image chunks', async () => {
    for (let orientation = 1; orientation <= 8; orientation++) {
      const jpg = jpeg(orientation), original = file(jpg, 'image/jpeg');
      const parsed = await scanSource(original);
      expect(parsed.orientation).toBe(orientation);
      expect(new Uint8Array(await parsed.blob.arrayBuffer())).toEqual(new Uint8Array([...jpg.slice(0, 2), ...jpg.slice(38)]));
      const wp = webp(orientation), parsedWebp = await scanSource(file(wp, 'image/webp'));
      expect(parsedWebp.orientation).toBe(orientation);
      const cleaned = new Uint8Array(await parsedWebp.blob.arrayBuffer());
      expect(new DataView(cleaned.buffer).getUint32(4, true)).toBe(cleaned.length - 8);
      expect(cleaned[20] & 8).toBe(0);
      expect(cleaned.slice(21)).toEqual(wp.slice(21, 30));
    }
  });
  it('has explicit transforms for all eight orientations, including reflections', () => {
    for (let orientation = 1; orientation <= 8; orientation++) {
      const frame = orientedScanFrame(1100, 800, orientation);
      const [a, b, c, d, e, f] = frame.transform;
      const points = [[0, 0], [1100, 0], [1100, 800], [0, 800]].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
      expect(Math.min(...points.map(([x]) => x))).toBe(0);
      expect(Math.min(...points.map(([, y]) => y))).toBe(0);
      expect(Math.max(...points.map(([x]) => x))).toBe(frame.width);
      expect(Math.max(...points.map(([, y]) => y))).toBe(frame.height);
    }
  });
});
