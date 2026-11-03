import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Camera, ImagePlus, ScanLine, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { EvidenceScanEditor } from '@/components/evidence/EvidenceScanEditor';
import { readEvidenceEditSource, type EvidenceEditContext } from '../api';
import type { EvidenceDraftPage } from './evidenceEditModel';

function DraftThumbnail({ blob, fallback }: { blob?: Blob; fallback?: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  const safeFallback = fallback?.startsWith('/api/calificaciones/') && !fallback.includes('\\') ? fallback : undefined;
  return url || safeFallback ? <img src={url || safeFallback} alt="" loading="lazy" className="h-16 w-12 shrink-0 rounded-md border border-border bg-white object-contain" /> : null;
}

export function EvidenceEditDraft({ gradeId, context, pages, disabled, onChange }: {
  gradeId: string; context: EvidenceEditContext; pages: EvidenceDraftPage[];
  disabled: boolean; onChange: (pages: EvidenceDraftPage[]) => void;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const source = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<{ page: EvidenceDraftPage; file: File; index: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => () => source.current?.abort(), []);
  const locked = disabled || loading || Boolean(editor);
  function add(files: File[]) {
    if (locked || !files.length) return;
    const limit = context.limites;
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > limit.max_file_bytes)
      || pages.length + files.length > limit.max_pages || [...pages.flatMap(page => page.file ? [page.file] : []), ...files].reduce((sum, file) => sum + file.size, 0) > limit.max_total_bytes) {
      setError(`Selecciona fotos JPG, PNG o WebP dentro del límite de ${limit.max_pages} hojas y del tamaño permitido.`);
      return;
    }
    setError('');
    onChange([...pages, ...files.map(file => ({ key: crypto.randomUUID(), file, rotation: 0 as const }))]);
  }
  function move(index: number, offset: number) {
    const next = [...pages];
    const target = index + offset;
    if (locked || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
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
  return <section className="space-y-4" aria-label="Hojas de la entrega">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Hojas de la entrega</h3><span className="text-sm text-muted">{pages.length} de {context.limites.max_pages}</span></div>
    <ol className="divide-y divide-border">{pages.map((page, index) => <li key={page.key} className="flex flex-wrap items-center gap-3 py-3">
      <DraftThumbnail blob={page.edit?.decision === 'prepared' ? page.edit.preview : page.file} fallback={page.existing?.preview_url} />
      <div className="min-w-28 flex-1"><p className="font-semibold">Hoja {index + 1}</p><p className="text-sm text-muted">{page.edit ? 'Ajustada' : page.existing ? 'Guardada' : 'Foto nueva'}</p></div>
      <div className="flex flex-wrap gap-1">
        {(page.file || page.existing?.fuente_url) && <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Ajustar hoja ${index + 1}`} disabled={locked} onClick={() => void open(page, index)}><ScanLine className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Subir hoja ${index + 1}`} disabled={locked || index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Bajar hoja ${index + 1}`} disabled={locked || index === pages.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label={`Quitar hoja ${index + 1}`} disabled={locked} onClick={() => onChange(pages.filter(item => item.key !== page.key))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </li>)}</ol>
    <div className="flex flex-wrap gap-2">
      <input ref={upload} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
      <input ref={camera} hidden type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={event => { add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ''; }} />
      <Button variant="outline" className="min-h-11" disabled={locked || pages.length >= context.limites.max_pages} onClick={() => upload.current?.click()}><ImagePlus className="h-4 w-4" />Añadir fotos</Button>
      <Button variant="ghost" className="min-h-11" disabled={locked || pages.length >= context.limites.max_pages} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" />Tomar foto</Button>
    </div>
    {loading && <p role="status" className="text-sm text-muted">Abriendo hoja…</p>}
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {editor && <EvidenceScanEditor file={editor.file} pageNumber={editor.index + 1} rotation={editor.page.rotation}
      previous={editor.page.edit ?? (editor.page.existing?.receta ? { decision: 'prepared', recipe: editor.page.existing.receta, preview: editor.file } : undefined)}
      onClose={() => setEditor(null)} onAccept={selection => {
        if (!disabled) onChange(pages.map(page => page.key === editor.page.key ? { ...page, edit: selection, rotation: selection.decision === 'prepared' ? selection.recipe.rotation : 0 } : page));
        setEditor(null);
      }} />}
  </section>;
}
