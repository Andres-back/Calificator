import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { Button } from '@/components/ui';
import type { EnqueueRender } from './pdfRenderQueue';

export function EvaluationPdfPage({ pdf, number, width, zoom, active, enqueue }: {
  pdf: PDFDocumentProxy; number: number; width: number; zoom: number; active: boolean; enqueue: EnqueueRender;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(595 / 842);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [text, setText] = useState('');
  const [textOpen, setTextOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let render: RenderTask | undefined;
    let page: PDFPageProxy | undefined;
    setBusy(true); setError(false); setText('');
    canvas.dataset.rendered = 'false';
    const cancelQueued = enqueue(async () => {
      try {
        page = await pdf.getPage(number);
        if (cancelled) { page.cleanup(); return; }
        const original = page.getViewport({ scale: 1 });
        setRatio(original.width / original.height);
        const scale = width * zoom / original.width;
        const css = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / (css.width * css.height)));
        const viewport = page.getViewport({ scale: scale * pixelRatio });
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        render = page.render({ canvas, canvasContext: context, viewport });
        await render.promise;
        if (cancelled) return;
        canvas.dataset.rendered = 'true'; setBusy(false);
        try {
          const content = await page.getTextContent();
          if (!cancelled) setText(content.items.map((item) => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('').trim());
        } catch { /* Text extraction must not hide a rendered image. */ }
      } catch { if (!cancelled) { setError(true); setBusy(false); } }
    });
    return () => {
      cancelled = true; cancelQueued(); render?.cancel();
      void Promise.resolve(render?.promise).catch(() => {}).then(() => page?.cleanup()).catch(() => {});
      canvas.width = 0; canvas.height = 0; canvas.dataset.rendered = 'false';
    };
  }, [active, enqueue, number, pdf, retry, width, zoom]);

  return <article data-pdf-page={number} className="mx-auto mb-4" style={{ width: width * zoom }}>
    <h3 className="flex min-h-11 items-center text-sm font-semibold text-secondary">Página {number} de {pdf.numPages}</h3>
    <div className="relative rounded bg-white shadow-sm" style={{ aspectRatio: ratio }} aria-busy={active && busy}>
      {active ? <>
        {busy && <p role="status" className="absolute inset-x-3 top-3 text-sm text-slate-600">Dibujando página {number}…</p>}
        {error && <div role="alert" className="absolute inset-x-3 top-3 space-y-2 text-sm text-slate-800">
          <p>No pudimos mostrar esta página. Puedes reintentar o usar «Ver evaluación completa».</p>
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Reintentar página {number}</Button>
        </div>}
        <canvas ref={canvasRef} role="img" aria-label={`Página ${number} de ${pdf.numPages}`} className={`h-full w-full rounded ${busy || error ? 'invisible' : ''}`} />
      </> : <p className="p-3 text-sm text-slate-500">Desliza hasta esta página para leerla.</p>}
    </div>
    {active && !busy && !error && <div className="mt-2 rounded border border-border bg-surface p-2 text-sm">
      <button type="button" className="focus-ring flex min-h-11 w-full items-center rounded text-left font-semibold" aria-expanded={textOpen} onClick={() => setTextOpen(!textOpen)}>Leer texto de la página {number}</button>
      {textOpen && <p className="mt-2 whitespace-pre-wrap break-words leading-6">{text || 'Esta página tiene elementos visuales. Consulta su imagen o descarga el documento.'}</p>}
    </div>}
  </article>;
}
