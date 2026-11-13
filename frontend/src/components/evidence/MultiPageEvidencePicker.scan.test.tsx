import { StrictMode, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiPageEvidencePicker } from './MultiPageEvidencePicker';
import type { EvidencePage } from './evidencePayload';
import type { EvidenceScanSelection } from './scanTypes';

const captured = vi.hoisted(() => ({ accept: null as null | ((selection: EvidenceScanSelection) => void), analyze: vi.fn() }));
vi.mock('./imageQuality', () => ({ analyzeEvidenceImage: captured.analyze }));
vi.mock('./EvidenceScanEditor', () => ({ EvidenceScanEditor: ({ onAccept, onClose, pageNumber }: { onAccept: (selection: EvidenceScanSelection) => void; onClose: () => void; pageNumber: number }) => {
  captured.accept = onAccept;
  return <div role="dialog" aria-label={`Preparar hoja ${pageNumber}`}><button onClick={() => onAccept({ decision: 'original' })}>Usar foto original</button><button onClick={onClose}>Volver sin cambios</button></div>;
} }));

beforeEach(() => { captured.analyze.mockReset().mockResolvedValue(null); captured.accept = null; });
function selectFiles(files: File[]) {
  fireEvent.click(screen.getByRole('button', { name: /^(Subir fotos|Agregar más fotos)/ }));
  fireEvent.change(document.querySelector('input[multiple]')!, { target: { files } });
}
function Harness() {
  const [pages, setPages] = useState<EvidencePage[]>([]);
  return <MultiPageEvidencePicker scanEnabled contextKey="same" pages={pages} onChange={setPages} />;
}
const first = new File(['one'], 'one.png', { type: 'image/png' });
const second = new File(['two'], 'two.png', { type: 'image/png' });

