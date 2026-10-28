export type ScanPoint = [number, number];
export type ScanQuad = [ScanPoint, ScanPoint, ScanPoint, ScanPoint];
export type ScanRotation = 0 | 90 | 180 | 270;

/** Clockwise points in the EXIF-oriented source frame, never a fixed A4 ratio. */
export function validScanQuad(value: unknown): value is ScanQuad {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((point) => Array.isArray(point) && point.length === 2 && point.every((item) => typeof item === 'number' && Number.isFinite(item) && item >= 0 && item <= 1))) return false;
  const points = value as ScanQuad;
  let twiceArea = 0;
  for (let index = 0; index < 4; index += 1) {
    const [a, b, c] = [points[index], points[(index + 1) % 4], points[(index + 2) % 4]];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) <= 0.00001) return false;
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.01) return false;
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  return twiceArea >= 0.03;
}

export function scanOutputSize(width: number, height: number, quad: ScanQuad, maxSide = 2200) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 2 || height < 2 || !Number.isFinite(maxSide) || maxSide < 2 || !validScanQuad(quad)) throw new Error('Contorno o dimensiones de hoja no válidos.');
  const distance = (a: ScanPoint, b: ScanPoint) => Math.hypot((a[0] - b[0]) * (width - 1), (a[1] - b[1]) * (height - 1));
  const outputWidth = Math.max(distance(quad[0], quad[1]), distance(quad[3], quad[2])) + 1;
  const outputHeight = Math.max(distance(quad[0], quad[3]), distance(quad[1], quad[2])) + 1;
  const ratio = Math.min(1, maxSide / Math.max(outputWidth, outputHeight), Math.max(width, height) / Math.max(outputWidth, outputHeight));
  return { width: Math.max(2, Math.round(outputWidth * ratio)), height: Math.max(2, Math.round(outputHeight * ratio)) };
}

/** AI geometry is approximate: keep an enclosing margin, never crop tightly to ink. */
export function conservativeScanSuggestion(quad: ScanQuad): ScanQuad {
  const left = Math.max(0, Math.min(...quad.map(p => p[0])) - .06);
  const right = Math.min(1, Math.max(...quad.map(p => p[0])) + .06);
  const top = Math.max(0, Math.min(...quad.map(p => p[1])) - .06);
  const bottom = Math.min(1, Math.max(...quad.map(p => p[1])) + .06);
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

export function rotateScanPoint([x, y]: ScanPoint, rotation: ScanRotation): ScanPoint {
  if (rotation === 90) return [1 - y, x];
  if (rotation === 180) return [1 - x, 1 - y];
  if (rotation === 270) return [y, 1 - x];
  return [x, y];
}
