import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Expand, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from '@/components/ui';
import {
  clampEvidenceViewport, evidenceImageLayout, focusEvidenceRegion, panEvidenceViewport, validEvidenceBox, zoomEvidenceViewport,
  type EvidenceBox, type EvidenceDimensions, type EvidenceViewport,
} from './evidenceViewport';

type Point = { x: number; y: number };
type Props = { src: string; label: string; region?: EvidenceBox };
const initial: EvidenceViewport = { zoom: 1, centerX: 0.5, centerY: 0.5 };
const controlClass = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg disabled:opacity-50';

function EvidenceCanvas({ src, label, region, expanded = false }: Props & { expanded?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const instructionId = useId();
  const [size, setSize] = useState<EvidenceDimensions>({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 });
  const [viewport, setViewport] = useState(initial);
  const currentViewport = useRef(viewport);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const focused = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ viewport: EvidenceViewport; origin: Point; distance?: number } | null>(null);
  const ready = loaded && size.width > 0 && size.height > 0;
  const layout = ready ? evidenceImageLayout(size, viewport) : null;

  function updateViewport(next: EvidenceViewport) {
    currentViewport.current = next;
    setViewport(next);
  }

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      setSize((previous) => ({ ...previous, width: rect.width, height: rect.height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  useEffect(() => {
    if (!loaded || size.width <= 0 || size.height <= 0) return;
    const next = focused.current ? clampEvidenceViewport(size, currentViewport.current) : focusEvidenceRegion(size, region);
    focused.current = true;
    currentViewport.current = next;
    setViewport(next);
  }, [loaded, size, region]);

  const point = (event: PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startGesture = () => {
    const values = [...pointers.current.values()];
    gesture.current = values.length >= 2 ? {
      viewport: currentViewport.current,
      origin: { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 },
      distance: Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y),
    } : values.length === 1 ? { viewport: currentViewport.current, origin: values[0] } : null;
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0) || pointers.current.size >= 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, point(event));
    startGesture();
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!ready || !pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, point(event));
    const values = [...pointers.current.values()];
    const start = gesture.current;
    if (values.length === 2 && start.distance && start.distance > 0) {
      const midpoint = { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 };
      const ratio = Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y) / start.distance;
      const zoomed = zoomEvidenceViewport(size, start.viewport, ratio, start.origin);
      updateViewport(panEvidenceViewport(size, zoomed, midpoint.x - start.origin.x, midpoint.y - start.origin.y));
    } else if (values.length === 1) {
      updateViewport(panEvidenceViewport(size, start.viewport, values[0].x - start.origin.x, values[0].y - start.origin.y));
    }
  };
  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    startGesture();
  };
  const zoom = (factor: number) => updateViewport(zoomEvidenceViewport(size, currentViewport.current, factor));
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!ready) return;
    const movement: Record<string, [number, number]> = { ArrowLeft: [48, 0], ArrowRight: [-48, 0], ArrowUp: [0, 48], ArrowDown: [0, -48] };
    if (movement[event.key]) {
      event.preventDefault();
      updateViewport(panEvidenceViewport(size, currentViewport.current, ...movement[event.key]));
    } else if (['+', '=', '-', '0', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === '0' || event.key === 'Home') updateViewport(initial);
      else zoom(event.key === '-' ? 0.8 : 1.25);
    }
  };

  return <div className={expanded ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-3'}>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={controlClass} aria-label="Alejar imagen" disabled={!ready || viewport.zoom <= 1} onClick={() => zoom(0.8)}><ZoomOut aria-hidden="true" className="h-4 w-4" /></button>
      <output className="min-w-16 text-center text-sm font-semibold tabular-nums" aria-label="Nivel de ampliación">{Math.round(viewport.zoom * 100)} %</output>
      <button type="button" className={controlClass} aria-label="Acercar imagen" disabled={!ready || viewport.zoom >= 8} onClick={() => zoom(1.25)}><ZoomIn aria-hidden="true" className="h-4 w-4" /></button>
      <button type="button" className={controlClass} disabled={!ready} onClick={() => updateViewport(initial)}><RotateCcw aria-hidden="true" className="h-4 w-4" />Ver hoja completa</button>
      {validEvidenceBox(region) && <button type="button" className={controlClass} disabled={!ready} onClick={() => updateViewport(focusEvidenceRegion(size, region))}>Ver zona sugerida</button>}
    </div>
    <p id={instructionId} className="flex items-start gap-2 text-xs leading-5 text-muted"><Move aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Amplía con dos dedos o los botones. Arrastra la imagen ampliada para ver más.<span className="hidden sm:inline"> Con teclado: +, − y flechas; 0 muestra toda la hoja.</span></span></p>
    <div ref={frame} role="group" aria-label="Imagen ampliable de la evidencia" aria-describedby={instructionId} tabIndex={0}
      className={`focus-ring relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-slate-100 text-slate-950 ${expanded || viewport.zoom > 1 ? 'touch-none' : 'touch-pan-y'} ${expanded ? 'min-h-32 flex-1' : 'h-64 sm:h-80'} ${ready ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onKeyDown={keyboard} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd} onLostPointerCapture={pointerEnd}>
      {!loaded && !failed && <p role="status" aria-label="Estado de la imagen" className="absolute inset-0 flex items-center justify-center p-4 text-sm">Cargando evidencia…</p>}
      {failed ? <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center text-sm"><p>No pudimos abrir esta hoja. Puedes intentarlo de nuevo.</p><button type="button" className={controlClass} onClick={() => { focused.current = false; setFailed(false); setLoaded(false); setAttempt((value) => value + 1); }}>Reintentar imagen</button></div> : <img key={attempt} src={src} alt={label} draggable={false} decoding="async" referrerPolicy="no-referrer"
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth <= 0 || image.naturalHeight <= 0) { setFailed(true); return; }
          setSize((previous) => ({ ...previous, imageWidth: image.naturalWidth, imageHeight: image.naturalHeight }));
          setLoaded(true);
        }} onError={() => { setLoaded(false); setFailed(true); }}
        className="absolute max-w-none select-none"
        style={{ opacity: ready ? 1 : 0, width: layout?.width ?? '100%', height: layout?.height ?? 'auto', left: layout?.left ?? 0, top: layout?.top ?? 0 }} />}
    </div>
    {validEvidenceBox(region) && <p className="text-xs leading-5 text-muted">Ubicación sugerida. Consulta la hoja completa para comprobar el contexto.</p>}
  </div>;
}

/** Read-only photo inspection. The caller only supplies evidence it may already read. */
export function GradeEvidenceViewer({ src, label, region }: Props) {
  const [expanded, setExpanded] = useState(false);
  const contentKey = `${src}:${region?.join(',') ?? 'hoja'}`;
  return <div className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-2 p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm font-bold text-fg">{label}</p>
      <button type="button" className={controlClass} onClick={() => setExpanded(true)}><Expand aria-hidden="true" className="h-4 w-4" />Ampliar evidencia</button>
    </div>
    {!expanded && <EvidenceCanvas key={contentKey} src={src} label={label} region={region} />}
    <Modal open={expanded} onClose={() => setExpanded(false)} title={label} className="flex h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-y-auto p-3 sm:p-4">
      <EvidenceCanvas key={`amplia:${contentKey}`} src={src} label={label} region={region} expanded />
      <button type="button" className={`${controlClass} mt-3 shrink-0`} onClick={() => setExpanded(false)}>Volver a la respuesta</button>
    </Modal>
  </div>;
}
