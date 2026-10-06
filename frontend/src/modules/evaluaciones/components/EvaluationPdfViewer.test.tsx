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
    await user.click(screen.getByText('Leer texto de esta página'));
    expect(await screen.findByText('Pregunta de página 1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
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
