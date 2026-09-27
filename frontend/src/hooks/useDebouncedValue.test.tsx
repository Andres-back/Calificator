import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  it('publishes only the last value after the configured pause', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    );

    rerender({ value: 'a' });
    rerender({ value: 'an' });
    rerender({ value: 'ana' });
    expect(result.current).toBe('');

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('ana');
    vi.useRealTimers();
  });
});
