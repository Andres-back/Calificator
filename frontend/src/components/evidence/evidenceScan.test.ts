import { describe, expect, it, vi } from 'vitest';
import { EvidenceScanner } from './evidenceScan';

function fakeWorker() {
  return { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null as ((event: MessageEvent) => void) | null, onerror: null as ((event: Event) => void) | null };
}
const file = new File(['synthetic'], 'test.png', { type: 'image/png' });

describe('cola local acotada de escaneo', () => {
  it('carga bajo demanda y conserva solo la última solicitud pendiente', async () => {
    const worker = fakeWorker(); const create = vi.fn(() => worker as unknown as Worker);
    const scanner = new EvidenceScanner(create);
    expect(create).not.toHaveBeenCalled();
    const first = scanner.run(file, { mode: 'detect' }).catch((error: Error) => error.name);
    const second = scanner.run(file, { mode: 'detect' }).catch((error: Error) => error.name);
    const last = scanner.run(file, { mode: 'detect' });
    expect(await first).toBe('AbortError'); expect(await second).toBe('AbortError');
    expect(worker.postMessage).toHaveBeenCalledOnce();
    const initialId = worker.postMessage.mock.calls[0][0].id;
    worker.onmessage?.({ data: { id: initialId, ok: true, result: { width: 10 } } } as MessageEvent);
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    const lastId = worker.postMessage.mock.calls[1][0].id;
    worker.onmessage?.({ data: { id: initialId, ok: true, result: { width: 999 } } } as MessageEvent);
    worker.onmessage?.({ data: { id: lastId, ok: true, result: { width: 20 } } } as MessageEvent);
    expect(await last).toMatchObject({ width: 20 }); scanner.dispose();
  });
  it('cancelar termina el Worker y rechaza resultados tardíos', async () => {
    const worker = fakeWorker(); const scanner = new EvidenceScanner(() => worker as unknown as Worker);
    const result = scanner.run(file, { mode: 'detect' }).catch((error: Error) => error.name);
    scanner.dispose(); expect(await result).toBe('AbortError');
    expect(worker.terminate).toHaveBeenCalledOnce();
    await expect(scanner.run(file, { mode: 'detect' })).rejects.toMatchObject({ name: 'AbortError' });
  });
  it('tras ocho segundos libera el Worker y permite un nuevo intento explícito', async () => {
    vi.useFakeTimers();
    try {
      const worker = fakeWorker(); const scanner = new EvidenceScanner(() => worker as unknown as Worker);
      const result = scanner.run(file, { mode: 'detect' }).catch((error: Error) => error.message);
      await vi.advanceTimersByTimeAsync(8000);
      expect(await result).toMatch(/original/i); expect(worker.terminate).toHaveBeenCalledOnce();
      const retry = scanner.run(file, { mode: 'detect' }).catch((error: Error) => error.name);
      expect(worker.postMessage).toHaveBeenCalledTimes(2); scanner.dispose(); expect(await retry).toBe('AbortError');
    } finally { vi.useRealTimers(); }
  });
});
