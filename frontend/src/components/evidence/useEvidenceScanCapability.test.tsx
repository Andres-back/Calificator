import { act, renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEvidenceScanCapability } from './useEvidenceScanCapability';

const mocks = vi.hoisted(() => ({ get: vi.fn(), user: { id: 'teacher-a', rol: 'profesor' } }));
vi.mock('@/modules/calificaciones/api', () => ({ getEvidenceScanCapability: mocks.get }));
vi.mock('@/stores/auth', () => ({ useAuth: (select: (state: { user: typeof mocks.user }) => unknown) => select({ user: mocks.user }) }));
const capability = { schema_version: 1, enabled: true, algorithm: 'opencv-4.13.0-scan2', max_pages: 10, max_file_bytes: 10_485_760, max_total_bytes: 41_943_040, max_scan_pixels: 16_000_000 };
function Wrapper({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: 'teacher-a', rol: 'profesor' }; mocks.get.mockResolvedValue(capability); });

describe('contextual scan capability', () => {
  it('solo ofrece consulta visual si el servidor la habilitó para el actor/contexto', async () => {
    mocks.get.mockResolvedValue({ ...capability, corner_assistance_enabled: true });
    const { result, rerender } = renderHook(({ evaluation }) => useEvidenceScanCapability(evaluation, 's1'), { initialProps: { evaluation: 'e1' }, wrapper: Wrapper });
    await waitFor(() => expect(result.current.suggestCorners).toBeTypeOf('function'));
    rerender({ evaluation: 'e2' });
    expect(result.current.suggestCorners).toBeUndefined();
    await waitFor(() => expect(result.current.suggestCorners).toBeTypeOf('function'));
    mocks.user = { id: 'teacher-a', rol: 'estudiante' }; rerender({ evaluation: 'e2' });
    expect(result.current.suggestCorners).toBeUndefined();
  });
  it('does not reuse a cached grant while the form is disabled or the role changes', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useEvidenceScanCapability('e1', 's1', enabled), { initialProps: { enabled: true }, wrapper: Wrapper });
    await waitFor(() => expect(result.current.available).toBe(true));
    rerender({ enabled: false });
    expect(result.current.available).toBe(false);
    mocks.user = { id: 'teacher-a', rol: 'estudiante' };
    rerender({ enabled: true });
    expect(result.current.available).toBe(false);
    expect(mocks.get).toHaveBeenCalledTimes(1);
  });
  it('ignores a late capability from another evaluation and cancels its request', async () => {
    let complete!: (value: typeof capability) => void;
    let signal!: AbortSignal;
    mocks.get.mockImplementation((evaluation: string, _student: string, input: AbortSignal) => {
      if (evaluation === 'e1') { signal = input; return new Promise((resolve) => { complete = resolve; }); }
      return Promise.resolve({ ...capability, enabled: false });
    });
    const { result, rerender } = renderHook(({ evaluation }) => useEvidenceScanCapability(evaluation, 's1'), { initialProps: { evaluation: 'e1' }, wrapper: Wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    rerender({ evaluation: 'e2' });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
    await act(async () => complete(capability));
    expect(result.current.available).toBe(false);
    expect(result.current.scope).toBe('teacher-a:e2:s1');
    expect(signal.aborted).toBe(true);
  });
  it('fails back to the ordinary flow once, without retry loops', async () => {
    mocks.get.mockRejectedValue(new Error('Old server without this capability'));
    const { result } = renderHook(() => useEvidenceScanCapability('e1', 's1'), { wrapper: Wrapper });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
    expect(result.current.available).toBe(false);
    expect(result.current.limits).toBeUndefined();
  });
});
