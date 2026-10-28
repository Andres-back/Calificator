import { scanSource } from './scanSource';
import type { ScanPixels, ScanRendered } from './scanTypes';

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('unsupported_image')), type, quality));
}

let decodeQueue: Promise<void> = Promise.resolve();
const canceled = () => new DOMException('Preparación cancelada.', 'AbortError');

/** Serialize also across editor remounts; a pending browser decode cannot be aborted. */
export function scanCanvasBridge(file: File, includePreview: boolean, isCurrent: () => boolean): Promise<ScanPixels> {
  const run = decodeQueue.then(() => decode(file, includePreview, isCurrent));
  decodeQueue = run.then(() => undefined, () => undefined);
  return run;
}

/** WebKit without Worker OffscreenCanvas: bounded decode only; all CV stays in Worker. */
async function decode(file: File, includePreview: boolean, isCurrent: () => boolean): Promise<ScanPixels> {
  if (!isCurrent()) throw canceled();
  const normalized = await scanSource(file);
  if (typeof createImageBitmap !== 'function') throw new Error('unsupported_image');
  if (!isCurrent()) throw canceled();
  const bitmap = await createImageBitmap(normalized.blob, { imageOrientation: 'none' });
  const canvas = document.createElement('canvas');
  try {
    if (!isCurrent()) throw canceled();
    const { width: sourceWidth, height: sourceHeight } = normalized.frame;
    if (bitmap.width !== normalized.dimensions.width || bitmap.height !== normalized.dimensions.height) throw new Error('unsupported_image');
    const ratio = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(2, Math.round(sourceWidth * ratio)); canvas.height = Math.max(2, Math.round(sourceHeight * ratio));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('unsupported_image');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    const [a, b, c, d, e, f] = normalized.frame.transform;
    const sx = canvas.width / sourceWidth, sy = canvas.height / sourceHeight;
    context.setTransform(a * sx, b * sy, c * sx, d * sy, e * sx, f * sy);
    context.drawImage(bitmap, 0, 0); bitmap.close();
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data.buffer as ArrayBuffer;
    const sourcePreview = includePreview ? await canvasBlob(canvas, 'image/png') : undefined;
    if (!isCurrent()) throw canceled();
    return { rgba, width: canvas.width, height: canvas.height, sourceWidth, sourceHeight, sourcePreview };
  } finally { bitmap.close(); canvas.width = 1; canvas.height = 1; }
}

export async function encodeScanPreview(rendered: ScanRendered): Promise<Blob> {
  const { width, height, rgba } = rendered;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 2 || height < 2 || Math.max(width, height) > 1600 || rgba.byteLength !== width * height * 4) throw new Error('invalid_preview');
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('unsupported_image');
    context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
    return await canvasBlob(canvas, 'image/png');
  } finally { canvas.width = 1; canvas.height = 1; }
}
