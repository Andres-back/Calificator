import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, Camera, CheckCircle2, FilePlus2, FileText, Images,
  RotateCw, Trash2, ZoomIn,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Modal } from '@/components/ui';
import type { EvidencePage, EvidenceRotation } from './evidencePayload';
import { analyzeEvidenceImage } from './imageQuality';

const MAX_FILES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf',
]);

interface Props {
  pages: EvidencePage[];
  onChange: (pages: EvidencePage[]) => void;
  disabled?: boolean;
  onError?: (message: string) => void;
}

function PageVisual({ page, className }: { page: EvidencePage; className: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const nextUrl = URL.createObjectURL(page.file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [page.file]);

  if (page.file.type === 'application/pdf') {
    return (
      <div className={`${className} grid place-items-center bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300`}>
        <FileText className="h-12 w-12" />
      </div>
    );
  }
  return (
    <div className={`${className} grid place-items-center overflow-hidden bg-surface-2`}>
      {url && <img src={url} alt="" className="max-h-full max-w-full object-contain transition-transform" style={{ transform: `rotate(${page.rotation}deg)` }} />}
    </div>
  );
}

function PreviewModal({ page, pageNumber, onClose }: { page: EvidencePage | null; pageNumber: number; onClose: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!page) { setUrl(''); return undefined; }
    const nextUrl = URL.createObjectURL(page.file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [page]);
  return (
    <Modal open={Boolean(page)} onClose={onClose} title={page?.file.type === 'application/pdf' ? 'Documento PDF' : `Vista de la hoja ${pageNumber}`} className="max-w-5xl">
      {page?.file.type === 'application/pdf' ? (
        <iframe src={url} title="Vista previa del PDF" className="h-[70vh] w-full rounded-xl border border-border bg-white" />
      ) : (
        <div className="grid min-h-[55vh] place-items-center overflow-auto rounded-xl bg-surface-2 p-4">
          {url && page && <img src={url} alt={`Hoja ${pageNumber}`} className="max-h-[70vh] max-w-full object-contain transition-transform" style={{ transform: `rotate(${page.rotation}deg)` }} />}
        </div>
      )}
    </Modal>
  );
}

export function MultiPageEvidencePicker({ pages, onChange, disabled = false, onError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pagesRef = useRef(pages);
  const [previewId, setPreviewId] = useState<string | null>(null);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const reportError = (message: string) => onError ? onError(message) : toast.error(message);

  const addFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (!incoming.length) return;
    if (incoming.some((file) => !ALLOWED_TYPES.has(file.type))) {
      reportError('Selecciona fotografías JPG, PNG o WebP, o un único PDF.'); return;
    }
    const incomingPdf = incoming.some((file) => file.type === 'application/pdf');
    const existingPdf = pages.some((page) => page.file.type === 'application/pdf');
    if ((incomingPdf && (incoming.length > 1 || pages.length > 0)) || existingPdf) {
      reportError('Entrega varias fotografías o un único PDF, pero no los mezcles.'); return;
    }
    if (!incomingPdf && pages.length + incoming.length > MAX_FILES) {
      reportError(`Puedes seleccionar máximo ${MAX_FILES} fotografías.`); return;
    }
    if (incoming.some((file) => file.type !== 'application/pdf' && file.size > MAX_IMAGE_BYTES)) {
      reportError('Cada fotografía debe pesar máximo 10 MB.'); return;
    }
    const totalBytes = [...pages.map((page) => page.file), ...incoming].reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_TOTAL_BYTES) {
      reportError('El paquete completo debe pesar máximo 40 MB.'); return;
    }
    const existingKeys = new Set(pages.map((page) => `${page.file.name}:${page.file.size}:${page.file.lastModified}`));
    const unique = incoming.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key); return true;
    });
    if (!unique.length) { reportError('Esa hoja ya fue agregada.'); return; }
    const additions: EvidencePage[] = unique.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      rotation: 0 as EvidenceRotation,
    }));
    const nextPages = [...pagesRef.current, ...additions];
    pagesRef.current = nextPages;
    onChange(nextPages);
    void Promise.all(additions.map(async (page) => ({
      id: page.id,
      quality: await analyzeEvidenceImage(page.file),
    }))).then((assessments) => {
      const byId = new Map(assessments.map((item) => [item.id, item.quality]));
      const assessedPages = pagesRef.current.map((page) => (
        byId.has(page.id) ? { ...page, quality: byId.get(page.id) } : page
      ));
      pagesRef.current = assessedPages;
      onChange(assessedPages);
    });
  };

  const updatePage = (id: string, changes: Partial<EvidencePage>) => onChange(
    pages.map((page) => page.id === id ? { ...page, ...changes } : page),
  );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const remove = (id: string) => {
    onChange(pages.filter((page) => page.id !== id));
    if (previewId === id) setPreviewId(null);
  };

  const isPdf = pages[0]?.file.type === 'application/pdf';
  const previewIndex = pages.findIndex((page) => page.id === previewId);
  const totalMb = pages.reduce((total, page) => total + page.file.size, 0) / 1024 / 1024;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={disabled || isPdf || pages.length >= MAX_FILES} onClick={() => fileInputRef.current?.click()} className="focus-ring flex min-h-24 items-center gap-3 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/60 p-4 text-left transition hover:border-brand-500 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/40 dark:bg-brand-500/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-white/10 dark:text-brand-200"><FilePlus2 className="h-6 w-6" /></span>
          <span><strong className="block text-sm text-fg">{pages.length ? 'Agregar más fotos' : 'Elegir fotos o PDF'}</strong><span className="mt-1 block text-xs leading-5 text-muted">Hasta 10 fotos ordenadas o un PDF</span></span>
        </button>
        <button type="button" disabled={disabled || isPdf || pages.length >= MAX_FILES} onClick={() => cameraInputRef.current?.click()} className="focus-ring flex min-h-24 items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition hover:border-sky-400 hover:bg-sky-50/50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-sky-500/10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"><Camera className="h-6 w-6" /></span>
          <span><strong className="block text-sm text-fg">{pages.length ? 'Tomar otra foto' : 'Usar la cámara'}</strong><span className="mt-1 block text-xs leading-5 text-muted">Cada foto se añade como una hoja nueva</span></span>
        </button>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { if (event.target.files) void addFiles(event.target.files); event.target.value = ''; }} />

      {pages.length > 0 && <>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg"><Images className="h-4 w-4 text-brand-600" />{isPdf ? '1 PDF seleccionado' : `${pages.length} ${pages.length === 1 ? 'hoja seleccionada' : 'hojas seleccionadas'}`}</p>
          <p className="text-xs text-muted">{totalMb.toFixed(1)} MB de 40 MB</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pages.map((page, index) => <li key={page.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="relative"><PageVisual page={page} className="h-40 w-full" /><span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-bold text-white">{isPdf ? 'PDF' : `Hoja ${index + 1}`}</span></div>
            <div className="space-y-3 p-3">
              <p className="truncate text-sm font-semibold text-fg" title={page.file.name}>{page.file.name}</p>
              {page.quality?.status === 'good' && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Foto lista para leer
                </p>
              )}
              {page.quality?.status === 'warning' && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-4 w-4" /> Revisa esta foto</p>
                  <p>{page.quality.warnings.join(' ')}</p>
                  <button type="button" className="mt-1 font-bold underline" onClick={() => { remove(page.id); cameraInputRef.current?.click(); }}>Repetir foto</button>
                  <span className="ml-2">o continúa si puedes leerla.</span>
                </div>
              )}
              {page.quality?.status === 'unusable' && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs leading-5 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                  <p className="flex items-center gap-1.5 font-bold"><AlertTriangle className="h-4 w-4" /> Reemplaza esta foto</p>
                  <p>{page.quality.warnings.join(' ')}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {!isPdf && <>
                  <button type="button" disabled={disabled || index === 0} onClick={() => move(index, -1)} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg border border-border hover:bg-surface-2 disabled:opacity-35" aria-label={`Subir hoja ${index + 1}`}><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" disabled={disabled || index === pages.length - 1} onClick={() => move(index, 1)} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg border border-border hover:bg-surface-2 disabled:opacity-35" aria-label={`Bajar hoja ${index + 1}`}><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" disabled={disabled} onClick={() => updatePage(page.id, { rotation: ((page.rotation + 90) % 360) as EvidenceRotation })} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg border border-border hover:bg-surface-2" aria-label={`Rotar hoja ${index + 1}`}><RotateCw className="h-4 w-4" /></button>
                </>}
                <button type="button" onClick={() => setPreviewId(page.id)} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg border border-border hover:bg-surface-2" aria-label={isPdf ? 'Ampliar PDF' : `Ampliar hoja ${index + 1}`}><ZoomIn className="h-4 w-4" /></button>
                <button type="button" disabled={disabled} onClick={() => remove(page.id)} className="focus-ring grid min-h-11 min-w-11 place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:border-rose-500/30 dark:hover:bg-rose-500/10" aria-label={isPdf ? 'Quitar PDF' : `Quitar hoja ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </li>)}
        </ol>
        {!isPdf && pages.length > 1 && <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">Revisa el orden: Xali leerá primero la hoja 1 y continuará hasta la hoja {pages.length}.</p>}
      </>}
      <PreviewModal page={previewIndex >= 0 ? pages[previewIndex] : null} pageNumber={previewIndex + 1} onClose={() => setPreviewId(null)} />
    </div>
  );
}
