import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBodyScrollLock } from './useBodyScrollLock';

describe('useBodyScrollLock', () => {
  it('restores every body style when the mobile panel unmounts', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';

    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('relative');
  });
});