import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { paginateFeedback, type FeedbackPrintEntry } from './printPagination';
import './feedback-print.css';
import { feedbackPrintText } from './feedbackSections';
import { feedbackMotifs, motifForStudent, type PrintMotif } from './feedbackMotifs';
import { MotifPicker } from '@/modules/motif_library/MotifPicker';
import { collectionMotifs } from '@/modules/motif_library/api';
import { curatedAssetPath } from '@/modules/motif_library/motifLibrary';
import type { Motif } from '@/modules/motif_library/types';

export function FeedbackPrintSheet({ entries, onClose, suggestedArea }: { entries: FeedbackPrintEntry[]; onClose: () => void; suggestedArea?: string | null }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user);
  const [printing, setPrinting] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [motif, setMotif] = useState('none');
  const [gallery, setGallery] = useState(false);
  const [availableMotifs, setAvailableMotifs] = useState<PrintMotif[]>(feedbackMotifs);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const selectionRequest = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const printLock = useRef(false);
  const [error, setError] = useState('');
  const permitted = user === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.publish'));
  const pages = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.font = '16px Arial';
    return paginateFeedback(entries.map(entry => ({ ...entry, retroalimentacion: feedbackPrintText(entry.retroalimentacion) })), text => context.measureText(text).width, motif !== 'none');
  }, [entries, motif]);
  useEffect(() => {
    mounted.current = true;
    const done = () => { document.body.classList.remove('feedback-printing'); setPrinting(false); };
    window.addEventListener('afterprint', done);
    return () => { mounted.current = false; selectionRequest.current += 1; window.removeEventListener('afterprint', done); document.body.classList.remove('feedback-printing'); };
  }, []);
  useEffect(() => { if (!permitted) { document.body.classList.remove('feedback-printing'); setPrinting(false); } }, [permitted]);
  if (!permitted) return null;
  function selectMotif(item: Motif) {
    selectionRequest.current += 1;
    setAvailableMotifs([{ id: item.id, label: item.label, src: curatedAssetPath(item.thumbnail_url) }]);
    setMotif(item.id); setGallery(false); setError('');
  }
  async function mixCollection(collection: string) {
    const request = ++selectionRequest.current;
    setLoadingCollection(true); setError('');
    try {
      const items = await collectionMotifs(collection);
      if (!mounted.current || request !== selectionRequest.current || useAuth.getState().user !== owner) return;
      const motifs = items.map(item => ({ id: item.id, label: item.label, src: curatedAssetPath(item.thumbnail_url) }));
      setAvailableMotifs(motifs); setMotif('mixed'); setGallery(false);
    } catch {
      if (mounted.current && request === selectionRequest.current) setError('No pudimos preparar esta colección. La decoración anterior se conserva; puedes volver a intentarlo.');
    } finally { if (mounted.current && request === selectionRequest.current) setLoadingCollection(false); }
  }
  async function print() {
    if (!pages || printLock.current || loadingCollection || useAuth.getState().user !== owner) return;
    printLock.current = true; setPreparing(true); setError('');
    try {
      // Local decorative assets must never hold the text hostage. A missing
      // image is hidden; the full reserved text layout is still printable.
      await Promise.race([
        Promise.all(Array.from(previewRef.current?.querySelectorAll('img') ?? []).map(img => img.decode().catch(() => undefined))),
        new Promise(resolve => window.setTimeout(resolve, 4000)),
      ]);
      if (!mounted.current || useAuth.getState().user !== owner) return;
      flushSync(() => setPrinting(true));
      document.body.classList.add('feedback-printing');
      await Promise.race([
        Promise.all(Array.from(document.getElementById('feedback-private-print')?.querySelectorAll('img') ?? []).map(img => img.decode().catch(() => undefined))),
        new Promise(resolve => window.setTimeout(resolve, 4000)),
      ]);
      if (!mounted.current || useAuth.getState().user !== owner) return;
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      if (!mounted.current || useAuth.getState().user !== owner) return;
      flushSync(() => setPreparing(false));
      window.print();
    } catch { if (mounted.current) { document.body.classList.remove('feedback-printing'); setPrinting(false); setError('No se pudo abrir la impresión. Puedes volver a intentarlo.'); } }
    finally { printLock.current = false; if (mounted.current) setPreparing(false); }
  }
  const sheets = <>{pages?.map((page, index) => <section className="feedback-paper" key={index}>{page.map(fragment => <article className="feedback-slip" key={fragment.id + '-' + fragment.continuation}>
    <header className={'feedback-slip-header' + (motif !== 'none' ? ' feedback-slip-decorated' : '')}>
      <div><h2>{fragment.continuation > 1 ? 'Continuación de ' : ''}{fragment.estudiante}</h2>
      <p className="feedback-slip-context">{fragment.evaluacion} · {fragment.materia}</p>
      <p><strong>Nota: {fragment.nota} / {fragment.nota_maxima}</strong></p></div>
      {motifForStudent(motif, fragment.id, availableMotifs) && <img src={motifForStudent(motif, fragment.id, availableMotifs)!.src} alt="" aria-hidden="true" className="feedback-slip-motif" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />}
    </header>
    <p className="feedback-slip-text">{fragment.text}</p>
  </article>)}</section>)}</>;
  return <section className="space-y-4" aria-label="Vista previa de impresión">
    <h3 className="font-bold">{entries.length} fichas para entregar individualmente</h3>
    <p className="text-sm text-muted">Hoja privada del docente. Recorta y entrega cada ficha por separado. Papel A4 o Carta, escala 100 % y sin encabezados del navegador.</p>
    <label className="block text-sm font-semibold">Decoración de las fichas<select aria-label="Decoración de las fichas" className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-base" value={motif} disabled={preparing || loadingCollection} onChange={event => { const value = event.target.value; setMotif(value); if (value === 'mixed' || feedbackMotifs.some(item => item.id === value)) setAvailableMotifs(feedbackMotifs); }}><option value="none">Sin decoración · menos tinta</option><option value="mixed">Variar motivos entre estudiantes</option>{!['none', 'mixed'].includes(motif) && !feedbackMotifs.some(item => item.id === motif) && <option value={motif}>{availableMotifs.find(item => item.id === motif)?.label}</option>}{feedbackMotifs.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <details open={gallery} onToggle={event => setGallery(event.currentTarget.open)}><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ver motivos por área</summary>{gallery && <MotifPicker suggestedArea={suggestedArea} disabled={preparing || loadingCollection} onSelect={selectMotif} onMix={collection => { void mixCollection(collection); }} onCancel={() => { selectionRequest.current += 1; setLoadingCollection(false); setGallery(false); }} />}</details>
    {loadingCollection && <p role="status" className="text-sm text-muted">Preparando la colección…</p>}
    <p className="text-xs text-muted">Los motivos son decorativos: no representan el desempeño ni cambian las notas. No se imprimen fondos de color.</p>
    <div className="grid gap-2 sm:flex sm:flex-wrap"><Button variant="outline" disabled={preparing} onClick={onClose}>Volver a la lista</Button><Button disabled={!pages?.length || preparing || loadingCollection} onClick={() => void print()}>{preparing ? 'Preparando impresión…' : 'Imprimir fichas'}</Button></div>
    {(!pages || error) && <p role="alert">{error || 'No pudimos preparar las páginas para imprimir. Vuelve a intentarlo.'}</p>}
    <div className="feedback-preview" ref={previewRef}>{sheets}</div>
    {printing && createPortal(<div id="feedback-private-print" data-ready={!preparing} aria-hidden="true">{sheets}</div>, document.body)}
  </section>;
}
