import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button, ConfirmDialog, Field, Textarea } from '@/components/ui';

export function GradeFeedback({ value, original, canEdit, onChange, onSave, saving = false, saveDisabled = false, error, onFinishEditing }: {
  value: string;
  original: string;
  canEdit: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  error?: string;
  onFinishEditing?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const previousOriginal = useRef(original);
  const dirty = value !== original;

  useEffect(() => {
    // The existing save/refetch contract supplies the newly stored feedback.
    // An error leaves original unchanged and must keep the editor/draft open.
    if (previousOriginal.current === original) return;
    previousOriginal.current = original;
    setEditing(false);
    onFinishEditing?.();
    window.requestAnimationFrame(() => editButtonRef.current?.focus({ preventScroll: true }));
  }, [original, onFinishEditing]);

  useLayoutEffect(() => {
    if (!editing || !canEdit) return;
    const input = inputRef.current;
    if (!input) return;
    const resize = () => {
      input.style.height = 'auto';
      input.style.height = `${Math.max(192, input.scrollHeight + 2)}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    let width = input.getBoundingClientRect().width;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth != null && nextWidth !== width) { width = nextWidth; resize(); }
    });
    observer?.observe(input);
    return () => { window.removeEventListener('resize', resize); observer?.disconnect(); };
  }, [editing, canEdit, value]);

  function finish() {
    setEditing(false);
    setDiscardOpen(false);
    onFinishEditing?.();
    window.requestAnimationFrame(() => editButtonRef.current?.focus({ preventScroll: true }));
  }

  return <>
    <div className="mb-4 flex items-start justify-between gap-3">
      <h2 className="min-w-0 text-base font-bold">Retroalimentación para el estudiante</h2>
      {!editing && canEdit && <Button ref={editButtonRef} variant="outline" className="shrink-0 px-3" aria-label="Editar retroalimentación" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" /> Editar</Button>}
    </div>
    {editing && canEdit ? <div className="space-y-3">
      <Field label="Retroalimentación" hint="El cambio queda en el historial. Guarda cuando termines de revisar.">
        <Textarea ref={inputRef} aria-label="Retroalimentación" autoFocus value={value} disabled={saving} onChange={(event) => onChange(event.target.value)} placeholder="Escribe qué logró el estudiante y cómo puede mejorar…" rows={8} className="min-h-48 resize-none overflow-hidden text-base leading-7" />
      </Field>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error} Tu borrador sigue aquí.</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button onClick={() => { onFinishEditing?.(); onSave(); }} loading={saving} disabled={!dirty || saveDisabled}>Guardar retroalimentación</Button>
        <Button variant="outline" disabled={saving} onClick={() => dirty ? setDiscardOpen(true) : finish()}>Cancelar edición</Button>
      </div>
    </div> : <div className="space-y-4">
      {value ? <p data-testid="grade-feedback-text" className="whitespace-pre-wrap text-base leading-7 text-fg [overflow-wrap:anywhere]">{value}</p> : <p className="text-base leading-7 text-muted">Todavía no hay retroalimentación guardada.</p>}
    </div>}
    <ConfirmDialog open={discardOpen} onClose={() => setDiscardOpen(false)} onConfirm={() => { onChange(original); finish(); }} title="¿Descartar los cambios de retroalimentación?" description="Solo se descartará este texto sin guardar. La nota y los demás ajustes no se cambian." confirmLabel="Descartar cambios" cancelLabel="Seguir editando" tone="danger" />
  </>;
}
