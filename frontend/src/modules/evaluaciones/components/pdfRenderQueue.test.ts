import { describe, expect, it, vi } from 'vitest';
import { createRenderQueue } from './pdfRenderQueue';

describe('pdfRenderQueue', () => {
  it('waits for the active render and drops cancelled waiting work', async () => {
    const enqueue = createRenderQueue();
    let finish!: () => void;
    const first = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const second = vi.fn(async () => {});
    const third = vi.fn(async () => {});
    enqueue(first);
    const cancel = enqueue(second);
    enqueue(third);
    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce());
    expect(second).not.toHaveBeenCalled(); expect(third).not.toHaveBeenCalled();
    cancel(); finish();
    await vi.waitFor(() => expect(third).toHaveBeenCalledOnce());
    expect(second).not.toHaveBeenCalled();
  });
  it('does not poison later pages if a render fails', async () => {
    const enqueue = createRenderQueue();
    const next = vi.fn(async () => {});
    enqueue(async () => { throw new Error('cancelled'); }); enqueue(next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
  });
});
