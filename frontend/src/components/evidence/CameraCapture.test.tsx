import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CameraCapture } from './CameraCapture';

const camera = vi.fn();
const stop = vi.fn();
const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: camera } });
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
  it('requests video only, reviews a capture and accepts it once without uploading', async () => {
    const user = userEvent.setup();
    const accept = vi.fn();
    render(<CameraCapture onCapture={accept} onClose={vi.fn()} onUpload={vi.fn()} onNativeCamera={vi.fn()} />);
    await waitFor(() => expect(camera).toHaveBeenCalledWith({ audio: false, video: {
      facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 },
    } }));
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
