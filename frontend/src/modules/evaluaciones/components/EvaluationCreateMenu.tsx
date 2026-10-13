import { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';

export function EvaluationCreateMenu({ onAI, onPhoto, onManual, photoDisabled = false, disabled = false }: {
  onAI: () => void;
  onPhoto: () => void;
  onManual: () => void;
  photoDisabled?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const id = useId();
  const choose = (action: () => void) => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
    action();
  };
  return <div className="min-w-0" onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); setOpen(false);
      opener.current?.focus({ preventScroll: true });
    }
  }}>
    <Button ref={opener} type="button" disabled={disabled} aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>Crear evaluación <ChevronDown className="h-4 w-4" aria-hidden="true" /></Button>
    {open && <div id={id} role="group" aria-label="Cómo crear la evaluación" className="mt-2 flex flex-col gap-2 rounded-xl border border-border bg-surface p-2 sm:flex-row sm:flex-wrap">
      <Button type="button" variant="outline" className="min-h-11" onClick={() => choose(onAI)}>Crear con IA</Button>
      <Button type="button" variant="outline" className="min-h-11" disabled={photoDisabled} onClick={() => choose(onPhoto)}>Usar foto o PDF</Button>
      <Button type="button" variant="outline" className="min-h-11" onClick={() => choose(onManual)}>Crear manualmente</Button>
      {photoDisabled && <p className="text-xs text-muted">Selecciona una materia para usar una foto o PDF.</p>}
    </div>}
  </div>;
}
