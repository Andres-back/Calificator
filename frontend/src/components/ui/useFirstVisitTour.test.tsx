import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFirstVisitTour } from './useFirstVisitTour';

describe('useFirstVisitTour', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre y registra el tour una sola vez por rol, id y versión', () => {
    const identity = { tourId: 'calificaciones', role: 'profesor', version: 3, delayMs: 20 };
    const first = renderHook(() => useFirstVisitTour(identity));

    expect(first.result.current.open).toBe(false);
    act(() => vi.advanceTimersByTime(20));
    expect(first.result.current.open).toBe(true);
    expect(localStorage.getItem('xcalificator:tour:profesor:calificaciones:v3')).toBe('completed');

    first.unmount();
    const second = renderHook(() => useFirstVisitTour(identity));
    act(() => vi.advanceTimersByTime(20));
    expect(second.result.current.open).toBe(false);
  });

  it('permite reabrir y cerrar manualmente una guía ya vista', () => {
    localStorage.setItem('xcalificator:tour:estudiante:boletin:v1', 'completed');
    const { result } = renderHook(() => useFirstVisitTour({ tourId: 'boletin', role: 'estudiante', version: 1 }));

    act(() => result.current.openTour());
    expect(result.current.open).toBe(true);
    act(() => result.current.closeTour());
    expect(result.current.open).toBe(false);
  });
});
