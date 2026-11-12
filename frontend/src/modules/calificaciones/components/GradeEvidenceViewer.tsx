import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Expand, Minimize2, Move, RotateCcw, RotateCw, ScanSearch, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from '@/components/ui';
import {
  clampEvidenceViewport, evidenceImageLayout, evidenceRegionRect, fitEvidenceWidth, focusEvidenceRegion, panEvidenceViewport, rotateEvidenceBox, validEvidenceBox, zoomEvidenceViewport,
  type EvidenceBox, type EvidenceDimensions, type EvidenceRotation, type EvidenceViewport,
} from './evidenceViewport';

type Point = { x: number; y: number };
/** `focusSignal` cambia cada vez que el docente pide volver a la zona de la respuesta. */
type Props = { src: string; label: string; region?: EvidenceBox; sheetView?: boolean; focusSignal?: number };
const initial: EvidenceViewport = { zoom: 1, centerX: 0.5, centerY: 0.5 };
const controlClass = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-fg disabled:opacity-50';

function EvidenceCanvas({ src, label, region, rotation, onRotate, expanded = false, sheetView = false, focusSignal = 0, extraControl }: Props & { rotation: EvidenceRotation; onRotate: (direction: -1 | 1) => void; expanded?: boolean; extraControl?: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const instructionId = useId();
  const [naturalSize, setSize] = useState<EvidenceDimensions>({ width: 0, height: 0, imageWidth: 0, imageHeight: 0 });
  const swapped = rotation % 180 !== 0;
  const size = useMemo(() => swapped ? { ...naturalSize, imageWidth: naturalSize.imageHeight, imageHeight: naturalSize.imageWidth } : naturalSize, [naturalSize, swapped]);
  const orientedRegion = useMemo(() => validEvidenceBox(region) ? rotateEvidenceBox(region, rotation) : undefined, [region, rotation]);
  const [viewport, setViewport] = useState(initial);
  const currentViewport = useRef(viewport);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const focused = useRef(false);
  const lastRotation = useRef(rotation);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ viewport: EvidenceViewport; origin: Point; distance?: number } | null>(null);
  const ready = loaded && size.width > 0 && size.height > 0;
  const layout = ready ? evidenceImageLayout(size, viewport) : null;
  const regionRect = ready && orientedRegion ? evidenceRegionRect(size, viewport, orientedRegion) : null;
  const lastFocusSignal = useRef(focusSignal);

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
    const rotated = lastRotation.current !== rotation;
    // Spec 176: sin zona, el visor de una respuesta abre la hoja al ancho del marco para leerla sin ampliar.
    const opening = orientedRegion || expanded || sheetView ? focusEvidenceRegion(size, orientedRegion) : fitEvidenceWidth(size);
    const next = focused.current && !rotated ? clampEvidenceViewport(size, currentViewport.current) : opening;
    if (rotated) {
      pointers.current.clear();
      gesture.current = null;
    }
    lastRotation.current = rotation;
    focused.current = true;
    currentViewport.current = next;
    setViewport(next);
  }, [loaded, size, orientedRegion, rotation, expanded, sheetView]);

  useEffect(() => {
    if (lastFocusSignal.current === focusSignal) return;
    lastFocusSignal.current = focusSignal;
    if (!loaded || size.width <= 0 || size.height <= 0 || !orientedRegion) return;
    const next = focusEvidenceRegion(size, orientedRegion);
    currentViewport.current = next;
    setViewport(next);
  }, [focusSignal, loaded, size, orientedRegion]);

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

  const tools = <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Controles de la imagen">
      <button type="button" className={controlClass} aria-label="Alejar imagen" disabled={!ready || viewport.zoom <= 1} onClick={() => zoom(0.8)}><ZoomOut aria-hidden="true" className="h-4 w-4" /></button>
      <output className="min-w-12 text-center text-sm font-semibold tabular-nums" aria-label="Nivel de ampliación">{Math.round(viewport.zoom * 100)} %</output>
      <button type="button" className={controlClass} aria-label="Acercar imagen" disabled={!ready || viewport.zoom >= 8} onClick={() => zoom(1.25)}><ZoomIn aria-hidden="true" className="h-4 w-4" /></button>
      {sheetView && <button type="button" className={controlClass} aria-label="Girar a la izquierda" title="Girar a la izquierda" disabled={!ready} onClick={() => onRotate(-1)}><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>}
      <button type="button" className={controlClass} aria-label={sheetView ? 'Girar a la derecha' : 'Girar vista 90 grados'} title="Girar a la derecha" disabled={!ready} onClick={() => onRotate(1)}><RotateCw aria-hidden="true" className="h-4 w-4" /></button>
      {!sheetView && <button type="button" className={controlClass} aria-label="Ver hoja completa" title="Ver hoja completa" disabled={!ready} onClick={() => updateViewport(initial)}><Minimize2 aria-hidden="true" className="h-4 w-4" /></button>}
      {orientedRegion && <button type="button" className={controlClass} disabled={!ready} onClick={() => updateViewport(focusEvidenceRegion(size, orientedRegion))}><ScanSearch aria-hidden="true" className="h-4 w-4" />Ver zona sugerida</button>}
      {extraControl}
    </div>;
  const instructions = <p id={instructionId} className={sheetView ? 'sr-only' : 'flex items-start gap-2 text-xs leading-5 text-muted lg:sr-only'}><Move aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Amplía con dos dedos o los botones. Arrastra la imagen ampliada para ver más.<span className="hidden sm:inline"> Con teclado: +, − y flechas; 0 muestra toda la hoja.</span></span></p>;
  return <div className={expanded ? 'flex min-h-0 flex-1 flex-col gap-3' : 'space-y-2'}>
    {!sheetView && (expanded ? tools : <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <p className="min-w-0 text-sm font-bold text-fg">{label}</p>
      {tools}
    </div>)}
    {instructions}
    <div ref={frame} role="group" aria-label="Imagen ampliable de la evidencia" aria-describedby={instructionId} tabIndex={0}
      className={`focus-ring relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-slate-100 text-slate-950 ${expanded || viewport.zoom > 1 ? 'touch-none' : 'touch-pan-y'} ${expanded ? 'min-h-32 flex-1' : sheetView ? 'h-[clamp(16rem,45dvh,34rem)] lg:h-[clamp(30rem,calc(100dvh-13rem),72rem)]' : 'h-64 sm:h-80 lg:h-[clamp(20rem,calc(100dvh-27rem),44rem)]'} ${ready ? 'cursor-grab active:cursor-grabbing' : ''}`}
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
        style={{
          opacity: ready ? 1 : 0,
          width: layout ? (swapped ? layout.height : layout.width) : '100%',
          height: layout ? (swapped ? layout.width : layout.height) : 'auto',
          left: layout ? layout.left + (swapped ? (layout.width - layout.height) / 2 : 0) : 0,
          top: layout ? layout.top + (swapped ? (layout.height - layout.width) / 2 : 0) : 0,
          transform: `rotate(${rotation}deg)`,
        }} />}
      {regionRect && !failed && <div aria-hidden="true" data-testid="evidence-region-outline"
        className="pointer-events-none absolute rounded-md border-[3px] border-brand-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95),0_0_0_9999px_rgba(15,23,42,0.18)]"
        style={regionRect} />}
    </div>
    {sheetView && tools}
    {validEvidenceBox(region) && <p className="text-xs leading-5 text-muted">Ubicación sugerida: el recuadro marca dónde está la respuesta. Consulta la hoja completa para comprobar el contexto.</p>}
  </div>;
}

