import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Camera, ImagePlus, RotateCw, Trash2, Undo2, ZoomIn } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { EvidenceScanEditor } from '@/components/evidence/EvidenceScanEditor';
import { readEvidenceEditSource, type EvidenceEditContext } from '../api';
import type { EvidenceDraftPage } from './evidenceEditModel';

const safePreview = (url?: string) => url?.startsWith('/api/calificaciones/') && !url.includes('\\') ? url : undefined;

/** La imagen de una hoja del borrador: la ajustada, la foto nueva o la guardada. */
function usePageImage(page: EvidenceDraftPage | null) {
  const blob = page?.edit?.decision === 'prepared' ? page.edit.preview : page?.file;
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url || safePreview(page?.existing?.preview_url) || '';
}

function DraftThumbnail({ page }: { page: EvidenceDraftPage }) {
  const url = usePageImage(page);
  return url
    ? <img src={url} alt="" loading="lazy" className="h-24 w-[4.5rem] rounded-md border border-border bg-white object-contain" />
    : <span className="grid h-24 w-[4.5rem] place-items-center rounded-md border border-border bg-surface-2 text-xs text-muted">Sin vista</span>;
}

/** Spec 217: la hoja en grande, para saber cuál es antes de cambiarla. */
function SheetViewer({ page, number, onClose }: { page: EvidenceDraftPage; number: number; onClose: () => void }) {
  const url = usePageImage(page);
  return <Modal open fullScreen onClose={onClose} title={`Hoja ${number}`} className="fixed inset-0 m-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none p-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:p-4 [&>h2]:mb-2 [&>h2]:shrink-0">
    <div className="grid min-h-0 flex-1 place-items-center overflow-auto rounded-xl bg-slate-100 p-2 dark:bg-slate-900">
      {url ? <img src={url} alt={`Hoja ${number} de la entrega`} className="max-h-full max-w-full object-contain" /> : <p className="text-sm text-muted">Esta hoja no tiene vista previa.</p>}
    </div>
    <div className="mt-2 shrink-0 border-t border-border pt-2 pb-[env(safe-area-inset-bottom)]">
      <Button type="button" variant="outline" className="min-h-12 w-full sm:w-auto" onClick={onClose}>Cerrar</Button>
    </div>
  </Modal>;
}

const stateLabel = (page: EvidenceDraftPage) => page.edit ? 'Girada o recortada' : page.existing ? 'Sin cambios' : 'Foto nueva';

