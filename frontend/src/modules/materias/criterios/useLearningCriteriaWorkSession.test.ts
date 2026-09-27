import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trackEvent, type AnalyticsEventPayloads } from '@/lib/analytics';
import { useLearningCriteriaWorkSession } from './useLearningCriteriaWorkSession';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
const input = { materiaId: 'm1', open: true, phase: 'preparacion' as const, busy: false, assisted: false };
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const totals = () => vi.mocked(trackEvent).mock.calls.reduce((sum, [, payload]) => {
  const value = (payload as AnalyticsEventPayloads['learning_criteria_work_measured']).metadata_json;
  return [sum[0] + value.preparacion_ms, sum[1] + value.revision_ms, sum[2] + value.espera_solicitud_ms];
}, [0, 0, 0]);

describe('criteria work measurement', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
    vi.mocked(trackEvent).mockClear();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });
  afterEach(() => vi.useRealTimers());

  it('does not record anything without explicit opt-in', () => {
    const view = renderHook(() => useLearningCriteriaWorkSession(input));
    advance(90_000);
    view.unmount();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('separates preparation, review and request wait; closing never double counts', () => {
    const view = renderHook((props) => useLearningCriteriaWorkSession(props), { initialProps: { ...input, phase: 'preparacion' as 'preparacion' | 'revision' } });
    act(() => view.result.current.start());
    advance(10_000);
    view.rerender({ ...input, phase: 'preparacion', busy: true, assisted: true });
    advance(8_000);
    view.rerender({ ...input, phase: 'revision', assisted: true });
    act(() => view.result.current.activity());
    advance(12_000);
    act(() => view.result.current.finish('aprobada'));
    view.unmount();
    expect(totals()).toEqual([10_000, 12_000, 8_000]);
    expect(vi.mocked(trackEvent).mock.calls.at(-1)?.[1]).toMatchObject({ metadata_json: { condicion: 'asistida', resultado: 'aprobada' } });
    expect(JSON.stringify(vi.mocked(trackEvent).mock.calls)).not.toMatch(/fuentes|nombre|respuesta|intencion/);
  });

  it('excludes hidden and inactive time and resumes on interaction', () => {
    const view = renderHook(() => useLearningCriteriaWorkSession(input));
    act(() => view.result.current.start());
    advance(120_000);
    expect(totals()).toEqual([45_000, 0, 0]);
    act(() => view.result.current.activity());
    advance(5_000);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(60_000);
    act(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    advance(3_000);
    act(() => view.result.current.finish());
    expect(totals()).toEqual([53_000, 0, 0]);
    view.unmount();
  });
});