/** Read-only photo inspection. The caller only supplies evidence it may already read. */
export function GradeEvidenceViewer(props: Props) {
  return <EvidenceViewerSession key={`${props.src}:${props.region?.join(',') ?? 'hoja'}`} {...props} />;
}

function EvidenceViewerSession({ src, label, region, sheetView = false, focusSignal }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rotation, setRotation] = useState<EvidenceRotation>(0);
  const rotate = (direction: -1 | 1) => setRotation(value => ((value + 360 + direction * 90) % 360) as EvidenceRotation);
  const canvasProps = { src, label, region, rotation, onRotate: rotate, focusSignal };
  return <div className={sheetView ? 'min-w-0 space-y-2' : 'min-w-0 space-y-2 rounded-xl border border-border bg-surface-2 p-2 sm:p-3'}>
    {sheetView && !expanded && <EvidenceCanvas {...canvasProps} sheetView extraControl={<button type="button" className={controlClass} aria-label="Ampliar evidencia" title="Ampliar evidencia" onClick={() => setExpanded(true)}><Expand aria-hidden="true" className="h-4 w-4" /></button>} />}
    {!sheetView && !expanded && <EvidenceCanvas {...canvasProps} extraControl={<button type="button" className={controlClass} aria-label="Ampliar evidencia" title="Ampliar evidencia" onClick={() => setExpanded(true)}><Expand aria-hidden="true" className="h-4 w-4" /></button>} />}
    <Modal open={expanded} onClose={() => setExpanded(false)} title={label} className="flex h-[calc(100dvh-2rem)] max-w-6xl flex-col overflow-y-auto p-3 sm:p-4">
      <EvidenceCanvas {...canvasProps} expanded sheetView={sheetView} />
      <button type="button" className={`${controlClass} mt-3 shrink-0`} onClick={() => setExpanded(false)}>{sheetView ? 'Volver a la evidencia' : 'Volver a la respuesta'}</button>
    </Modal>
  </div>;
}
