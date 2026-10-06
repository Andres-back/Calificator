import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&url';
import { Button } from '@/components/ui';

GlobalWorkerOptions.workerSrc = workerUrl;
const MAX_PIXELS = 4_000_000;

export default function EvaluationPdfViewer({ blob }: { blob: Blob }) {
  const container = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<{ source: Blob; pdf: PDFDocumentProxy } | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(300);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [pageText, setPageText] = useState('');
  const [textOpen, setTextOpen] = useState(false);
  const pdf = document?.source === blob ? document.pdf : null;

  useEffect(() => {
    // clientWidth cambia al aparecer la scrollbar en Safari y provoca un bucle
    // ocultar canvas → desaparecer scrollbar → redibujar. Medir el borde externo.
    const measure = () => setWidth(Math.max(1, Math.floor((container.current?.getBoundingClientRect().width || 324) - 48)));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (container.current) observer?.observe(container.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loading: PDFDocumentLoadingTask | undefined;
    setDocument(null);
    setPageNumber(1);
    setZoom(1);
    setPageText('');
    setTextOpen(false);
    setError(false);
    setBusy(true);
    // Leer los bytes ya autorizados: no fetch(blob:) que connect-src puede bloquear.
    void blob.arrayBuffer().then((buffer) => {
      if (cancelled) return;
      loading = getDocument({
        data: new Uint8Array(buffer), useSystemFonts: true, useWasm: false,
        cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
        wasmUrl: `${import.meta.env.BASE_URL}pdfjs/wasm/`,
      });
      return loading.promise;
    }).then((loaded) => {
      if (!cancelled && loaded) setDocument({ source: blob, pdf: loaded });
    }).catch(() => { if (!cancelled) { setError(true); setBusy(false); } });
    return () => { cancelled = true; void Promise.resolve(loading?.destroy()).catch(() => {}); };
  }, [blob, retry]);

  useEffect(() => {
    if (!pdf) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let renderTask: RenderTask | undefined;
    let releasePage: (() => void) | undefined;
    setBusy(true);
    setError(false);
    setPageText('');
    canvas.dataset.rendered = 'false';
    canvas.width = 0;
    canvas.height = 0;
    if (container.current) { container.current.scrollTop = 0; container.current.scrollLeft = 0; }
    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        releasePage = () => page.cleanup();
        const original = page.getViewport({ scale: 1 });
        const cssScale = width * zoom / original.width;
        const cssViewport = page.getViewport({ scale: cssScale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2,
          Math.sqrt(MAX_PIXELS / (cssViewport.width * cssViewport.height)));
        const viewport = page.getViewport({ scale: cssScale * pixelRatio });
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas unavailable');
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
        if (cancelled) return;
        canvas.dataset.rendered = 'true';
        setBusy(false);
        // Un fallo en la capa textual no debe ocultar una página ya dibujada.
        try {
          const text = await page.getTextContent();
          if (!cancelled) setPageText(text.items.map((item) => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('').trim());
        } catch { /* La imagen y las descargas siguen disponibles. */ }
      } catch {
        if (!cancelled) { setError(true); setBusy(false); }
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
      // Esperar a la cancelación antes de limpiar objetos usados por el renderer.
      void Promise.resolve(renderTask?.promise).catch(() => {}).then(() => releasePage?.());
      canvas.width = 0;
      canvas.height = 0;
      canvas.dataset.rendered = 'false';
    };
  }, [pdf, pageNumber, width, zoom]);

  return (
    <section role="region" aria-label="Formato final de la evaluación" className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="shrink-0 border-b border-border bg-surface p-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" className="min-h-11 min-w-11 px-3" aria-label="Página anterior"
            disabled={!pdf || busy || pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)}>←</Button>
          <span aria-live="polite" className="text-center text-sm font-semibold">{pdf ? `Página ${pageNumber} de ${pdf.numPages}` : 'Preparando páginas…'}</span>
          <Button variant="outline" className="min-h-11 min-w-11 px-3" aria-label="Página siguiente"
            disabled={!pdf || busy || pageNumber >= pdf.numPages} onClick={() => setPageNumber((value) => value + 1)}>→</Button>
        </div>
        <div className="mt-1 flex justify-center gap-2">
          <Button variant="ghost" className="min-h-11 px-2" disabled={!pdf || busy} onClick={() => setZoom(1)}>Ajustar al ancho</Button>
          <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Reducir página" disabled={!pdf || busy || zoom <= 1}
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}>−</Button>
          <Button variant="ghost" className="min-h-11 min-w-11 px-2" aria-label="Ampliar página" disabled={!pdf || busy || zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>+</Button>
        </div>
      </div>
      <div ref={container} className="min-h-0 min-w-0 flex-1 overflow-auto p-3" aria-busy={busy}>
        {busy && <p role="status" className="py-2 text-sm text-muted">Dibujando página…</p>}
        {error && <div role="alert" className="space-y-2 py-3 text-sm">
          <p>No pudimos mostrar este documento. Puedes reintentar o usar «Abrir PDF».</p>
          <Button variant="outline" className="min-h-11" onClick={() => setRetry((value) => value + 1)}>Reintentar vista</Button>
        </div>}
        <canvas ref={canvasRef} role="img" aria-label={pdf ? `Página ${pageNumber} de ${pdf.numPages}` : 'Página de la evaluación'}
          className={`block rounded bg-white shadow-sm ${busy || error ? 'hidden' : ''}`} />
        {!busy && !error && <details open={textOpen} onToggle={(event) => setTextOpen(event.currentTarget.open)} className="mt-3 rounded border border-border bg-surface p-3 text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Leer texto de esta página</summary>
          <p className="mt-2 whitespace-pre-wrap break-words leading-6">{pageText || 'Esta página contiene elementos visuales. Consulta la imagen o el documento descargable.'}</p>
        </details>}
      </div>
    </section>
  );
}
