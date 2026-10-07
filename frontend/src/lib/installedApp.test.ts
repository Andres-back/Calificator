import { afterEach, describe, expect, it, vi } from 'vitest';
import { isInstalledApp } from './installedApp';

afterEach(() => vi.unstubAllGlobals());

describe('installed app execution context', () => {
  it('recognizes Android standalone without inferring a user', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    expect(isInstalledApp()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
  });
  it('recognizes the iPhone standalone flag', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal('navigator', { standalone: true });
    expect(isInstalledApp()).toBe(true);
  });
  it('keeps a mobile browser or bookmark separate from installed mode', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal('navigator', { standalone: false, userAgent: 'iPhone' });
    expect(isInstalledApp()).toBe(false);
  });
  it('works when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('navigator', { standalone: true });
    expect(isInstalledApp()).toBe(true);
  });
  it('does not assume installed mode without signals', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('navigator', {});
    expect(isInstalledApp()).toBe(false);
  });
});
