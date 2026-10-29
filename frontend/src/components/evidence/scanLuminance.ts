/** In-place bounded luminance blend; matches the original 8-bit truncation.
 * Mat.data creates an Emscripten view on every access: read each view once in
 * the caller, not four times per pixel. Chroma and image geometry stay intact.
 */
export function blendScanLuminance(luminance: Uint8Array, enhanced: Uint8Array): void {
  if (luminance.length !== enhanced.length) throw new Error('invalid_luminance_buffer');
  for (let index = 0; index < luminance.length; index++) {
    luminance[index] = Math.trunc(luminance[index] * 0.85 + enhanced[index] * 0.15);
  }
}
