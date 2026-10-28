import { imageHeaderDimensions, scanImageBudget } from './imageHeader';

type Transform = [number, number, number, number, number, number];
const text = (bytes: Uint8Array, offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));

export function orientedScanFrame(width: number, height: number, orientation: number) {
  const transforms: Transform[] = [
    [1, 0, 0, 1, 0, 0], [-1, 0, 0, 1, width, 0], [-1, 0, 0, -1, width, height], [1, 0, 0, -1, 0, height],
    [0, 1, 1, 0, 0, 0], [0, 1, -1, 0, height, 0], [0, -1, -1, 0, height, width], [0, -1, 1, 0, 0, width],
  ];
  const index = Number.isInteger(orientation) && orientation >= 1 && orientation <= 8 ? orientation - 1 : 0;
  return { width: index >= 4 ? height : width, height: index >= 4 ? width : height, transform: transforms[index] };
}

function exifOrientation(payload: Uint8Array): number {
  const start = text(payload, 0, 6) === 'Exif\0\0' ? 6 : 0;
  if (payload.length < start + 8) return 1;
  const little = text(payload, start, 2) === 'II';
  if (!little && text(payload, start, 2) !== 'MM') return 1;
  const view = new DataView(payload.buffer, payload.byteOffset + start, payload.length - start);
  if (view.getUint16(2, little) !== 42) return 1;
  const offset = view.getUint32(4, little);
  if (offset > view.byteLength - 2) return 1;
  const count = view.getUint16(offset, little);
  if (count > 4096 || count * 12 > view.byteLength - offset - 2) return 1;
  for (let index = 0; index < count; index++) {
    const item = offset + 2 + index * 12;
    if (view.getUint16(item, little) === 274 && view.getUint16(item + 2, little) === 3 && view.getUint32(item + 4, little) === 1) {
      const value = view.getUint16(item + 8, little);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

/** Strip ONLY orientation-bearing EXIF from a local decode copy, not pixels.
 * Some engines ignore PNG eXIf (even with from-image); others apply it. Feeding
 * EXIF-free encoded pixels and applying one explicit canvas transform keeps the
 * same oriented frame as the server, including mirrored/late-EXIF sources.
 */
export async function scanSource(file: File) {
  const header = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const budget = scanImageBudget(header, file.size);
  if (budget) throw new Error(budget);
  const dimensions = imageHeaderDimensions(header)!;
  const bytes = file.size <= header.length ? header : new Uint8Array(await file.slice(0, file.size).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [];
  let orientation = 1, found = false, kept = 0;
  const remove = (start: number, end: number, payload: Uint8Array) => {
    const next = exifOrientation(payload);
    if (found && next !== orientation) throw new Error('unsupported_image');
    orientation = next; found = true;
    parts.push(bytes.subarray(kept, start)); kept = end;
  };
  if (dimensions.mime === 'image/png') {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = view.getUint32(offset), end = offset + 12 + size;
      if (end > bytes.length) throw new Error('unsupported_image');
      if (text(bytes, offset + 4, 4) === 'eXIf') remove(offset, end, bytes.subarray(offset + 8, end - 4));
      offset = end;
    }
  } else if (dimensions.mime === 'image/jpeg') {
    for (let offset = 2; offset + 4 <= bytes.length;) {
      const start = offset;
      if (bytes[offset++] !== 255) throw new Error('unsupported_image');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) throw new Error('unsupported_image');
      const size = view.getUint16(offset), end = offset + size;
      if (size < 2 || end > bytes.length) throw new Error('unsupported_image');
      if (marker === 225 && text(bytes, offset + 2, 6) === 'Exif\0\0') remove(start, end, bytes.subarray(offset + 2, end));
      offset = end;
    }
  } else {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const size = view.getUint32(offset + 4, true), end = offset + 8 + size + size % 2;
      if (end > bytes.length) throw new Error('unsupported_image');
      if (text(bytes, offset, 4) === 'EXIF') remove(offset, end, bytes.subarray(offset + 8, offset + 8 + size));
      offset = end;
    }
  }
  parts.push(bytes.subarray(kept));
  let blob: Blob;
  if (found && dimensions.mime === 'image/webp') {
    const merged = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) { merged.set(part, offset); offset += part.length; }
    new DataView(merged.buffer).setUint32(4, merged.length - 8, true);
    if (text(merged, 12, 4) === 'VP8X') merged[20] &= ~8;
    blob = new Blob([merged], { type: dimensions.mime });
  } else blob = new Blob(parts as BlobPart[], { type: dimensions.mime });
  return { blob, orientation, dimensions, frame: orientedScanFrame(dimensions.width, dimensions.height, orientation) };
}
