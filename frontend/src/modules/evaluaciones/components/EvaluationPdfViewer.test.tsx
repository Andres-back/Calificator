import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EvaluationPdfViewer from './EvaluationPdfViewer';

const mocks = vi.hoisted(() => ({ load: vi.fn(), destroy: vi.fn(), cancel: vi.fn(), paint: vi.fn() }));
const blob = { arrayBuffer: async () => new ArrayBuffer(3) } as Blob;
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: {}, getDocument: mocks.load,
}));
vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&url', () => ({ default: '/pdf-worker.js' }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn() } as unknown as CanvasRenderingContext2D);
  const pdf = {
    numPages: 2,
    getPage: vi.fn(async (number: number) => ({
      getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
      render: (options: unknown) => { mocks.paint(options); return { promise: Promise.resolve(), cancel: mocks.cancel }; },
      getTextContent: async () => ({ items: [{ str: `Pregunta de página ${number}`, hasEOL: true }] }),
      cleanup: vi.fn(),
    })),
  };
  mocks.load.mockReturnValue({ promise: Promise.resolve(pdf), destroy: mocks.destroy });
});

describe('EvaluationPdfViewer', () => {
  it('identifies the page with most visible content rather than a previous-page sliver', async () => {
    let observePages = () => {};
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: () => void) { observePages = callback; }
      observe() {}
      disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('data-document-scroll')) return { width: 390, top: 100, bottom: 750, height: 650 } as DOMRect;
      if (this.dataset.pdfPage === '1') return { width: 358, top: -100, bottom: 130, height: 230 } as DOMRect;
      if (this.dataset.pdfPage === '2') return { width: 358, top: 130, bottom: 700, height: 570 } as DOMRect;
      return { width: 390, top: 0, bottom: 0, height: 0 } as DOMRect;
    });
    render(<EvaluationPdfViewer blob={blob} />);
    await screen.findByText('Leer texto de la página 2');
    await act(async () => observePages());
    expect(screen.getByText('Página 2 de 2', { selector: 'span' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ampliar página' }));
    expect(screen.getByText('Página 2 de 2', { selector: 'span' })).toBeInTheDocument();
  });
  it('does not redraw when a scrollbar changes only clientWidth (Safari regression)', async () => {
    let resize = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe() {}
      disconnect() {}
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 324 } as DOMRect);
    const view = render(<EvaluationPdfViewer blob={blob} />);
    await waitFor(() => expect(screen.getByLabelText('Página 1 de 2')).toHaveAttribute('data-rendered', 'true'));
    const renderCount = mocks.paint.mock.calls.length;
    Object.defineProperty(view.container.querySelector('[aria-busy]'), 'clientWidth', { value: 307 });
    await act(async () => resize());
    expect(mocks.paint).toHaveBeenCalledTimes(renderCount);
  });

  it('does not create a worker when blob bytes arrive after closing', async () => {
    let resolveBytes!: (buffer: ArrayBuffer) => void;
    const delayed = { arrayBuffer: () => new Promise<ArrayBuffer>((resolve) => { resolveBytes = resolve; }) } as Blob;
    const view = render(<EvaluationPdfViewer blob={delayed} />);
    view.unmount();
    await act(async () => resolveBytes(new ArrayBuffer(3)));
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it('renders and navigates all pages with accessible text and bounded canvas', async () => {
    const user = userEvent.setup();
    render(<EvaluationPdfViewer blob={blob} />);
    await waitFor(() => expect(screen.getByLabelText('Página 1 de 2')).toHaveAttribute('data-rendered', 'true'));
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    await user.click(await screen.findByText('Leer texto de la página 1'));
    expect(await screen.findByText('Pregunta de página 1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await user.click(await screen.findByText('Leer texto de la página 2'));
    expect(await screen.findByText('Pregunta de página 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Ampliar página' }));
    await waitFor(() => expect(screen.getByLabelText('Página 2 de 2')).toHaveAttribute('data-rendered', 'true'));
    const canvas = screen.getByLabelText('Página 2 de 2') as HTMLCanvasElement;
    expect(canvas.width * canvas.height).toBeLessThanOrEqual(4_000_000);
    expect(mocks.load).toHaveBeenCalledWith(expect.objectContaining({ data: expect.any(Uint8Array), useWasm: false }));
  });

  it('destroys the loading task and clears canvas on unmount', async () => {
    const view = render(<EvaluationPdfViewer blob={blob} />);
    await waitFor(() => expect(screen.getByLabelText('Página 1 de 2')).toHaveAttribute('data-rendered', 'true'));
    const canvas = screen.getByLabelText('Página 1 de 2') as HTMLCanvasElement;
    view.unmount();
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('provides positions for twenty pages with at most three resident canvases', async () => {
    const configured = mocks.load.getMockImplementation()!();
    const loaded = await configured.promise;
    loaded.numPages = 20;
    render(<EvaluationPdfViewer blob={blob} />);
    await waitFor(() => expect(screen.getByLabelText('Página 1 de 20')).toHaveAttribute('data-rendered', 'true'));
    expect(document.querySelectorAll('[data-pdf-page]')).toHaveLength(20);
    expect(document.querySelectorAll('canvas').length).toBeLessThanOrEqual(3);
    for (let index = 1; index < 20; index++) await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await waitFor(() => expect(screen.getByLabelText('Página 20 de 20')).toHaveAttribute('data-rendered', 'true'));
    expect(document.querySelectorAll('canvas').length).toBeLessThanOrEqual(3);
  });

  it('reports load failure and retries without requesting a new evaluation', async () => {
    mocks.load.mockReturnValueOnce({ promise: Promise.reject(new Error('Invalid PDF')), destroy: mocks.destroy });
    const user = userEvent.setup();
    render(<EvaluationPdfViewer blob={blob} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos mostrar este documento');
    await user.click(screen.getByRole('button', { name: 'Reintentar vista' }));
    await waitFor(() => expect(screen.getByLabelText('Página 1 de 2')).toHaveAttribute('data-rendered', 'true'));
    expect(mocks.load).toHaveBeenCalledTimes(2);
  });
});
