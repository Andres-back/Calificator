import { createElement, StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBodyScrollLock } from './useBodyScrollLock';

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.body.removeAttribute('style');
    vi.restoreAllMocks();
  });

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

  it.each(['first', 'second'] as const)('restores the original styles when %s closes first', (order) => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';
    document.body.style.top = '4px';
    document.body.style.width = '90%';
    document.body.style.overscrollBehavior = 'contain';
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(125);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const first = renderHook(() => useBodyScrollLock(true));
    const second = renderHook(() => useBodyScrollLock(true));
    const [earlier, later] = order === 'first' ? [first, second] : [second, first];

    earlier.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    later.unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('relative');
    expect(document.body.style.top).toBe('4px');
    expect(document.body.style.width).toBe('90%');
    expect(document.body.style.overscrollBehavior).toBe('contain');
    expect(scrollTo).toHaveBeenLastCalledWith(0, 125);
  });

  it('releases and reacquires the lock as the viewport changes', () => {
    let matches = true;
    let change: (() => void) | undefined;
    const remove = vi.fn();
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      get matches() { return matches; },
      addEventListener: vi.fn((_event, listener) => { change = listener as () => void; }),
      removeEventListener: remove,
    } as unknown as MediaQueryList);
    const { unmount } = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    act(() => { matches = false; change?.(); });
    expect(document.body.style.overflow).toBe('');
    act(() => { matches = true; change?.(); });
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(remove).toHaveBeenCalledWith('change', change);
    expect(document.body.style.overflow).toBe('');
  });

  it('survives StrictMode and active state changes without leaving a lock', () => {
    const { rerender, unmount } = renderHook(({ active }) => useBodyScrollLock(active, 'all'), {
      initialProps: { active: true },
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({ active: false });
    expect(document.body.style.overflow).toBe('');
    rerender({ active: true });
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
