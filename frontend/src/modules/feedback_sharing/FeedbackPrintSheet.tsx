import { useEffect, useMemo, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/stores/auth';
import { paginateFeedback, type FeedbackPrintEntry } from './printPagination';
import './feedback-print.css';
import { feedbackPrintText } from './feedbackSections';

export function FeedbackPrintSheet({ entries, onClose }: { entries: FeedbackPrintEntry[]; onClose: () => void }) {
  const user = useAuth(state => state.user);
  const [owner] = useState(user);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const permitted = user === owner && ['profesor', 'admin'].includes(user?.rol ?? '') && Boolean(user?.permissions?.includes('grading.publish'));
  const pages = useMemo(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.font = '16px Arial';
    return paginateFeedback(entries.map(entry => ({ ...entry, retroalimentacion: feedbackPrintText(entry.retroalimentacion) })), text => context.measureText(text).width);
  }, [entries]);
  useEffect(() => {
    const done = () => { document.body.classList.remove('feedback-printing'); setPrinting(false); };
    window.addEventListener('afterprint', done);
    return () => { window.removeEventListener('afterprint', done); document.body.classList.remove('feedback-printing'); };
  }, []);
  useEffect(() => { if (!permitted) { document.body.classList.remove('feedback-printing'); setPrinting(false); } }, [permitted]);
  if (!permitted) return null;
  function print() {
    if (!pages || useAuth.getState().user !== owner) return;
    setError('');
    flushSync(() => setPrinting(true));
    document.body.classList.add('feedback-printing');
    try { window.print(); } catch { document.body.classList.remove('feedback-printing'); setPrinting(false); setError('No se pudo abrir la impresión. Puedes volver a intentarlo.'); }
  }
  const sheets = <>{pages?.map((page, index) => <section className="feedback-paper" key={index}>{page.map(fragment => <article className="feedback-slip" key={fragment.id + '-' + fragment.continuation}>
    <h2>{fragment.continuation > 1 ? 'Continuación de ' : ''}{fragment.estudiante}</h2>
    <p className="feedback-slip-context">{fragment.evaluacion} · {fragment.materia}</p>
    <p><strong>Nota: {fragment.nota} / {fragment.nota_maxima}</strong></p>
    <p className="feedback-slip-text">{fragment.text}</p>
  </article>)}</section>)}</>;
  return <section className="space-y-4" aria-label="Vista previa de impresión">
    <h3 className="font-bold">{entries.length} fichas para entregar individualmente</h3>
    <p className="text-sm text-muted">Hoja privada del docente. Recorta y entrega cada ficha por separado. Papel A4 o Carta, escala 100 % y sin encabezados del navegador.</p>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onClose}>Volver a la lista</Button><Button disabled={!pages?.length} onClick={print}>Imprimir fichas</Button></div>
    {(!pages || error) && <p role="alert">{error || 'No pudimos preparar las páginas para imprimir. Vuelve a intentarlo.'}</p>}
    <div className="feedback-preview">{sheets}</div>
    {printing && createPortal(<div id="feedback-private-print" aria-hidden="true">{sheets}</div>, document.body)}
  </section>;
}
