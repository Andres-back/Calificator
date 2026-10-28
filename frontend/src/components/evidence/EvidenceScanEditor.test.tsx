import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EvidenceScanEditor } from './EvidenceScanEditor';
import type { ScanQuad } from './scanGeometry';

const mocks = vi.hoisted(() => ({ run: vi.fn(), dispose: vi.fn() }));
vi.mock('./evidenceScan', () => ({ EvidenceScanner: class { run = mocks.run; dispose = mocks.dispose; } }));
const photo = new File(['source'], 'source.png', { type: 'image/png' });
const initial = { width: 800, height: 1200, quad: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]], sourcePreview: new Blob(['source'], { type: 'image/png' }), quality: { status: 'warning', warnings: ['La foto puede estar borrosa.'], width: 800, height: 1200 } };

beforeEach(() => {
  mocks.run.mockReset().mockImplementation(async (_file, options) => options.mode === 'detect' ? initial : { ...initial, preview: new Blob(['prepared'], { type: 'image/jpeg' }) });
  mocks.dispose.mockReset();
});

describe('revisión de escaneo antes del envío', () => {
  it('encajar restablece zoom y desplazamiento sin cambiar las esquinas ni aceptar', async () => {
    const onAccept = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} onAccept={onAccept} onClose={vi.fn()} />);
    await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    const viewport = screen.getByTestId('scan-source-viewport');
    const body = viewport.closest('section')!.parentElement!.parentElement!;
    fireEvent.click(screen.getByRole('button', { name: /^Ampliar foto$/ }));
    viewport.scrollTop = 100; viewport.scrollLeft = 80; body.scrollTop = 150;
    fireEvent.click(screen.getByRole('button', { name: /^Encajar hoja$/ }));
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(viewport.scrollTop).toBe(0); expect(viewport.scrollLeft).toBe(0); expect(body.scrollTop).toBe(0);
    expect(onAccept).not.toHaveBeenCalled();
  });
  it('no consulta ayuda externa cuando ya existe contorno local', async () => {
    const suggestCorners = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} suggestCorners={suggestCorners} onAccept={vi.fn()} onClose={vi.fn()} />);
    await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    expect(suggestCorners).not.toHaveBeenCalled();
  });
  it('propone bordes asistidos tras abstención local sin aceptar ni enviar', async () => {
    mocks.run.mockResolvedValueOnce({ ...initial, quad: null });
    const quad = [[.2, .2], [.8, .2], [.8, .8], [.2, .8]] as const;
    const suggestCorners = vi.fn().mockResolvedValue(quad);
    const onAccept = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} suggestCorners={suggestCorners} onAccept={onAccept} onClose={vi.fn()} />);
    await screen.findByText(/Bordes sugeridos con ayuda visual/);
    expect(suggestCorners).toHaveBeenCalledOnce();
    expect(onAccept).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta preparación' }));
    const accepted = onAccept.mock.calls[0][0].recipe.corners;
    expect(accepted[0]).toEqual([.14, .14]);
    expect(accepted[2][0]).toBeCloseTo(.86, 8);
    expect(accepted[2][1]).toBeCloseTo(.86, 8);
  });
  it('una edición manual cancela la aplicación de la sugerencia tardía', async () => {
    mocks.run.mockResolvedValueOnce({ ...initial, quad: null });
    let finish!: (quad: typeof initial.quad) => void;
    const suggestCorners = vi.fn((_source: Blob, _signal: AbortSignal) => new Promise<ScanQuad>((resolve) => { finish = (quad) => resolve(quad as ScanQuad); }));
    const onAccept = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} suggestCorners={suggestCorners} onAccept={onAccept} onClose={vi.fn()} />);
    await screen.findByText(/Buscando los bordes/);
    fireEvent.click(screen.getByRole('button', { name: 'Mover esquina a la derecha' }));
    expect(suggestCorners.mock.calls[0][1].aborted).toBe(true);
    await act(async () => finish(initial.quad));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta preparación' }));
    expect(onAccept.mock.calls[0][0].recipe.corners[0]).toEqual([.005, 0]);
  });
  it('ofrece ajuste manual y original cuando la ayuda falla', async () => {
    mocks.run.mockResolvedValueOnce({ ...initial, quad: null });
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} suggestCorners={vi.fn().mockRejectedValue(new Error('private error'))} onAccept={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText(/No pudimos proponer los bordes/);
    expect(screen.queryByText('private error')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar foto original' })).toBeEnabled();
  });
  it('exige gesto explícito, conserva la fuente y permite ajustar esquinas con botones', async () => {
    const onAccept = vi.fn(); const onClose = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} onAccept={onAccept} onClose={onClose} />);
    expect(onAccept).not.toHaveBeenCalled();
    await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    await userEvent.click(screen.getByRole('button', { name: 'Esquina 1, superior izquierda' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mover esquina a la derecha' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta preparación' }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onAccept.mock.calls[0][0]).toMatchObject({ decision: 'prepared', recipe: { width: 800, height: 1200, corners: [[0.105, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]], coordinate_frame: 'exif_oriented_source', profile: 'natural' } });
    expect(photo.size).toBe(6); expect(onClose).not.toHaveBeenCalled();
  });
  it('ofrece el original al fallar sin imponer una preparación ni perder la selección', async () => {
    mocks.run.mockRejectedValueOnce(new Error('No pudimos preparar esta foto. Puedes usar la original.'));
    const onAccept = vi.fn();
    render(<EvidenceScanEditor file={photo} pageNumber={2} rotation={90} onAccept={onAccept} onClose={vi.fn()} />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Usar esta preparación' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Usar foto original' }));
    expect(onAccept).toHaveBeenCalledWith({ decision: 'original' });
  });
  it('cancela recursos y descarta una respuesta del contexto anterior', async () => {
    let finish!: (value: typeof initial) => void;
    mocks.run.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const onAccept = vi.fn(); const onClose = vi.fn();
    const view = render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={0} onAccept={onAccept} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin cambios' }));
    expect(onClose).toHaveBeenCalledOnce(); view.unmount();
    await act(async () => finish(initial));
    expect(mocks.dispose).toHaveBeenCalled(); expect(onAccept).not.toHaveBeenCalled();
    expect(mocks.run).toHaveBeenCalledOnce();
  });
  it('el arrastre usa la imagen real, respeta el giro y se detiene al soltar', async () => {
    const onAccept = vi.fn();
    const view = render(<EvidenceScanEditor file={photo} pageNumber={1} rotation={90} onAccept={onAccept} onClose={vi.fn()} />);
    const corner = await screen.findByRole('button', { name: 'Esquina 1, superior izquierda' });
    const svg = view.container.querySelector('svg[aria-label="Foto con cuatro esquinas ajustables"]')!;
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0, width: 600, height: 400, right: 600, bottom: 400, x: 0, y: 0, toJSON() {} });
    const pointer = (target: Element, kind: string, x: number, y: number) => {
      const event = new Event(kind, { bubbles: true });
      Object.defineProperties(event, { pointerId: { value: 7 }, pointerType: { value: 'touch' }, clientX: { value: x }, clientY: { value: y } });
      fireEvent(target, event);
    };
    // Rotated source point (0.1, 0.1) appears at (0.9, 0.1).
    pointer(corner, 'pointerdown', 540, 40);
    pointer(svg, 'pointermove', 528, 48);
    pointer(svg, 'pointerup', 528, 48);
    pointer(svg, 'pointermove', 300, 200);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Usar esta preparación' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Usar esta preparación' }));
    expect(onAccept.mock.calls[0][0].recipe.corners[0]).toEqual([0.12, 0.12]);
  });
});
