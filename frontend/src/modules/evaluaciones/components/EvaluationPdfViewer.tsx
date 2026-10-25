import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&url';
import { Button } from '@/components/ui';
import { EvaluationPdfPage } from './EvaluationPdfPage';
import { createRenderQueue } from './pdfRenderQueue';
import { anchoredScrollTop, defaultPdfFit, type PdfFit } from './pdfViewport';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function EvaluationPdfViewer({ blob }: { blob: Blob }) {
  const container = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<{ source: Blob; pdf: PDFDocumentProxy } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const visiblePage = useRef(pageNumber);
  visiblePage.current = pageNumber;
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(500);
  const [fit, setFit] = useState<PdfFit | null>(null);
  const mode = fit ?? defaultPdfFit(width + 32);
  const readingPoint = useRef({ number: 1, fraction: 0 });
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState(false);
  const pdf = document?.source === blob ? document.pdf : null;
  const [enqueue] = useState(createRenderQueue);

  useLayoutEffect(() => {
    // Keep the current sheet, not a stale pixel offset, when zooming/rotating.
    const root = container.current;
    const target = root?.querySelector<HTMLElement>(`[data-pdf-page="${visiblePage.current}"]`);
    if (root && target) {
      const offsetTop = root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top - 12;
      root.scrollTop = anchoredScrollTop({ offsetTop, pageHeight: target.getBoundingClientRect().height, fraction: readingPoint.current.fraction });
    }
  }, [width, height, zoom, mode]);

  useEffect(() => {
    // Border width is stable when Safari toggles a scrollbar; clientWidth is not.
    const measure = () => {
      const bounds = container.current?.getBoundingClientRect();
      setWidth(Math.max(1, Math.floor((bounds?.width || 324) - 32)));
      // Page title + accessible text control + padding are outside the paper.
      setHeight(Math.max(120, Math.floor((bounds?.height || 620) - 120)));
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (container.current) observer?.observe(container.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | undefined;
    setDocument(null); setPageNumber(1); setZoom(1); setFit(null); setError(false);
    visiblePage.current = 1; readingPoint.current = { number: 1, fraction: 0 };
    void blob.arrayBuffer().then((buffer) => {
      if (cancelled) return;
      loading = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, useWasm: false,
        cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`, wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/` });
      return loading.promise;
    }).then((loaded) => { if (!cancelled && loaded) setDocument({ source: blob, pdf: loaded }); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; void Promise.resolve(loading?.destroy()).catch(() => {}); };
  }, [blob, retry]);

  useEffect(() => {
    if (!pdf) return;
    const root = container.current;
    if (!root) return;
    const measureVisible = () => {
      const bounds = root.getBoundingClientRect();
      if (bounds.height <= 0) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-page]'));
      // A small trailing fragment of the previous sheet is not the page being
      // read. Use the largest visible portion, including short last pages.
      let selected: HTMLElement | undefined;
      let largest = 0;
      for (const node of nodes) {
        const page = node.getBoundingClientRect();
        const visible = Math.max(0, Math.min(page.bottom, bounds.bottom) - Math.max(page.top, bounds.top));
        if (visible > largest) { largest = visible; selected = node; }
      }
      if (selected) {
        visiblePage.current = Number(selected.dataset.pdfPage); setPageNumber(visiblePage.current);
        const page = selected.getBoundingClientRect();
        readingPoint.current = { number: visiblePage.current, fraction: Math.max(0, (bounds.top - page.top) / page.height) };
      }
    };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(measureVisible, { root, threshold: [0, 0.1, 0.5, 1] });
    root.querySelectorAll('[data-pdf-page]').forEach((node) => observer?.observe(node));
    root.addEventListener('scroll', measureVisible, { passive: true });
    return () => { observer?.disconnect(); root.removeEventListener('scroll', measureVisible); };
  }, [pdf]);

  function goTo(number: number) {
    setPageNumber(number);
    visiblePage.current = number; readingPoint.current = { number, fraction: 0 };
    const root = container.current;
    const target = root?.querySelector<HTMLElement>(`[data-pdf-page="${number}"]`);
    if (root && target) root.scrollTop += target.getBoundingClientRect().top - root.getBoundingClientRect().top - 12;
  }

  return <section role="region" aria-label="Formato final de la evaluación" className="flex h-full min-h-0 min-w-0 flex-col">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-border bg-surface p-1 text-sm">
      <div className="flex items-center gap-1">
        <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Página anterior" disabled={!pdf || pageNumber <= 1} onClick={() => goTo(pageNumber - 1)}>←</Button>
        <span aria-live="polite" className="text-center text-xs font-semibold">{pdf ? `Página ${pageNumber} de ${pdf.numPages}` : 'Preparando páginas…'}</span>
        <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Página siguiente" disabled={!pdf || pageNumber >= pdf.numPages} onClick={() => goTo(pageNumber + 1)}>→</Button>
      </div>
      <div className="flex max-w-full flex-wrap items-center">
        <Button variant="ghost" className="min-h-11 px-2" aria-pressed={mode === 'page' && zoom === 1} aria-label="Ajustar a página completa" disabled={!pdf} onClick={() => { setFit('page'); setZoom(1); }}>Página</Button>
        <Button variant="ghost" className="min-h-11 px-2" aria-pressed={mode === 'width' && zoom === 1} aria-label="Ajustar al ancho" disabled={!pdf} onClick={() => { setFit('width'); setZoom(1); }}>Ancho</Button>
        <Button variant="ghost" className="min-h-11 px-2" aria-pressed={mode === 'actual' && zoom === 1} aria-label="Tamaño real 100 %" disabled={!pdf} onClick={() => { setFit('actual'); setZoom(1); }}>100 %</Button>
        <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Reducir página" disabled={!pdf || zoom <= 0.5} onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>−</Button>
        <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Ampliar página" disabled={!pdf || zoom >= 3} onClick={() => setZoom((value) => Math.min(3, value + 0.25))}>+</Button>
      </div>
    </div>
    <div ref={container} data-document-scroll className="min-h-0 min-w-0 flex-1 overflow-auto p-3" style={{ scrollbarGutter: 'stable' }}>
      {error ? <div role="alert" className="space-y-3 text-sm">
        <p>No pudimos mostrar este documento. Puedes reintentar o usar «Ver evaluación completa».</p>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Reintentar vista</Button>
      </div> : pdf ? Array.from({ length: pdf.numPages }, (_, index) => <EvaluationPdfPage key={index + 1} pdf={pdf}
        number={index + 1} width={width} height={height} mode={mode} zoom={zoom} active={Math.abs(index + 1 - pageNumber) <= 1} enqueue={enqueue} />)
        : <p role="status" className="py-3 text-sm text-muted">Preparando páginas…</p>}
    </div>
  </section>;
}
