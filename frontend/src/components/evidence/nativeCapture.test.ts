import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openEvidenceFilePicker, prefersNativeCapture } from './nativeCapture';

afterEach(() => {
  document.querySelectorAll('input[type="file"]').forEach((input) => input.remove());
  vi.restoreAllMocks();
});

describe('127 native camera policy', () => {
  it.each([
    ['iPhone', 'iPhone', 5, true], ['Android Mobile', 'Linux arm', 5, true],
    ['Android', 'Linux arm', 5, true], ['iPad', 'iPad', 5, true],
    ['Macintosh', 'MacIntel', 5, true], ['Macintosh', 'MacIntel', 0, false],
    ['Windows NT', 'Win32', 10, false], ['Linux x86_64', 'Linux', 0, false],
  ])('uses device hints, not viewport: %s/%s/%s', (userAgent, platform, maxTouchPoints, expected) => {
    expect(prefersNativeCapture({ userAgent, platform, maxTouchPoints })).toBe(expected);
  });
});

describe('127 selection lifecycle', () => {
  it('opens synchronously, requests rear camera without multiple or audio, accepts once and cleans up', () => {
    const onFiles = vi.fn();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const cancel = openEvidenceFilePicker({ nativeCamera: true, allowPdf: true, onFiles });
    expect(click).toHaveBeenCalledOnce();
    const input = document.querySelector('input[capture]') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBe('environment');
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(input.multiple).toBe(false);
    const image = new File(['one'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [image] } });
    fireEvent.change(input, { target: { files: [image] } });
    expect(onFiles).toHaveBeenCalledExactlyOnceWith([image]);
    expect(input.isConnected).toBe(false);
    cancel();
    click.mockRestore();
  });
  it('cancels safely and ignores late events from old controls', () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onFiles = vi.fn();
    const cancel = openEvidenceFilePicker({ nativeCamera: false, allowPdf: false, onFiles });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.multiple).toBe(true);
    expect(input.accept).not.toContain('pdf');
    cancel();
    fireEvent.change(input, { target: { files: [new File(['old'], 'old.png')] } });
    expect(onFiles).not.toHaveBeenCalled();
    expect(input.isConnected).toBe(false);
  });
  it('handles cancel, an empty result and repeated selections without a permanent control', () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onFiles = vi.fn();
    openEvidenceFilePicker({ nativeCamera: true, allowPdf: true, onFiles });
    fireEvent(document.querySelector('input')!, new Event('cancel'));
    expect(document.querySelector('input')).toBeNull();
    openEvidenceFilePicker({ nativeCamera: false, allowPdf: true, onFiles });
    const input = document.querySelector('input')!;
    expect(input.getAttribute('accept')).toContain('application/pdf');
    fireEvent.change(input, { target: { files: [] } });
    expect(document.querySelector('input')).toBeNull();
    expect(onFiles).not.toHaveBeenCalled();
  });
  it('does not infer cancellation from page visibility or focus', () => {
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const onFiles = vi.fn();
    openEvidenceFilePicker({ nativeCamera: true, allowPdf: false, onFiles });
    const input = document.querySelector('input')!;
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('focus'));
    fireEvent.change(input, { target: { files: [new File(['ok'], 'ok.png')] } });
    expect(onFiles).toHaveBeenCalledOnce();
  });
});