describe('preparación opt-in del paquete', () => {
  it('apagado conserva la selección habitual sin editor ni receta de escaneo', async () => {
    const onChange = vi.fn();
    render(<MultiPageEvidencePicker scanEnabled={false} contextKey="a" pages={[]} onChange={onChange} />);
    selectFiles([first]);
    await waitFor(() => expect(captured.analyze).toHaveBeenCalledOnce());
    expect(captured.accept).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const selected = onChange.mock.calls.at(-1)![0] as EvidencePage[];
    expect(selected[0].file).toBe(first);
    expect(selected[0].scan).toBeUndefined();
  });
  it('muestra la miniatura preparada pero conserva el original para el envío', async () => {
    const onChange = vi.fn();
    const objectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:prepared-evidence');
    try {
      const view = render(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={[]} onChange={onChange} />);
      selectFiles([first]);
      const pages = onChange.mock.calls[0][0] as EvidencePage[];
      view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={pages} onChange={onChange} />);
      const preview = new Blob(['prepared'], { type: 'image/png' });
      const selection: EvidenceScanSelection = { decision: 'prepared', preview, recipe: {
        width: 800, height: 1100, corners: [[0, 0], [1, 0], [1, 1], [0, 1]],
        rotation: 0, profile: 'natural', coordinate_frame: 'exif_oriented_source',
      } };
      act(() => captured.accept!(selection));
      const reviewed = onChange.mock.calls.at(-1)![0] as EvidencePage[];
      expect(reviewed[0].file).toBe(first);
      expect(reviewed[0].scan).toBe(selection);
      view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={reviewed} onChange={onChange} />);
      await waitFor(() => expect(objectUrl).toHaveBeenCalledWith(preview));
      expect(objectUrl).not.toHaveBeenCalledWith(first);
      expect(view.container.querySelector('ol img')).toHaveAttribute('src', 'blob:prepared-evidence');
      expect(screen.getByText('Preparada y revisada')).toBeInTheDocument();
    } finally { objectUrl.mockRestore(); }
  });
  it('revisa una hoja a la vez, conserva archivos y no inicia calidad paralela', () => {
    render(<Harness />); selectFiles([first, second]);
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
    expect(captured.analyze).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto original' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Se enviará la foto original')).toBeInTheDocument();
    expect(screen.getByText(/Sin revisar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Preparar hoja 2' }));
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin cambios' }));
    fireEvent.click(screen.getByRole('button', { name: 'Usar original sin preparar' }));
    expect(screen.getAllByText('Se enviará la foto original')).toHaveLength(2);
    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
  });
  it('rechaza una aceptación tardía tras A → B → A', () => {
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={[]} onChange={onChange} />);
    selectFiles([first]); const pages = onChange.mock.calls[0][0] as EvidencePage[];
    view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={pages} onChange={onChange} />);
    const old = captured.accept!;
    view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="b" pages={pages} onChange={onChange} />);
    view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={pages} onChange={onChange} />);
    old({ decision: 'original' }); expect(onChange).toHaveBeenCalledOnce();
  });
  it('rechaza la preview pendiente al pasar explícitamente al modo habitual', () => {
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={[]} onChange={onChange} />);
    selectFiles([first]); const pages = onChange.mock.calls[0][0] as EvidencePage[];
    view.rerender(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={pages} onChange={onChange} />);
    const old = captured.accept!;
    view.rerender(<MultiPageEvidencePicker scanEnabled={false} contextKey="a" pages={pages} onChange={onChange} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    old({ decision: 'original' });
    expect(onChange).toHaveBeenCalledOnce();
    expect(pages[0].file).toBe(first);
    expect(pages[0].scan).toBeUndefined();
  });
  it.each([true, false])('184 conserva la foto nativa aunque la preparación cambie con la cámara abierta (vuelve a %s)', async (finalScan) => {
    const agent = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
    try {
      const onChange = vi.fn();
      const view = render(<MultiPageEvidencePicker scanEnabled contextKey="a" pages={[]} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
      const camera = document.querySelector('input[capture]') as HTMLInputElement;
      view.rerender(<MultiPageEvidencePicker scanEnabled={false} contextKey="a" pages={[]} onChange={onChange} />);
      view.rerender(<MultiPageEvidencePicker scanEnabled={finalScan} contextKey="a" pages={[]} onChange={onChange} />);
      expect(camera.isConnected).toBe(true);
      fireEvent.change(camera, { target: { files: [first] } });
      expect(onChange).toHaveBeenCalledOnce();
      const pages = onChange.mock.calls[0][0] as EvidencePage[];
      expect(pages[0].file).toBe(first);
      view.rerender(<MultiPageEvidencePicker scanEnabled={finalScan} contextKey="a" pages={pages} onChange={onChange} />);
      if (finalScan) expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
      else await waitFor(() => expect(captured.analyze).toHaveBeenCalledOnce());
    } finally { agent.mockRestore(); }
  });
  it('184 una hoja que se cerró sin preparar dice cuál falta y permite reabrirla', () => {
    render(<Harness />); selectFiles([first, second]);
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto original' }));
    expect(screen.getByRole('status')).toHaveTextContent('Prepara la hoja 2 o usa la original');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir hoja 2' }));
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 2' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Usar foto original' }));
    expect(screen.queryByText(/Prepara la hoja/)).not.toBeInTheDocument();
  });
  it('184 el gesto Atrás cierra la preparación sin salir de la pantalla ni perder la hoja', async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    const before = window.location.href;
    expect(JSON.stringify(window.history.state)).not.toContain('__evidenceOverlay');
    render(<Harness />); selectFiles([first]);
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
    expect(JSON.stringify(window.history.state)).toContain('__evidenceOverlay');
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.location.href).toBe(before);
    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
    expect(screen.getByText(/Prepara la hoja 1/)).toBeInTheDocument();
  });
  it('184 en modo estricto (doble montaje) Atrás también cierra la preparación', async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    render(<StrictMode><Harness /></StrictMode>); selectFiles([first]);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
    expect(JSON.stringify(window.history.state)).toContain('__evidenceOverlay');
    act(() => window.history.back());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
  });
  it('184 cerrar la preparación con sus botones devuelve el historial a como estaba', async () => {
    render(<Harness />); selectFiles([first]);
    const opened = window.history.state;
    expect(opened).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin cambios' }));
    await waitFor(() => expect(window.history.state).not.toEqual(opened));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir hoja 1' }));
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole('dialog', { name: 'Preparar hoja 1' })).toBeInTheDocument();
  });
  it('la calidad legacy de varias selecciones también se decodifica en serie', async () => {
    let finish!: (result: null) => void;
    captured.analyze.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    selectFiles([first]); const pages = onChange.mock.calls[0][0] as EvidencePage[];
    view.rerender(<MultiPageEvidencePicker pages={pages} onChange={onChange} />);
    selectFiles([second]); expect(captured.analyze).toHaveBeenCalledOnce();
    await act(async () => finish(null));
    await waitFor(() => expect(captured.analyze).toHaveBeenCalledTimes(2));
  });
});