export function EvidenceEditDraft({ gradeId, context, pages, disabled, onChange }: {
  gradeId: string; context: EvidenceEditContext; pages: EvidenceDraftPage[];
  disabled: boolean; onChange: (pages: EvidenceDraftPage[]) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const source = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{ page: EvidenceDraftPage; file: File; index: number } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  // Spec 217: la última hoja quitada, para poder devolverla a su lugar.
  const [removed, setRemoved] = useState<{ page: EvidenceDraftPage; index: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => source.current?.abort(), []);
  const locked = disabled || loading || Boolean(editor);
  const change = (next: EvidenceDraftPage[]) => { setRemoved(null); onChange(next); };
  function add(files: File[]) {
    if (locked || !files.length) return;
    const limit = context.limites;
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > limit.max_file_bytes)
      || pages.length + files.length > limit.max_pages || [...pages.flatMap(page => page.file ? [page.file] : []), ...files].reduce((sum, file) => sum + file.size, 0) > limit.max_total_bytes) {
      setError(`Selecciona fotos JPG, PNG o WebP dentro del límite de ${limit.max_pages} hojas y del tamaño permitido.`);
      return;
    }
    setError('');
    change([...pages, ...files.map(file => ({ key: crypto.randomUUID(), file, rotation: 0 as const }))]);
  }
  function move(index: number, offset: number) {
    const next = [...pages];
    const target = index + offset;
    if (locked || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  }
  function remove(page: EvidenceDraftPage, index: number) {
    if (locked) return;
    onChange(pages.filter(item => item.key !== page.key));
    setRemoved({ page, index });
    if (viewing === page.key) setViewing(null);
  }
  function undoRemove() {
    if (locked || !removed || pages.some(page => page.key === removed.page.key)) { setRemoved(null); return; }
    const next = [...pages];
    next.splice(Math.min(removed.index, next.length), 0, removed.page);
    change(next);
  }
  async function open(page: EvidenceDraftPage, index: number) {
    if (locked || source.current) return;
    if (page.file) { setEditor({ page, file: page.file, index }); return; }
    if (!page.existing.fuente_url) return;
    const controller = new AbortController();
    source.current = controller;
    setLoading(true); setError('');
    try {
      const blob = await readEvidenceEditSource(gradeId, page.existing.fuente_url, controller.signal);
      if (controller.signal.aborted) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || !blob.size || blob.size > context.limites.max_file_bytes) throw new Error('Fuente inválida');
      setEditor({ page, file: new File([blob], 'hoja-original', { type: blob.type }), index });
    } catch {
      if (!controller.signal.aborted) setError('No pudimos abrir la fuente de esta hoja. Puedes conservarla o intentarlo otra vez.');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (source.current === controller) source.current = null;
    }
  }
  const viewingIndex = pages.findIndex(page => page.key === viewing);
  const action = 'min-h-11 justify-center px-2';
  return <section className="space-y-4" aria-label="Hojas de la entrega">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Hojas de la entrega</h3><span className="text-sm text-muted">{pages.length} de {context.limites.max_pages}</span></div>
    <p className="text-sm leading-6 text-muted">Toca una hoja para verla en grande. Xali lee las hojas en este orden.</p>
    <ol className="divide-y divide-border">{pages.map((page, index) => <li key={page.key} className="flex flex-wrap items-center gap-3 py-3">
      <button type="button" className="focus-ring relative shrink-0 rounded-md" aria-label={`Ver la hoja ${index + 1} en grande`} onClick={() => setViewing(page.key)}>
        <DraftThumbnail page={page} />
        <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-slate-950/75 text-white" aria-hidden="true"><ZoomIn className="h-3.5 w-3.5" /></span>
      </button>
      <div className="min-w-28 flex-1"><p className="text-base font-semibold">Hoja {index + 1}</p><p className="text-sm text-muted">{stateLabel(page)}</p></div>
      <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
        {(page.file || page.existing?.fuente_url)
          ? <Button type="button" variant="outline" size="sm" className={action} aria-label={`Girar o recortar la hoja ${index + 1}`} disabled={locked} onClick={() => void open(page, index)}><RotateCw className="h-4 w-4 shrink-0" aria-hidden="true" />Girar o recortar</Button>
          : <span className="hidden sm:block" />}
        <Button type="button" variant="outline" size="sm" className={action} aria-label={`Subir hoja ${index + 1}`} disabled={locked || index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4 shrink-0" aria-hidden="true" />Subir</Button>
        <Button type="button" variant="outline" size="sm" className={action} aria-label={`Bajar hoja ${index + 1}`} disabled={locked || index === pages.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4 shrink-0" aria-hidden="true" />Bajar</Button>
        <Button type="button" variant="outline" size="sm" className={`${action} border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/10`} aria-label={`Quitar hoja ${index + 1}`} disabled={locked} onClick={() => remove(page, index)}><Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />Quitar</Button>
      </div>
    </li>)}</ol>
    {removed && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface-2 p-3 text-sm">
      <p>Quitaste la hoja {removed.index + 1}.</p>
      <Button type="button" variant="outline" size="sm" className="min-h-11" disabled={locked} onClick={undoRemove}><Undo2 className="h-4 w-4" aria-hidden="true" />Deshacer</Button>
    </div>}
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      <input ref={upload} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
      <input ref={camera} hidden type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={event => { add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
      <Button type="button" variant="outline" className="min-h-11" disabled={locked || pages.length >= context.limites.max_pages} onClick={() => upload.current?.click()}><ImagePlus className="h-4 w-4" aria-hidden="true" />Añadir fotos</Button>
      <Button type="button" variant="outline" className="min-h-11" disabled={locked || pages.length >= context.limites.max_pages} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" aria-hidden="true" />Tomar foto</Button>
    </div>
    {loading && <p role="status" className="text-sm text-muted">Abriendo hoja…</p>}
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {viewingIndex >= 0 && <SheetViewer page={pages[viewingIndex]} number={viewingIndex + 1} onClose={() => setViewing(null)} />}
    {editor && <EvidenceScanEditor file={editor.file} pageNumber={editor.index + 1} rotation={editor.page.rotation}
      previous={editor.page.edit ?? (editor.page.existing?.receta ? { decision: 'prepared', recipe: editor.page.existing.receta, preview: editor.file } : undefined)}
      onClose={() => setEditor(null)} onAccept={selection => {
        if (!disabled) change(pages.map(page => page.key === editor.page.key ? { ...page, edit: selection, rotation: selection.decision === 'prepared' ? selection.recipe.rotation : 0 } : page));
        setEditor(null);
      }} />}
  </section>;
}
