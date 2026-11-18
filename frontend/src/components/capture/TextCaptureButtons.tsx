import { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { captureText, TEXT_CAPTURE_ACCEPT, TEXT_CAPTURE_MAX_BYTES, type CapturedText } from './textCapture';

const buttonClass =
  'focus-ring inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 ' +
  'text-sm font-semibold text-fg transition-colors hover:border-brand-300 hover:bg-surface-2 sm:flex-none';

/**
 * Llena un campo de texto sin digitar: tomar una foto, subir un archivo o pegar.
 * El texto leído se entrega a `onText`; quien lo usa decide dónde ponerlo.
 */
export function TextCaptureButtons({
  onText,
  disabled = false,
  subject = 'el texto',
  className,
}: {
  onText: (text: string, captured: CapturedText) => void;
  disabled?: boolean;
  /** Para los mensajes: «la lectura», «las instrucciones»… */
  subject?: string;
  className?: string;
}) {
  const [reading, setReading] = useState(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort(); };
  }, []);

  const read = async (file: File | undefined, input: HTMLInputElement) => {
    input.value = '';
    if (!file || reading) return;
    if (file.size > TEXT_CAPTURE_MAX_BYTES) {
      toast.error('El archivo supera los 20 MB. Usa uno más liviano.');
      return;
    }
    controller.current = new AbortController();
    setReading(true);
    try {
      const captured = await captureText(file, controller.current.signal);
      if (!active.current) return;
      if (!captured.texto.trim()) {
        toast.error(captured.advertencias[0] ?? 'No se encontró texto legible. Prueba con otra foto o pega el texto.');
        return;
      }
      onText(captured.texto, captured);
      toast.success(`Listo: se añadió ${subject} desde ${captured.origen === 'foto' ? 'la foto' : `el ${captured.origen}`}. Revísalo antes de guardar.`);
      captured.advertencias.slice(0, 2).forEach((warning) => toast(warning, { icon: '⚠️' }));
    } catch (error) {
      if (active.current && !controller.current?.signal.aborted) toast.error(toApiError(error).detail);
    } finally {
      if (active.current) setReading(false);
    }
  };

  const blocked = disabled || reading;
  return (
    <div className={cn('space-y-1.5', className)} data-text-capture>
      <div className="flex flex-wrap gap-2">
        <label className={cn(buttonClass, blocked && 'pointer-events-none opacity-60')}>
          <Camera className="h-4 w-4 shrink-0" aria-hidden="true" /> Tomar foto
          <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={blocked}
            aria-label={`Tomar una foto de ${subject}`} onChange={(event) => void read(event.target.files?.[0], event.target)} />
        </label>
        <label className={cn(buttonClass, blocked && 'pointer-events-none opacity-60')}>
          <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" /> Subir archivo
          <input type="file" accept={TEXT_CAPTURE_ACCEPT} className="sr-only" disabled={blocked}
            aria-label={`Subir un archivo con ${subject}`} onChange={(event) => void read(event.target.files?.[0], event.target)} />
        </label>
      </div>
      {reading ? (
        <p className="flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300" role="status">
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Leyendo el archivo… puede tardar unos segundos.
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted">También puedes pegar el texto. Se aceptan fotos, PDF, Word, Excel, CSV y texto.</p>
      )}
    </div>
  );
}
