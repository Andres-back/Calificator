import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MultiPageEvidencePicker } from './MultiPageEvidencePicker';
import type { EvidencePage } from './evidencePayload';

const analyze = vi.hoisted(() => vi.fn());
vi.mock('./imageQuality', () => ({ analyzeEvidenceImage: analyze }));
beforeEach(() => { vi.restoreAllMocks(); analyze.mockReset().mockResolvedValue(null); });

function Harness({ onError = vi.fn(), initialPages = [] }: { onError?: (message: string) => void; initialPages?: EvidencePage[] }) {
  const [pages, setPages] = useState<EvidencePage[]>(initialPages);
  return <MultiPageEvidencePicker pages={pages} onChange={setPages} onError={onError} />;
}

function filesInput(): HTMLInputElement {
  fireEvent.click(screen.getByRole('button', { name: /^(Subir fotos|Agregar más fotos)/ }));
  const input = document.querySelector('input[type="file"][multiple]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No se encontro el selector de archivos');
  return input;
}

function cameraInput(): HTMLInputElement {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
  fireEvent.click(screen.getByRole('button', { name: /^Tomar (otra )?foto/ }));
  const input = document.querySelector('input[type="file"][capture]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No se encontro el selector de camara');
  return input;
}

describe('MultiPageEvidencePicker', () => {
  it('remembers the chosen camera only while the preparation view remains mounted', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
      const video = constraints.video as MediaTrackConstraints;
      const deviceId = typeof video.deviceId === 'object' && 'exact' in video.deviceId ? video.deviceId.exact : 'integrated';
      const track = { stop: vi.fn(), getSettings: () => ({ deviceId }) };
      return { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
    });
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'integrated', label: 'Integrada' },
      { kind: 'videoinput', deviceId: 'usb', label: 'USB' },
    ]);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia, enumerateDevices } });
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker contextKey="e1:s1" pages={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    await screen.findByRole('option', { name: 'USB' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Cámara' }), { target: { value: 'usb' } });
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    view.rerender(<MultiPageEvidencePicker contextKey="e1:s2" pages={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(3));
    expect(getUserMedia.mock.calls[2][0].video).toMatchObject({ deviceId: { exact: 'usb' } });
    expect(onChange).not.toHaveBeenCalled();
    view.unmount();
    render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(4));
    expect(getUserMedia.mock.calls[3][0].video).not.toHaveProperty('deviceId');
  });
  it('stops pending camera access and rejects late native files after context changes', async () => {
    let allow!: (stream: MediaStream) => void;
    const stop = vi.fn();
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { allow = resolve; }));
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker contextKey="e1:s1" pages={[]} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    expect(getUserMedia).toHaveBeenCalledOnce();
    view.rerender(<MultiPageEvidencePicker contextKey="e1:s2" pages={[]} onChange={onChange} />);
    await act(async () => allow({ getTracks: () => [{ stop }] } as unknown as MediaStream));
    expect(stop).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Tomar foto' })).not.toBeInTheDocument();
  });

  it('rejects stale image-quality results from another context', async () => {
    let finish!: (result: null) => void;
    analyze.mockReturnValue(new Promise<null>((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker contextKey="e1:s1" pages={[]} onChange={onChange} />);
    fireEvent.change(filesInput(), { target: { files: [new File(['photo'], 'old.jpg', { type: 'image/jpeg' })] } });
    const previous = onChange.mock.calls[0][0] as EvidencePage[];
    view.rerender(<MultiPageEvidencePicker contextKey="e1:s2" pages={previous} onChange={onChange} />);
    await act(async () => finish(null));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('ignores a late file or camera selection after input has been disabled', () => {
    const onChange = vi.fn();
    const { rerender } = render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    const camera = cameraInput();
    const files = filesInput();
    rerender(<MultiPageEvidencePicker pages={[]} onChange={onChange} disabled />);
    const image = new File(['late'], 'late.jpg', { type: 'image/jpeg' });
    fireEvent.change(camera, { target: { files: [image] } });
    fireEvent.change(files, { target: { files: [image] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it('does not emit an old analysis after the capture was cleared', async () => {
    let finish!: (result: null) => void;
    analyze.mockReturnValue(new Promise<null>((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    const { rerender } = render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    fireEvent.change(cameraInput(), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
    const added = onChange.mock.calls[0][0] as EvidencePage[];
    rerender(<MultiPageEvidencePicker pages={added} onChange={onChange} />);
    rerender(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    await act(async () => finish(null));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not emit pending analysis after unmounting', async () => {
    let finish!: (result: null) => void;
    analyze.mockReturnValue(new Promise<null>((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    const { unmount } = render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    fireEvent.change(cameraInput(), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
    unmount();
    await act(async () => finish(null));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it('adds, orders, rotates and removes several photos', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const first = new File(['uno'], 'primera.png', { type: 'image/png', lastModified: 1 });
    const second = new File(['dos'], 'segunda.png', { type: 'image/png', lastModified: 2 });

    await user.upload(filesInput(), [first, second]);
    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
    expect(screen.getByLabelText('Rotar hoja 1')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Bajar hoja 1'));
    const cards = screen.getAllByRole('listitem');
    expect(within(cards[0]).getByText('segunda.png')).toBeInTheDocument();
    expect(within(cards[1]).getByText('primera.png')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Rotar hoja 1'));
    await user.click(screen.getByLabelText('Quitar hoja 2'));
    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
    expect(screen.queryByText('primera.png')).not.toBeInTheDocument();
  });

  it('taking another photo appends instead of replacing the first one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(cameraInput(), new File(['uno'], 'captura-1.jpg', { type: 'image/jpeg', lastModified: 1 }));
    await user.upload(cameraInput(), new File(['dos'], 'captura-2.jpg', { type: 'image/jpeg', lastModified: 2 }));

    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
    expect(screen.getByText('captura-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('captura-2.jpg')).toBeInTheDocument();
  });

  it('keeps the original until a replacement photo is actually selected', async () => {
    const user = userEvent.setup();
    const original = new File(['original'], 'original.jpg', { type: 'image/jpeg' });
    render(<Harness initialPages={[{
      id: 'first', file: original, rotation: 0,
      quality: { status: 'warning', warnings: ['Puede estar borrosa.'], width: 800, height: 1000 },
    }]} />);

    await user.click(screen.getByRole('button', { name: 'Repetir foto' }));
    expect(screen.getByText('original.jpg')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar cámara del dispositivo' }));
    await user.upload(document.querySelector('input[capture]') as HTMLInputElement, new File(['new'], 'nueva.jpg', { type: 'image/jpeg' }));

    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
    expect(screen.getByText('nueva.jpg')).toBeInTheDocument();
    expect(screen.queryByText('original.jpg')).not.toBeInTheDocument();
  });

  it('rejects a PDF mixed with photos and more than ten photos', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { unmount } = render(<Harness onError={onError} />);
    await user.upload(filesInput(), [
      new File(['pdf'], 'guia.pdf', { type: 'application/pdf' }),
      new File(['foto'], 'foto.png', { type: 'image/png' }),
    ]);
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/no los mezcles/i));
    unmount();

    const secondError = vi.fn();
    render(<Harness onError={secondError} />);
    const eleven = Array.from({ length: 11 }, (_, index) => new File(
      [`hoja-${index}`],
      `hoja-${index}.png`,
      { type: 'image/png', lastModified: index + 1 },
    ));
    await user.upload(filesInput(), eleven);
    expect(secondError).toHaveBeenCalledWith(expect.stringMatching(/10 fotograf/i));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it.each(['iPhone', 'Android', 'iPad'])('127 opens native camera directly on %s without a stream or modal', (agent) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    const camera = document.querySelector('input[capture]') as HTMLInputElement;
    expect(camera.getAttribute('capture')).toBe('environment');
    expect(camera.multiple).toBe(false);
    expect(camera.accept).toBe('image/jpeg,image/png,image/webp');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(camera, { target: { files: [new File(['native'], 'photo.jpg', { type: 'image/jpeg' })] } });
    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar hoja 1' }));
    expect(screen.getByRole('dialog', { name: 'Vista de la hoja 1' })).toBeInTheDocument();
  });

  it.each(['context', 'roundtrip', 'disabled', 'unmount', 'new-opening'])('127 discards a stale native result after %s', (change) => {
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker contextKey="a" pages={[]} onChange={onChange} />);
    const old = cameraInput();
    if (change === 'context' || change === 'roundtrip') view.rerender(<MultiPageEvidencePicker contextKey="b" pages={[]} onChange={onChange} />);
    if (change === 'roundtrip') view.rerender(<MultiPageEvidencePicker contextKey="a" pages={[]} onChange={onChange} />);
    if (change === 'disabled') {
      view.rerender(<MultiPageEvidencePicker contextKey="a" pages={[]} onChange={onChange} disabled />);
      view.rerender(<MultiPageEvidencePicker contextKey="a" pages={[]} onChange={onChange} />);
    }
    if (change === 'unmount') view.unmount();
    if (change === 'new-opening') cameraInput();
    fireEvent.change(old, { target: { files: [new File(['old'], 'old.jpg', { type: 'image/jpeg' })] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(old.isConnected).toBe(false);
    expect(analyze).not.toHaveBeenCalled();
  });

  it('127 preserves native return after visibility/focus and accepts at most once', () => {
    const onChange = vi.fn();
    render(<MultiPageEvidencePicker pages={[]} onChange={onChange} />);
    const input = cameraInput();
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    fireEvent(document, new Event('visibilitychange'));
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    fireEvent(window, new Event('focus'));
    const files = [new File(['valid'], 'valid.jpg', { type: 'image/jpeg' })];
    fireEvent.change(input, { target: { files } });
    fireEvent.change(input, { target: { files } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('127 keeps both sheets on cancellation and replaces exactly the requested position', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
    const first: EvidencePage = { id: 'one', file: new File(['first'], 'first.jpg', { type: 'image/jpeg' }), rotation: 0,
      quality: { status: 'warning', warnings: ['Revisa nitidez.'], width: 800, height: 1000 } };
    const second: EvidencePage = { id: 'two', file: new File(['second'], 'second.jpg', { type: 'image/jpeg' }), rotation: 90 };
    render(<Harness initialPages={[first, second]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Repetir foto' }));
    const cancelled = document.querySelector('input[capture]')!;
    fireEvent(cancelled, new Event('cancel'));
    expect(screen.getByText('first.jpg')).toBeInTheDocument();
    expect(screen.getByText('second.jpg')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Repetir foto' }));
    fireEvent.change(document.querySelector('input[capture]')!, { target: { files: [new File(['new'], 'new.jpg', { type: 'image/jpeg' })] } });
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText('new.jpg')).toBeInTheDocument();
    expect(within(cards[1]).getByText('second.jpg')).toBeInTheDocument();
    await waitFor(() => expect(analyze).toHaveBeenCalledOnce());
  });

  it('127 rejects stale quality after A → B → A, even with the original pages still present', async () => {
    let finish!: (result: null) => void;
    analyze.mockReturnValue(new Promise<null>((resolve) => { finish = resolve; }));
    const onChange = vi.fn();
    const view = render(<MultiPageEvidencePicker contextKey="a" pages={[]} onChange={onChange} />);
    fireEvent.change(cameraInput(), { target: { files: [new File(['one'], 'one.jpg', { type: 'image/jpeg' })] } });
    const pages = onChange.mock.calls[0][0] as EvidencePage[];
    view.rerender(<MultiPageEvidencePicker contextKey="b" pages={pages} onChange={onChange} />);
    view.rerender(<MultiPageEvidencePicker contextKey="a" pages={pages} onChange={onChange} />);
    await act(async () => finish(null));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('127 keeps pages on unsupported format and oversize and still allows a new attempt', () => {
    const onError = vi.fn();
    const onChange = vi.fn();
    render(<MultiPageEvidencePicker pages={[]} onChange={onChange} onError={onError} maxImageBytes={4} />);
    fireEvent.change(cameraInput(), { target: { files: [new File(['heic'], 'photo.heic', { type: 'image/heic' })] } });
    fireEvent.change(cameraInput(), { target: { files: [new File(['large'], 'large.jpg', { type: 'image/jpeg' })] } });
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(cameraInput(), { target: { files: [new File(['ok'], 'ok.jpg', { type: 'image/jpeg' })] } });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('127 repeated native filenames with distinct captures append, but the same file is rejected', async () => {
    const onError = vi.fn();
    render(<Harness onError={onError} />);
    const first = new File(['one'], 'image.jpg', { type: 'image/jpeg', lastModified: 1 });
    fireEvent.change(cameraInput(), { target: { files: [first] } });
    fireEvent.change(cameraInput(), { target: { files: [new File(['two'], 'image.jpg', { type: 'image/jpeg', lastModified: 2 })] } });
    fireEvent.change(cameraInput(), { target: { files: [first] } });
    expect(onError).toHaveBeenCalledWith('Esa hoja ya fue agregada.');
    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(2));
  });

  it('127 discards a replacement if its target was removed while the camera was open', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Android');
    render(<Harness initialPages={[{ id: 'one', file: new File(['old'], 'old.jpg', { type: 'image/jpeg' }), rotation: 0,
      quality: { status: 'unusable', warnings: ['Reemplaza esta foto.'], width: 20, height: 20 } }]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar foto' }));
    const old = document.querySelector('input[capture]')!;
    fireEvent.click(screen.getByRole('button', { name: 'Quitar hoja 1' }));
    fireEvent.change(old, { target: { files: [new File(['late'], 'late.jpg', { type: 'image/jpeg' })] } });
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(analyze).not.toHaveBeenCalled();
  });

  it.each(['pdf', 'full', 'disabled'])('127 blocks capture and upload when %s', (state) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    const file = new File(['one'], 'one.jpg', { type: 'image/jpeg' });
    const pages: EvidencePage[] = state === 'pdf' ? [{ id: 'pdf', file: new File(['pdf'], 'one.pdf', { type: 'application/pdf' }), rotation: 0 }]
      : state === 'full' ? Array.from({ length: 10 }, (_, index) => ({ id: String(index), file, rotation: 0 as const })) : [];
    const onChange = vi.fn();
    render(<MultiPageEvidencePicker pages={pages} onChange={onChange} disabled={state === 'disabled'} />);
    const camera = screen.getByRole('button', { name: /^Tomar (otra )?foto/ });
    const upload = screen.getByRole('button', { name: /^(Subir fotos|Agregar más fotos)/ });
    expect(camera).toBeDisabled(); expect(upload).toBeDisabled();
    fireEvent.click(camera); fireEvent.click(upload);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('127 preserves sheets after selector failure and can retry', () => {
    const onError = vi.fn();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    render(<Harness onError={onError} initialPages={[{ id: 'one', file: new File(['one'], 'one.jpg', { type: 'image/jpeg' }), rotation: 0 }]} />);
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementationOnce(() => { throw new Error('not available'); });
    fireEvent.click(screen.getByRole('button', { name: /^Tomar otra foto/ }));
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Puedes volver a intentarlo'));
    expect(screen.getByText('one.jpg')).toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    fireEvent.change(cameraInput(), { target: { files: [new File(['two'], 'two.jpg', { type: 'image/jpeg' })] } });
    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
  });
});
