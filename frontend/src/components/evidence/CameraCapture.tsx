import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Modal } from '@/components/ui';

function cameraError(error: unknown) {
  const name = typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'No tenemos permiso para usar la cámara. Puedes permitirlo en tu navegador o subir una foto.';
  if (name === 'NotFoundError') return 'No encontramos una cámara disponible. Puedes subir una foto.';
  if (name === 'NotReadableError') return 'Otra aplicación puede estar usando la cámara. Ciérrala o sube una foto.';
  if (name === 'OverconstrainedError') return 'La cámara elegida ya no está disponible. Actualiza la lista y elige otra cámara.';
  return 'No pudimos abrir la cámara en este navegador. Puedes subir una foto o usar la opción de tu dispositivo.';
}

/** Local-only capture. The parent owns delivery context and explicit submission. */
export function CameraCapture({ onCapture, onClose, onUpload, onNativeCamera, preferredCameraId = '', onCameraChange }: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUpload: () => void;
  onNativeCamera: () => void;
  preferredCameraId?: string;
  onCameraChange?: (deviceId: string) => void;
}) {
  const selectId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const active = useRef(false);
  const accepting = useRef(false);
  const encoding = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const choiceRef = useRef(onCameraChange);
  choiceRef.current = onCameraChange;
  const listRequest = useRef(0);
  const knownDevices = useRef(new Set<string>());
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [requestedCamera, setRequestedCamera] = useState(preferredCameraId);
  const [activeCamera, setActiveCamera] = useState('');
  const [listError, setListError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  function close(action = onClose) { active.current = false; stop(); action(); }
  const invalidateList = useCallback(() => { listRequest.current += 1; }, []);

  const refreshDevices = useCallback(async () => {
    const request = ++listRequest.current;
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const available = await navigator.mediaDevices.enumerateDevices();
      if (!active.current || request !== listRequest.current) return;
      const cameras = available.filter((device) => device.kind === 'videoinput' && device.deviceId);
      const id = streamRef.current?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
      if (!encoding.current && id && knownDevices.current.has(id) && !cameras.some((device) => device.deviceId === id)) {
        stop(); setReady(false);
        setError('La cámara elegida ya no está disponible. Elige otra cámara o sube una foto.');
      }
      knownDevices.current = new Set(cameras.map((device) => device.deviceId));
      setDevices(cameras);
      setListError('');
    } catch {
      if (active.current && request === listRequest.current) {
        setListError('No pudimos actualizar la lista. Puedes seguir con esta cámara o volver a intentarlo.');
      }
    }
  }, [stop]);

  useEffect(() => {
    let cancelled = false;
    let ownedStream: MediaStream | null = null;
    let removeEnded = () => {};
    active.current = true;
    setError(''); setReady(false); setPhoto(null); setBusy(false);
    encoding.current = false; accepting.current = false;
    const hide = () => {
      if (document.visibilityState === 'hidden') { active.current = false; stop(); closeRef.current(); }
    };
    document.addEventListener('visibilitychange', hide);
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
          ...(requestedCamera ? { deviceId: { exact: requestedCamera } } : { facingMode: { ideal: 'environment' } }),
          width: { ideal: 2560 }, height: { ideal: 1920 },
        } });
        if (cancelled || !active.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        ownedStream = stream;
        const track = stream.getVideoTracks?.()[0];
        const actualId = track?.getSettings?.().deviceId || requestedCamera;
        setActiveCamera(actualId);
        if (actualId) choiceRef.current?.(actualId);
        const ended = () => {
          if (cancelled || !active.current || streamRef.current !== stream) return;
          stop(); setReady(false);
          setError('La cámara se desconectó o dejó de estar disponible. Elige otra cámara o sube una foto.');
          void refreshDevices();
        };
        track?.addEventListener?.('ended', ended);
        removeEnded = () => track?.removeEventListener?.('ended', ended);
        void refreshDevices();
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        if (!cancelled && active.current && video.videoWidth > 0) setReady(true);
      } catch (failure) {
        if (!cancelled && active.current) { stop(); setError(cameraError(failure)); void refreshDevices(); }
      }
    })();
    return () => {
      cancelled = true; active.current = false; invalidateList();
      removeEnded();
      if (streamRef.current === ownedStream) stop();
      document.removeEventListener('visibilitychange', hide);
    };
  }, [attempt, requestedCamera, refreshDevices, stop, invalidateList]);

  useEffect(() => {
    const media = navigator.mediaDevices;
    const changed = () => { void refreshDevices(); };
    media?.addEventListener?.('devicechange', changed);
    return () => media?.removeEventListener?.('devicechange', changed);
  }, [refreshDevices]);

  useEffect(() => {
    if (!photo) { setPhotoUrl(''); return; }
    const url = URL.createObjectURL(photo);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function capture() {
    const video = videoRef.current;
    if (!active.current || !ready || encoding.current || !video?.videoWidth || !video.videoHeight) return;
    encoding.current = true; setBusy(true);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2560 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        canvas.width = 0; canvas.height = 0;
        if (!active.current) return;
        encoding.current = false; setBusy(false);
        if (!blob) { setError('No pudimos guardar la foto. Vuelve a intentarlo o sube una imagen.'); return; }
        stop();
        setPhoto(new File([blob], `foto-${crypto.randomUUID()}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    } catch {
      encoding.current = false; setBusy(false);
      canvas.width = 0; canvas.height = 0;
      setError('No pudimos tomar la foto. Vuelve a intentarlo o sube una imagen.');
    }
  }

  return <Modal open onClose={() => close()} title="Tomar foto" className="flex max-w-3xl flex-col overflow-y-auto">
    <div className="mb-3 flex shrink-0 flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1 basis-40">
        <label htmlFor={selectId} className="mb-1 block text-sm font-semibold">Cámara</label>
        <select id={selectId} value={requestedCamera || activeCamera} disabled={busy || Boolean(photo)}
          className="focus-ring h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm text-fg"
          onChange={(event) => {
            if (encoding.current || photo) return;
            active.current = false; stop(); setReady(false);
            setRequestedCamera(event.target.value); setAttempt((value) => value + 1);
          }}>
          <option value="">Automática</option>
          {(requestedCamera || activeCamera) && !devices.some((device) => device.deviceId === (requestedCamera || activeCamera))
            && <option value={requestedCamera || activeCamera}>Cámara elegida</option>}
          {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Cámara ${index + 1}`}
          </option>)}
        </select>
      </div>
      <Button variant="outline" disabled={busy || Boolean(photo)} onClick={() => { void refreshDevices(); }}>Actualizar cámaras</Button>
    </div>
    {listError && <p role="status" className="mb-2 text-sm text-muted">{listError}</p>}
    <div className="relative grid min-h-0 place-items-center overflow-hidden rounded-xl bg-slate-950">
      <video ref={videoRef} autoPlay muted playsInline onLoadedData={() => {
        if (active.current && streamRef.current && videoRef.current?.srcObject === streamRef.current) setReady(true);
      }} className={photo || error ? 'hidden' : 'max-h-[40dvh] w-full object-contain'} aria-label="Vista de la cámara" />
      {photoUrl && <img src={photoUrl} alt="Foto para revisar" className="max-h-[40dvh] w-full object-contain" />}
    </div>
    {error ? <p role="alert" className="my-3 text-sm leading-6 text-amber-800 dark:text-amber-200">{error}</p>
      : <p role="status" className="my-3 text-sm text-muted">{photo ? 'Revisa que puedas leer las respuestas antes de añadir la foto.' : ready ? 'Encuadra la hoja y toma la foto. Todavía no se enviará a calificar.' : 'Abriendo cámara… Permite el acceso cuando tu navegador lo solicite.'}</p>}
    <div className="grid shrink-0 grid-cols-2 gap-2">
      {photo ? <>
        <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Repetir foto</Button>
        <Button onClick={() => { if (!active.current || accepting.current) return; accepting.current = true; close(() => onCapture(photo)); }}>Usar esta foto</Button>
      </> : <>
        <Button variant="outline" onClick={() => close()}>Cancelar</Button>
        {error ? <Button onClick={() => setAttempt((value) => value + 1)}>Volver a intentar</Button>
          : <Button disabled={!ready} loading={busy} onClick={capture}>Tomar foto</Button>}
      </>}
      <Button variant="ghost" className="col-span-2 h-auto min-h-11 whitespace-normal" onClick={() => close(onUpload)}>Subir fotos o PDF</Button>
      <Button variant="ghost" className="col-span-2 h-auto min-h-11 whitespace-normal" onClick={() => close(onNativeCamera)}>Usar cámara del dispositivo</Button>
    </div>
  </Modal>;
}
