import { useState } from 'react';
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
