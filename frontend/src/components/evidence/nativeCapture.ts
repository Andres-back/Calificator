type DeviceHints = Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'>;

/** Presentation preference only: a narrow desktop window is still a webcam. */
export function prefersNativeCapture(device: DeviceHints = navigator): boolean {
  return /Android|iPhone|iPad|iPod/i.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1);
}

interface PickerOptions {
  nativeCamera: boolean;
  allowPdf: boolean;
  onFiles: (files: File[]) => void;
}

/** A distinct input/handler per opening keeps a late result bound to its attempt.
 * Must be called directly from the user's gesture (particularly on iOS).
 * Silent cancellation is harmless: there is no busy state; the caller disposes
 * this control on the next opening, context change or unmount.
 */
export function openEvidenceFilePicker({ nativeCamera, allowPdf, onFiles }: PickerOptions): () => void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = `image/jpeg,image/png,image/webp${!nativeCamera && allowPdf ? ',application/pdf' : ''}`;
  input.multiple = !nativeCamera;
  if (nativeCamera) input.setAttribute('capture', 'environment');
  input.setAttribute('aria-label', nativeCamera ? 'Tomar fotografía' : 'Seleccionar fotografías');
  input.tabIndex = -1;
  input.hidden = true;
  const trigger = document.activeElement;
  let settled = false;
  const dispose = () => {
    settled = true;
    input.removeEventListener('change', accept);
    input.removeEventListener('cancel', cancel);
    input.value = '';
    input.remove();
  };
  const restoreFocus = () => {
    if (trigger instanceof HTMLElement && trigger.isConnected
      && (document.activeElement === document.body || document.activeElement === input)) trigger.focus({ preventScroll: true });
  };
  const cancel = () => { dispose(); restoreFocus(); };
  const accept = () => {
    if (settled) return;
    const files = Array.from(input.files ?? []);
    dispose();
    restoreFocus();
    if (files.length) onFiles(files);
  };
  input.addEventListener('change', accept);
  input.addEventListener('cancel', cancel);
  document.body.append(input);
  try { input.click(); } catch (error) { dispose(); throw error; }
  return dispose;
}
