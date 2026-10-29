import type { ScanOptions, ScanRequest, ScanResponse, ScanResult } from './scanTypes';
import { encodeScanPreview, scanCanvasBridge } from './scanCanvasBridge';

type Pending = ScanRequest & { resolve: (result: ScanResult) => void; reject: (error: Error) => void };
const aborted = () => new DOMException('Preparación cancelada.', 'AbortError');
const fallback = 'No pudimos preparar esta foto. Puedes usar la original o intentarlo de nuevo.';
const explanation = (code: string) => code === 'pixel_budget' || code === 'source_size_budget'
  ? 'Esta foto es demasiado grande para prepararla aquí. Puedes usar la original.'
  : code === 'unsupported_image' ? 'No podemos preparar esta foto en este dispositivo. Puedes usar la original.' : fallback;

/** One active decode and one replaceable pending request. No persistent photographs. */
export class EvidenceScanner {
  private worker: Worker | null = null;
  private active: Pending | null = null;
  private pending: Pending | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private sequence = 0;
  private canvasBridge = false;

  constructor(private readonly createWorker = () => new Worker(new URL('./evidenceScan.worker.ts', import.meta.url), { type: 'module' })) {}

  run(file: File, options: ScanOptions): Promise<ScanResult> {
    if (this.disposed) return Promise.reject(aborted());
    return new Promise((resolve, reject) => {
      const request: Pending = { id: ++this.sequence, file, options, resolve, reject };
      if (this.active) {
        this.active.reject(aborted());
        this.pending?.reject(aborted());
        this.pending = request;
      } else this.start(request);
    });
  }

  private start(request: Pending) {
    this.active = request;
    try {
      if (!this.worker) {
        this.worker = this.createWorker();
        this.worker.onmessage = (event: MessageEvent<ScanResponse>) => this.receive(event.data);
        this.worker.onerror = () => this.fail(fallback);
      }
      this.timer = setTimeout(() => this.fail(fallback), 8000);
      if (this.canvasBridge) void this.sendViaCanvas(request);
      else this.worker.postMessage({ id: request.id, file: request.file, options: request.options });
    } catch { this.fail(fallback); }
  }

  private receive(response: ScanResponse) {
    if (!this.active || response?.id !== this.active.id) return;
    if (!response.ok && response.code === 'needs_canvas_bridge' && !this.canvasBridge) {
      this.canvasBridge = true; void this.sendViaCanvas(this.active); return;
    }
    if (response.ok && response.result.rendered) {
      const id = response.id;
      void encodeScanPreview(response.result.rendered).then((preview) => {
        if (this.active?.id !== id) return;
        const { rendered: _rendered, ...result } = response.result;
        this.receive({ id, ok: true, result: { ...result, preview } });
      }).catch(() => { if (this.active?.id === id) this.fail(fallback); });
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (response.ok) this.active.resolve(response.result);
    else this.active.reject(new Error(explanation(response.code)));
    this.active = null;
    const next = this.pending; this.pending = null;
    if (next && !this.disposed) this.start(next);
  }

  private async sendViaCanvas(request: Pending) {
    try {
      const pixels = await scanCanvasBridge(request.file, request.options.mode === 'detect', () => !this.disposed && this.active?.id === request.id);
      if (this.disposed || this.active?.id !== request.id) return;
      this.worker?.postMessage({ id: request.id, file: request.file, options: request.options, pixels } satisfies ScanRequest, [pixels.rgba]);
    } catch (error) {
      if (this.active?.id === request.id) this.receive({ id: request.id, ok: false, code: error instanceof Error ? error.message : 'unsupported_image' });
    }
  }

  private fail(message: string) {
    this.active?.reject(new Error(message)); this.pending?.reject(new Error(message));
    this.active = null; this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null; this.worker?.terminate(); this.worker = null;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.active?.reject(aborted()); this.pending?.reject(aborted());
    this.active = null; this.pending = null;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null; this.worker?.terminate(); this.worker = null;
  }
}
