import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeScanPreview, scanCanvasBridge } from './scanCanvasBridge';

function source(width: number, height: number) {
  const bytes = new Uint8Array(33); bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
  const view = new DataView(bytes.buffer); view.setUint32(16, width); view.setUint32(20, height);
  return { size: 33, slice: () => ({ arrayBuffer: async () => bytes.buffer }) } as unknown as File;
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('puente de lienzo WebKit', () => {
  it('codifica la preview en PNG sin pérdida de color y sin sustituir el original', async () => {
    vi.stubGlobal('ImageData', class { constructor(public data: Uint8ClampedArray, public width: number, public height: number) {} });
    const put = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ putImageData: put } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback, type) => callback(new Blob(['synthetic pixels'], { type })));
    const preview = await encodeScanPreview({ width: 2, height: 2, rgba: new ArrayBuffer(16) });
    expect(preview.type).toBe('image/png');
    expect(put).toHaveBeenCalledOnce();
  });
  it('rechaza una bomba de píxeles antes de abrirla y una salida fuera del presupuesto', async () => {
    const decode = vi.fn(); vi.stubGlobal('createImageBitmap', decode);
    await expect(scanCanvasBridge(source(8000, 6000), true, () => true)).rejects.toThrow('pixel_budget');
    expect(decode).not.toHaveBeenCalled();
    await expect(encodeScanPreview({ width: 8000, height: 6000, rgba: new ArrayBuffer(0) })).rejects.toThrow('invalid_preview');
  });
  it('serializa montajes distintos y cierra el bitmap de una apertura cancelada', async () => {
    let resolveFirst!: (value: ImageBitmap) => void;
    let current = true;
    const close = vi.fn();
    const decode = vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; })).mockRejectedValueOnce(new Error('synthetic-next'));
    vi.stubGlobal('createImageBitmap', decode);
    const first = scanCanvasBridge(source(800, 1100), true, () => current).catch((error: Error) => error.name);
    await vi.waitFor(() => expect(decode).toHaveBeenCalledOnce());
    current = false;
    const next = scanCanvasBridge(source(800, 1100), true, () => true).catch((error: Error) => error.message);
    expect(decode).toHaveBeenCalledOnce();
    resolveFirst({ width: 800, height: 1100, close } as unknown as ImageBitmap);
    expect(await first).toBe('AbortError'); expect(close).toHaveBeenCalledOnce();
    expect(await next).toBe('synthetic-next'); expect(decode).toHaveBeenCalledTimes(2);
  });
});
