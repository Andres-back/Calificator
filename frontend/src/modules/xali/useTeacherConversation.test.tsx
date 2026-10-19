import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTeacherConversation } from './useTeacherConversation';

const mocks = vi.hoisted(() => ({ history: vi.fn(), send: vi.fn(), clear: vi.fn() }));
vi.mock('./api', () => ({ getHistory: mocks.history, sendMessage: mocks.send, clearHistory: mocks.clear }));
beforeEach(() => { vi.clearAllMocks(); mocks.history.mockResolvedValue([]); mocks.send.mockResolvedValue({ respuesta: 'Correcto' }); mocks.clear.mockResolvedValue(undefined); });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderHook(({ user, subject }) => useTeacherConversation(user, subject, true), {
    initialProps: { user: 't1', subject: 'm1' }, wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
describe('teacher conversation lifecycle', () => {
  it('ignores late success/error/finally from a different subject', async () => {
    let resolve!: (value: { respuesta: string }) => void;
    mocks.send.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    let request!: Promise<void>; act(() => { request = view.result.current.send('Matemáticas'); });
    view.rerender({ user: 't1', subject: 'm2' });
    await act(async () => { resolve({ respuesta: 'Respuesta vieja' }); await request; });
    expect(view.result.current.messages).toEqual([]);
    expect(view.result.current.thinking).toBe(false);
    expect(mocks.send.mock.calls[0][2].aborted).toBe(true);
  });
  it('ignores a late error after account change and blocks double submissions', async () => {
    let reject!: (error: Error) => void;
    mocks.send.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    let request!: Promise<void>; act(() => { request = view.result.current.send('Pregunta'); void view.result.current.send('Doble toque'); });
    expect(mocks.send).toHaveBeenCalledTimes(1);
    view.rerender({ user: 't2', subject: 'm1' });
    await act(async () => { reject(new Error('late')); await request; });
    expect(view.result.current.failedPrompt).toBeNull(); expect(view.result.current.messages).toEqual([]);
  });
  it('checks uncertain results before allowing a voluntary retry', async () => {
    mocks.send.mockRejectedValueOnce(new Error('network'));
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    await act(async () => view.result.current.send('Pregunta'));
    expect(view.result.current.canRetry).toBe(false);
    await act(async () => view.result.current.retry());
    expect(mocks.send).toHaveBeenCalledTimes(1);
    await act(async () => view.result.current.reviewHistory());
    expect(view.result.current.canRetry).toBe(true);
    await act(async () => view.result.current.retry());
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('recovers a saved response without sending it again', async () => {
    mocks.send.mockRejectedValueOnce(new Error('network'));
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    await act(async () => view.result.current.send('Pregunta'));
    mocks.history.mockResolvedValueOnce([{ id: 'new-u', role: 'user', mensaje: 'Pregunta' }, { id: 'new-a', role: 'assistant', mensaje: 'Guardada' }]);
    await act(async () => view.result.current.reviewHistory());
    expect(view.result.current.failedPrompt).toBeNull(); expect(view.result.current.messages).toHaveLength(2);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('does not erase a newly selected conversation after a late deletion', async () => {
    let finish!: () => void;
    mocks.clear.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    let deletion!: Promise<boolean>; act(() => { deletion = view.result.current.reset(); });
    view.rerender({ user: 't1', subject: 'm2' });
    await act(async () => { finish(); expect(await deletion).toBe(false); });
    expect(view.result.current.scope).toContain('m2'); expect(view.result.current.clearing).toBe(false);
  });
  it('does not reuse an old identical answer after a successful optimistic exchange', async () => {
    const view = setup(); await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    await act(async () => view.result.current.send('Pregunta'));
    mocks.send.mockRejectedValueOnce(new Error('network'));
    await act(async () => view.result.current.send('Pregunta'));
    mocks.history.mockResolvedValueOnce([{ id: 'saved-u', role: 'user', mensaje: 'Pregunta' }, { id: 'saved-a', role: 'assistant', mensaje: 'Respuesta anterior' }]);
    await act(async () => view.result.current.reviewHistory());
    expect(view.result.current.failedPrompt).toBe('Pregunta');
    expect(view.result.current.canRetry).toBe(true);
  });
  it('ignores late history when the signed-in account changes', async () => {
    let finish!: (value: unknown[]) => void;
    mocks.history.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const view = setup(); view.rerender({ user: 't2', subject: 'm1' });
    await waitFor(() => expect(view.result.current.history.isSuccess).toBe(true));
    await act(async () => finish([{ id: 'private', role: 'assistant', mensaje: 'Solo primera cuenta' }]));
    expect(view.result.current.messages).toEqual([]);
  });
});
