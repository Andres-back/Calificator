export const SCAN_MAX_PIXELS = 16_000_000;
export const SCAN_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
type Dimensions = { width: number; height: number; mime: 'image/png' | 'image/jpeg' | 'image/webp' };

/** Bounded header inspection, before any browser/OpenCV full image decode. */
export function imageHeaderDimensions(bytes: Uint8Array): Dimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length));
  const result = (width: number, height: number, mime: Dimensions['mime']) => (
    width >= 2 && height >= 2 && Number.isSafeInteger(width * height) ? { width, height, mime } : null
  );
  if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value) && text(12, 4) === 'IHDR') {
    return result(view.getUint32(16), view.getUint32(20), 'image/png');
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) return null;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        return length >= 8 ? result(view.getUint16(offset + 5), view.getUint16(offset + 3), 'image/jpeg') : null;
      }
      offset += length;
    }
  }
  if (bytes.length >= 30 && text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
    const type = text(12, 4);
    const uint24 = (offset: number) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
    if (type === 'VP8X') return result(uint24(24) + 1, uint24(27) + 1, 'image/webp');
    if (type === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return result(view.getUint16(26, true) & 16383, view.getUint16(28, true) & 16383, 'image/webp');
    if (type === 'VP8L' && bytes[20] === 47) return result(1 + ((bytes[21] | bytes[22] << 8) & 16383), 1 + ((bytes[22] >> 6 | bytes[23] << 2 | bytes[24] << 10) & 16383), 'image/webp');
  }
  return null;
}

export function scanImageBudget(header: Uint8Array, bytes: number) {
  if (!Number.isFinite(bytes) || bytes > SCAN_MAX_SOURCE_BYTES) return 'source_size_budget';
  const dimensions = imageHeaderDimensions(header);
  if (!dimensions) return 'unsupported_image';
  return dimensions.width * dimensions.height > SCAN_MAX_PIXELS ? 'pixel_budget' : null;
}
