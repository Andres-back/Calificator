import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCapture } from './CameraCapture';

const camera = vi.fn();
const enumerate = vi.fn();
const deviceEvents = new EventTarget();
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;

beforeEach(() => {
  vi.clearAllMocks();
  camera.mockReset();
  enumerate.mockReset();
  enumerate.mockResolvedValue([]);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: camera, enumerateDevices: enumerate,
    addEventListener: deviceEvents.addEventListener.bind(deviceEvents),
    removeEventListener: deviceEvents.removeEventListener.bind(deviceEvents),
  } });
  camera.mockResolvedValue(stream);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['photo'], { type: 'image/jpeg' })));
});

function readyVideo() {
  const video = document.querySelector('video')!;
  Object.defineProperties(video, { videoWidth: { configurable: true, value: 1200 }, videoHeight: { configurable: true, value: 1600 } });
  fireEvent.loadedData(video);
}

describe('CameraCapture', () => {
  const devices = [
    { kind: 'videoinput', deviceId: 'integrated', label: 'Integrada' },
    { kind: 'videoinput', deviceId: 'usb', label: 'USB' },
    { kind: 'videoinput', deviceId: 'other', label: '' },
    { kind: 'audioinput', deviceId: 'mic', label: 'Micrófono' },
  ];
  function deviceStream(id: string) {
    const track = Object.assign(new EventTarget(), { stop: vi.fn(), getSettings: () => ({ deviceId: id }) });
    return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
  }

  it.each(['integrated', 'usb', 'other'])('captures a reviewable photo with %s without submitting', async (id) => {
    const selected = deviceStream(id);
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValue(selected.stream);
    const accept = vi.fn();
    render(<CameraCapture preferredCameraId={id} onCapture={accept} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    readyVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));
    expect(await screen.findByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    expect(selected.track.stop).toHaveBeenCalledOnce();
    expect(accept).not.toHaveBeenCalled();
  });

  it('lists authorized video cameras with fallback labels and stops before changing', async () => {
    const first = deviceStream('integrated');
    const second = deviceStream('usb');
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValueOnce(first.stream).mockImplementationOnce(() => {
      expect(first.track.stop).toHaveBeenCalled();
      return Promise.resolve(second.stream);
    });
    const change = vi.fn();
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} onCameraChange={change} />);
    const select = await screen.findByRole('combobox', { name: 'Cámara' });
    await screen.findByRole('option', { name: 'Cámara 3' });
    expect(screen.queryByRole('option', { name: 'Micrófono' })).not.toBeInTheDocument();
    expect(select).toHaveValue('integrated');
    readyVideo();
    fireEvent.change(select, { target: { value: 'usb' } });
    expect(screen.getByRole('button', { name: 'Tomar foto' })).toBeDisabled();
    await waitFor(() => expect(camera).toHaveBeenLastCalledWith({ audio: false, video: {
      deviceId: { exact: 'usb' }, width: { ideal: 2560 }, height: { ideal: 1920 },
    } }));
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(second.stream));
    expect(change).toHaveBeenLastCalledWith('usb');
  });

  it('discards an older selection without stopping the newer camera', async () => {
    const first = deviceStream('integrated');
    const late = deviceStream('usb');
    const last = deviceStream('other');
    let resolve!: (value: MediaStream) => void;
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValueOnce(first.stream)
      .mockImplementationOnce(() => new Promise<MediaStream>((done) => { resolve = done; }))
      .mockResolvedValueOnce(last.stream);
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Cámara' }), { target: { value: 'usb' } });
    await waitFor(() => expect(camera).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole('combobox', { name: 'Cámara' }), { target: { value: 'other' } });
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(last.stream));
    await act(async () => resolve(late.stream));
    expect(late.track.stop).toHaveBeenCalledOnce();
    expect(last.track.stop).not.toHaveBeenCalled();
    expect(document.querySelector('video')?.srcObject).toBe(last.stream);
  });

  it('recovers when an active camera disappears from the refreshed list', async () => {
    const first = deviceStream('integrated');
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValue(first.stream);
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    readyVideo();
    enumerate.mockResolvedValue(devices.slice(1));
    await act(async () => deviceEvents.dispatchEvent(new Event('devicechange')));
    expect(screen.getByRole('alert')).toHaveTextContent(/disponible/i);
    expect(first.track.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeEnabled();
  });

  it('keeps a working camera when enumeration fails and offers manual refresh', async () => {
    const first = deviceStream('integrated');
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValue(first.stream);
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    readyVideo();
    enumerate.mockRejectedValue(new Error('unavailable'));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar cámaras' }));
    expect(await screen.findByText(/No pudimos actualizar la lista/)).toBeVisible();
    expect(first.track.stop).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tomar foto' })).toBeEnabled();
  });

  it('preserves a reviewed photo during device updates and offers another camera on disconnect', async () => {
    const first = deviceStream('integrated');
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValue(first.stream);
    const accept = vi.fn();
    render(<CameraCapture onCapture={accept} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    readyVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));
    expect(await screen.findByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    enumerate.mockResolvedValue(devices.slice(1));
    await act(async () => deviceEvents.dispatchEvent(new Event('devicechange')));
    expect(screen.getByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Cámara' })).toBeDisabled();
    expect(accept).not.toHaveBeenCalled();
  });

  it('recovers from unplugging or unavailable preference without changing prepared pages', async () => {
    const first = deviceStream('integrated');
    enumerate.mockResolvedValue(devices);
    camera.mockResolvedValue(first.stream);
    render(<CameraCapture preferredCameraId="integrated" onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await screen.findByRole('option', { name: 'USB' });
    readyVideo();
    await act(async () => first.track.dispatchEvent(new Event('ended')));
    expect(screen.getByRole('alert')).toHaveTextContent(/desconect|disponible/i);
    expect(first.track.stop).toHaveBeenCalled();
    enumerate.mockResolvedValue(devices.slice(1));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar cámaras' }));
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Integrada' })).not.toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: 'Cámara' }), { target: { value: 'usb' } });
    await waitFor(() => expect(camera).toHaveBeenCalledTimes(2));
  });
  it('requests video only, reviews a capture and accepts it once without uploading', async () => {
    const user = userEvent.setup();
    const accept = vi.fn();
    render(<CameraCapture onCapture={accept} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await waitFor(() => expect(camera).toHaveBeenCalledWith({ audio: false, video: {
      facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 },
    } }));
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(stream));
    readyVideo();
    await user.click(screen.getByRole('button', { name: 'Tomar foto' }));
    expect(await screen.findByRole('img', { name: 'Foto para revisar' })).toBeVisible();
    expect(accept).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalled();
    await user.dblClick(screen.getByRole('button', { name: 'Usar esta foto' }));
    expect(accept).toHaveBeenCalledTimes(1);
    expect(accept.mock.calls[0][0]).toBeInstanceOf(File);
    expect(accept.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('offers a file alternative on denied permission without changing pages', async () => {
    camera.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const upload = vi.fn();
    const accept = vi.fn();
    render(<CameraCapture onCapture={accept} onClose={vi.fn()} onUpload={upload} onNativeCamera={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/permiso/i);
    await userEvent.click(screen.getByRole('button', { name: 'Subir fotos o PDF' }));
    expect(upload).toHaveBeenCalledOnce();
    expect(accept).not.toHaveBeenCalled();
  });

  it('stops a stream whose permission resolves after closing', async () => {
    let resolve!: (value: MediaStream) => void;
    camera.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done; }));
    const view = render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    view.unmount();
    await act(async () => resolve(stream));
    expect(stop).toHaveBeenCalledOnce();
  });

  it('stops and closes on backgrounding', async () => {
    const close = vi.fn();
    render(<CameraCapture onCapture={vi.fn()} onClose={close} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(stream));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(stop).toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('ignores a late encoded photo after unmount', async () => {
    let encode!: BlobCallback;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => { encode = callback; });
    const accept = vi.fn();
    const view = render(<CameraCapture onCapture={accept} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await waitFor(() => expect(document.querySelector('video')?.srcObject).toBe(stream));
    readyVideo();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));
    view.unmount();
    await act(async () => encode(new Blob(['late'], { type: 'image/jpeg' })));
    expect(accept).not.toHaveBeenCalled();
  });

  it('allows retrying a missing camera and keeps native selection explicit', async () => {
    camera.mockRejectedValueOnce(new DOMException('missing', 'NotFoundError'));
    const native = vi.fn();
    render(<CameraCapture onCapture={vi.fn()} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={native} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/cámara/i);
    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    await waitFor(() => expect(camera).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByRole('button', { name: 'Usar cámara del dispositivo' }));
    expect(native).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalled();
  });
});
