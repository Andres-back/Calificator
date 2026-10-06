import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AsistenciaDia, AsistenciaDiaInput } from './asistenciaApi';
import { useAttendanceAutosave } from './useAttendanceAutosave';

const day: AsistenciaDia = { materia_id: 'm1', fecha: '2026-10-06', registros: Array.from({ length: 30 }, (_, i) => ({
  estudiante_id: `s${i}`, estudiante_nombre: `Alumno ${i}`, estudiante_email: `s${i}@example.test`, estado: null, observacion: null,
})), resumen: { total: 30, presentes: 0, tarde: 0, ausentes: 0, excusas: 0, pendientes: 30 } };

function deferred() {
  let resolve!: (value: AsistenciaDia) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<AsistenciaDia>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('asistencia automática', () => {
  it('shows pending before dispatch, accepts clean refetch and handles session or enrollment errors without success', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Sesión vencida o matrícula inactiva'));
    const { result, rerender } = renderHook(({ data }) => useAttendanceAutosave('m1', day.fecha, data, save), { initialProps: { data: day } });
    act(() => result.current.updateObservation('s0', 'Pendiente'));
    expect(result.current.status('s0')).toBe('pending');
    act(() => result.current.updateStatus('s0', 'tarde'));
    await waitFor(() => expect(result.current.status('s0')).toBe('error'));
    expect(result.current.hasUnsavedChanges).toBe(true);
    rerender({ data: { ...day, registros: day.registros.filter((r) => r.estudiante_id !== 's1') } });
    expect(result.current.draft.s1).toBeUndefined();
    expect(result.current.draft.s0).toEqual({ estado: 'tarde', observacion: 'Pendiente' });
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('does not warn about a cleared observation that was never sent', () => {
    const save = vi.fn().mockResolvedValue(day);
    const { result } = renderHook(() => useAttendanceAutosave('m1', day.fecha, day, save));
    act(() => result.current.updateObservation('s0', 'Texto'));
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => result.current.updateObservation('s0', ''));
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
  it('saves one student while others remain pending and preserves rapid corrections', async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(day);
    const { result, rerender } = renderHook(({ data }) => useAttendanceAutosave('m1', day.fecha, data, save), { initialProps: { data: day } });
    act(() => result.current.updateStatus('s0', 'presente'));
    expect(save.mock.calls[0][0].registros).toEqual([{ estudiante_id: 's0', estado: 'presente', observacion: null }]);
    act(() => result.current.updateStatus('s0', 'tarde'));
    rerender({ data: { ...day } });
    expect(result.current.draft.s0.estado).toBe('tarde');
    await act(async () => first.resolve(day));
    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false));
    expect(save.mock.calls[1][0].registros[0].estado).toBe('tarde');
    expect(result.current.draft.s0.estado).toBe('tarde');
    expect(result.current.draft.s1.estado).toBeNull();
  });

  it('queues 30 latest selections including reverting a saved state during an in-flight request', async () => {
    const initial = { ...day, registros: day.registros.map((s, i) => i === 0 ? { ...s, estado: 'presente' as const } : s) };
    const first = deferred();
    const persisted = new Map<string, string>();
    const save = vi.fn((payload: AsistenciaDiaInput) => {
      payload.registros.forEach((r) => persisted.set(r.estudiante_id, r.estado));
      return save.mock.calls.length === 1 ? first.promise : Promise.resolve(day);
    });
    const { result } = renderHook(() => useAttendanceAutosave('m1', day.fecha, initial, save));
    act(() => {
      result.current.updateStatus('s0', 'tarde');
      result.current.updateStatus('s0', 'presente');
      for (let i = 1; i < 30; i++) result.current.updateStatus(`s${i}`, 'ausente');
    });
    await act(async () => first.resolve(day));
    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false));
    expect(persisted.size).toBe(30);
    expect(persisted.get('s0')).toBe('presente');
    expect([...persisted.values()].filter((s) => s === 'ausente')).toHaveLength(29);
  });

  it('retains failures, lets other students save and retries the newest content', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValue(day);
    const { result } = renderHook(() => useAttendanceAutosave('m1', day.fecha, day, save));
    act(() => result.current.updateStatus('s0', 'ausente'));
    await waitFor(() => expect(result.current.status('s0')).toBe('error'));
    act(() => result.current.updateStatus('s1', 'excusa'));
    await waitFor(() => expect(result.current.status('s1')).toBe('saved'));
    expect(result.current.draft.s0.estado).toBe('ausente');
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => result.current.retry('s0'));
    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false));
    expect(save).toHaveBeenCalledTimes(3);
  });

  it('waits for state before saving an observation; debounces typing and flushes on blur', async () => {
    const save = vi.fn().mockResolvedValue(day);
    const { result } = renderHook(() => useAttendanceAutosave('m1', day.fecha, day, save));
    act(() => result.current.updateObservation('s0', 'Con permiso'));
    expect(save).not.toHaveBeenCalled();
    expect(result.current.hasUnsavedChanges).toBe(true);
    act(() => result.current.updateStatus('s0', 'tarde'));
    await waitFor(() => expect(result.current.status('s0')).toBe('saved'));
    expect(save.mock.calls[0][0].registros[0].observacion).toBe('Con permiso');
    act(() => result.current.updateObservation('s0', 'Con autorización'));
    expect(save).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.status('s0')).toBe('saved'));
    act(() => { result.current.updateObservation('s0', 'Excusa'); result.current.flushObservation('s0'); });
    await waitFor(() => expect(save).toHaveBeenCalledTimes(3));
  });

  it('isolates contexts and bulk selection preserves prior states and observations', async () => {
    const first = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(day);
    const { result, rerender } = renderHook(({ date }) => useAttendanceAutosave('m1', date, { ...day, fecha: date }, save), { initialProps: { date: day.fecha } });
    act(() => { result.current.updateObservation('s0', 'Con permiso'); result.current.updateStatus('s0', 'tarde'); result.current.markAllPending(); });
    expect(result.current.draft.s0).toEqual({ estado: 'tarde', observacion: 'Con permiso' });
    rerender({ date: '2026-10-05' });
    await act(async () => first.resolve(day));
    expect(result.current.draft.s0.estado).toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
  });
});
