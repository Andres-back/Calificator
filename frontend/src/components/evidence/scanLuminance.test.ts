import { describe, expect, it } from 'vitest';
import { blendScanLuminance } from './scanLuminance';

describe('bounded gentle scan luminance', () => {
  it('matches the existing truncation for every pair of 8-bit luminance values', () => {
    const target = new Uint8Array(256 * 256);
    const enhanced = new Uint8Array(target.length);
    const expected = new Uint8Array(target.length);
    for (let index = 0; index < target.length; index++) {
      target[index] = Math.floor(index / 256);
      enhanced[index] = index % 256;
      expected[index] = Math.trunc(target[index] * 0.85 + enhanced[index] * 0.15);
    }
    const untouched = enhanced.slice();
    blendScanLuminance(target, enhanced);
    expect(target).toEqual(expected);
    expect(enhanced).toEqual(untouched);
  });
  it('rejects mismatched buffers before changing any pixels', () => {
    const target = new Uint8Array([40, 100]);
    expect(() => blendScanLuminance(target, new Uint8Array([80]))).toThrow();
    expect([...target]).toEqual([40, 100]);
  });
});
