import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCw, ScanLine, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import { EvidenceScanner } from './evidenceScan';
import { conservativeScanSuggestion, rotateScanPoint, validScanQuad, type ScanPoint, type ScanQuad, type ScanRotation } from './scanGeometry';
import type { EvidenceScanRecipe, EvidenceScanSelection } from './scanTypes';
import type { ImageQualityResult } from './imageQuality';
import type { CornerAssistant } from './cornerAssistance';
import { fitScanViewport } from './scanViewport';

const FULL: ScanQuad = [[0, 0], [1, 0], [1, 1], [0, 1]];
const CORNERS = ['superior izquierda', 'superior derecha', 'inferior derecha', 'inferior izquierda'];
const control = 'focus-ring inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40';

function useBlobUrl(blob: Blob | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!blob) { setUrl(''); return; }
    const next = URL.createObjectURL(blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

interface Props {
  suggestCorners?: CornerAssistant;
  file: File;
  pageNumber: number;
  rotation: ScanRotation;
  previous?: EvidenceScanSelection;
  onAccept: (selection: EvidenceScanSelection, quality?: ImageQualityResult) => void;
  onClose: () => void;
}

export function EvidenceScanEditor({ file, pageNumber, rotation: initialRotation, previous, onAccept, onClose, suggestCorners }: Props) {
  const scanner = useRef<EvidenceScanner | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState<ScanQuad>(FULL);
  const [rotation, setRotation] = useState(initialRotation);
  const [profile, setProfile] = useState<EvidenceScanRecipe['profile']>('natural');
  const [source, setSource] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; key: string } | null>(null);
  const [quality, setQuality] = useState<ImageQualityResult>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [assisting, setAssisting] = useState(false);
  const assistant = useRef(suggestCorners);
  const assistanceRequest = useRef<AbortController | null>(null);
  const assistanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editEpoch = useRef(0);
  const cancelAssistance = () => { editEpoch.current += 1; assistanceRequest.current?.abort(); if (assistanceTimer.current) clearTimeout(assistanceTimer.current); setAssisting(false); };
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<'source' | 'preview'>('source');
  const [zoom, setZoom] = useState(1);
  const [svgWidth, setSvgWidth] = useState(360);
  const [viewportSize, setViewportSize] = useState({ width: 280, height: 360 });
  const sourceViewport = useRef<HTMLDivElement>(null);
  const editorBody = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ pointerId: number; corner: number } | null>(null);
  const sourceUrl = useBlobUrl(source);
  const previewUrl = useBlobUrl(preview?.blob ?? null);
  const previousRef = useRef(previous);
  const initialRotationRef = useRef(initialRotation);

  useEffect(() => {
    let active = true;
    const epoch = editEpoch.current;
    const current = new EvidenceScanner(); scanner.current = current;
    setDimensions({ width: 0, height: 0 }); setSource(null); setPreview(null); setLoading(true); setError('');
    void current.run(file, { mode: 'detect' }).then((result) => {
      if (!active) return;
      setDimensions({ width: result.width, height: result.height });
      setSource(result.sourcePreview ?? null); setQuality(result.quality);
      const saved = previousRef.current;
      const usableSaved = saved?.decision === 'prepared' && saved.recipe.width === result.width && saved.recipe.height === result.height;
      setCorners(usableSaved ? saved.recipe.corners : result.quad ?? FULL);
      setRotation(usableSaved ? saved.recipe.rotation : initialRotationRef.current);
      setProfile(usableSaved ? saved.recipe.profile : 'natural');
      setNotice(result.quad ? 'Bordes aproximados: comprueba que no falte ninguna respuesta.' : 'Mueve las esquinas hasta los bordes de la hoja. También puedes usar la foto original.');
      setLoading(false);
      if (!usableSaved && !result.quad && result.sourcePreview && assistant.current && editEpoch.current === epoch) {
        const controller = new AbortController(); assistanceRequest.current = controller;
        const timer = setTimeout(() => { controller.abort(); if (active && editEpoch.current === epoch) { setAssisting(false); setNotice('No pudimos proponer los bordes. Puedes ajustarlos o usar la foto original.'); } }, 20_000);
        assistanceTimer.current = timer;
        setAssisting(true);
        void assistant.current(result.sourcePreview, controller.signal).then((quad) => {
          if (!active || controller.signal.aborted || editEpoch.current !== epoch) return;
          if (quad && validScanQuad(quad)) {
            setCorners(conservativeScanSuggestion(quad));
            setNotice('Bordes sugeridos con ayuda visual y margen de seguridad. Comprueba que no falte ninguna respuesta antes de aceptar.');
          } else setNotice('No pudimos proponer los bordes. Puedes ajustarlos o usar la foto original.');
        }).catch(() => {
          if (active && !controller.signal.aborted && editEpoch.current === epoch) setNotice('No pudimos proponer los bordes. Puedes ajustarlos o usar la foto original.');
        }).finally(() => { clearTimeout(timer); if (active && editEpoch.current === epoch) setAssisting(false); });
      }
    }).catch((reason: Error) => { if (active && reason.name !== 'AbortError') { setError(reason.message); setLoading(false); } });
    return () => { active = false; editEpoch.current += 1; assistanceRequest.current?.abort(); if (assistanceTimer.current) clearTimeout(assistanceTimer.current); current.dispose(); if (scanner.current === current) scanner.current = null; };
  }, [file]);

  const recipe = useMemo<EvidenceScanRecipe>(() => ({ ...dimensions, corners, rotation, profile, coordinate_frame: 'exif_oriented_source' }), [dimensions, corners, rotation, profile]);
  const recipeKey = JSON.stringify(recipe);
  const valid = dimensions.width > 0 && validScanQuad(corners);
  useEffect(() => {
    const element = sourceViewport.current;
    if (!element || typeof ResizeObserver !== 'function') return;
    const measure = () => setViewportSize({ width: Math.max(1, element.clientWidth - 48), height: Math.max(1, element.clientHeight - 48) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element); return () => observer.disconnect();
  }, [source, tab]);
  useEffect(() => {
    if (!valid) return;
    let active = true;
    // Coalesce pointer moves before the bounded latest-only Worker queue.
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      void scanner.current?.run(file, { mode: 'preview', recipe }).then((result) => {
        if (active && result.preview) { setPreview({ blob: result.preview, key: recipeKey }); setLoading(false); }
      }).catch((reason: Error) => { if (active && reason.name !== 'AbortError') { setError(reason.message); setLoading(false); } });
    }, 160);
    return () => { active = false; clearTimeout(timer); };
  }, [file, valid, recipe, recipeKey]);

  useEffect(() => {
    if (!svg.current || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(([entry]) => setSvgWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(svg.current); return () => observer.disconnect();
  }, [source, tab, zoom]);
  useEffect(() => { drag.current = null; }, [file, tab, zoom, rotation]);

  const displayWidth = rotation % 180 ? dimensions.height : dimensions.width;
  const displayHeight = rotation % 180 ? dimensions.width : dimensions.height;
  const ratio = displayWidth > 0 ? displayHeight / displayWidth : 1.4;
  const viewHeight = 1000 * ratio;
  const fit = fitScanViewport(viewportSize.width, viewportSize.height, ratio);
  const fitPhoto = () => {
    setZoom(1);
    for (const element of [sourceViewport.current, editorBody.current]) {
      if (element) { element.scrollTop = 0; element.scrollLeft = 0; }
    }
  };
  const inverseRotation = ((360 - rotation) % 360) as ScanRotation;
  const updateCorner = (index: number, point: ScanPoint) => { cancelAssistance(); setCorners((current) => current.map((p, i) => i === index ? point.map((n) => Math.round(n * 100000) / 100000) : p) as ScanQuad); };
  const moveCorner = (dx: number, dy: number) => {
    const point = rotateScanPoint(corners[selected], rotation);
    updateCorner(selected, rotateScanPoint([Math.max(0, Math.min(1, point[0] + dx)), Math.max(0, Math.min(1, point[1] + dy))], inverseRotation));
  };
  const pointFromPointer = (event: PointerEvent<SVGSVGElement>): ScanPoint | null => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(bounds.width / 1000, bounds.height / viewHeight);
    if (!scale) return null;
    const x = (event.clientX - bounds.left - (bounds.width - 1000 * scale) / 2) / (1000 * scale);
    const y = (event.clientY - bounds.top - (bounds.height - viewHeight * scale) / 2) / (viewHeight * scale);
    return rotateScanPoint([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))], inverseRotation);
  };
  const imageTransform = rotation === 90 ? 'translate(1000 0) rotate(90)' : rotation === 180 ? `translate(1000 ${viewHeight}) rotate(180)` : rotation === 270 ? `translate(0 ${viewHeight}) rotate(270)` : undefined;
  const accepted = valid && preview?.key === recipeKey && !loading && !error;
  const close = () => { cancelAssistance(); scanner.current?.dispose(); onClose(); };
  const useOriginal = () => { cancelAssistance(); scanner.current?.dispose(); if (quality) onAccept({ decision: 'original' }, quality); else onAccept({ decision: 'original' }); };

  return <Modal open fullScreen onClose={close} title={`Preparar hoja ${pageNumber}`} className="fixed inset-0 m-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none p-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:p-4 [&>h2]:mb-2 [&>h2]:shrink-0" closeOnBackdrop={false}>
    <div ref={editorBody} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
    {assisting && <p role="status" aria-live="polite" className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">Buscando los bordes con ayuda visual externa… Puedes ajustar las esquinas o usar la original sin esperar.</p>}
    {notice && <p className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">{notice}</p>}
    {error && <p role="alert" className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">{error}</p>}
    <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
      <button type="button" className={control} aria-pressed={tab === 'source'} onClick={() => setTab('source')}>Ajustar bordes</button>
      <button type="button" className={control} aria-pressed={tab === 'preview'} onClick={() => setTab('preview')}>Ver preparada</button>
    </div>
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section className={`${tab !== 'source' ? 'hidden lg:block' : ''} min-w-0 space-y-2`} aria-label="Ajuste de la foto original">
        <h3 className="text-sm font-bold">Mueve las esquinas · la original se conserva</h3>
        <div ref={sourceViewport} data-testid="scan-source-viewport" className="h-[max(12rem,calc(100dvh-19rem))] overflow-auto rounded-xl border border-border bg-slate-900 p-6">
          {sourceUrl ? <svg ref={svg} viewBox={`0 0 1000 ${viewHeight}`} className="mx-auto block touch-none select-none overflow-visible" style={{ width: fit.width * zoom, height: fit.height * zoom, maxWidth: 'none' }}
            onPointerMove={(event) => { if (drag.current?.pointerId !== event.pointerId) return; const point = pointFromPointer(event); if (point) updateCorner(drag.current.corner, point); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
            aria-label="Foto con cuatro esquinas ajustables">
            <image href={sourceUrl} width={rotation % 180 ? viewHeight : 1000} height={rotation % 180 ? 1000 : viewHeight} preserveAspectRatio="none" transform={imageTransform} />
            <polygon points={corners.map((point) => { const [x, y] = rotateScanPoint(point, rotation); return `${x * 1000},${y * viewHeight}`; }).join(' ')} fill="rgba(16,185,129,.08)" stroke={valid ? '#34d399' : '#fbbf24'} strokeWidth={3} vectorEffect="non-scaling-stroke" />
            {corners.map((point, index) => {
              const [x, y] = rotateScanPoint(point, rotation);
              const radius = Math.max(22, 22 * 1000 / svgWidth);
              return <g key={index}>
                <circle cx={x * 1000} cy={y * viewHeight} r={radius} fill="transparent" aria-hidden="true" />
                <circle role="button" tabIndex={0} aria-label={`Esquina ${index + 1}, ${CORNERS[index]}`} aria-pressed={selected === index} cx={x * 1000} cy={y * viewHeight} r={radius} fill={selected === index ? '#4f46e5' : '#fff'} fillOpacity={0.9} stroke="#312e81" strokeWidth={2} vectorEffect="non-scaling-stroke"
                  className="cursor-move outline-none focus:stroke-amber-400 focus:stroke-[5px]"
                  onFocus={() => setSelected(index)} onClick={() => setSelected(index)}
                  onLostPointerCapture={() => { drag.current = null; }}
                  onPointerDown={(event) => { event.preventDefault(); cancelAssistance(); setSelected(index); drag.current = { pointerId: event.pointerId, corner: index }; event.currentTarget.setPointerCapture?.(event.pointerId); }}
                  onKeyDown={(event) => {
                    const movement: Record<string, [number, number]> = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] };
                    const delta = movement[event.key];
                    if (delta) { event.preventDefault(); moveCorner(...delta); }
                  }} />
                <text x={x * 1000} y={y * viewHeight} fill={selected === index ? '#fff' : '#312e81'} textAnchor="middle" dominantBaseline="central" fontSize={radius} pointerEvents="none" aria-hidden="true">{index + 1}</text>
              </g>;
            })}
          </svg> : <p role="status" className="p-5 text-center text-sm text-white">{loading ? 'Abriendo foto…' : 'Puedes continuar con la foto original.'}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={control} disabled={!source || zoom <= 1} aria-label="Alejar foto" onClick={() => setZoom((n) => Math.max(1, n - 0.5))}><ZoomOut className="h-4 w-4" /></button>
          <span className="min-w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
          <button type="button" className={control} disabled={!source || zoom >= 3} aria-label="Ampliar foto" onClick={() => setZoom((n) => Math.min(3, n + 0.5))}><ZoomIn className="h-4 w-4" /></button>
          <button type="button" className={control} disabled={!source} onClick={fitPhoto}>Encajar hoja</button>
          <button type="button" className={control} disabled={!source} onClick={() => { cancelAssistance(); setRotation((n) => ((n + 90) % 360) as ScanRotation); fitPhoto(); }}><RotateCw className="h-4 w-4" /> Girar</button>
          <button type="button" className={control} disabled={!source} onClick={() => { cancelAssistance(); setCorners(FULL); setRotation(initialRotation); setProfile('natural'); fitPhoto(); }}><Undo2 className="h-4 w-4" /> Restablecer</button>
        </div>
        {source && <details className="rounded-xl border border-border p-2"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Ajuste preciso con botones</summary><div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">Esquina<select aria-label="Esquina que quieres ajustar" className="min-h-11 rounded-lg border border-border bg-surface px-2" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>{CORNERS.map((name, i) => <option key={name} value={i}>{i + 1} · {name}</option>)}</select></label>
          {([{ label: 'izquierda', delta: [-0.005, 0], Icon: ArrowLeft }, { label: 'derecha', delta: [0.005, 0], Icon: ArrowRight }, { label: 'arriba', delta: [0, -0.005], Icon: ArrowUp }, { label: 'abajo', delta: [0, 0.005], Icon: ArrowDown }] as const).map(({ label, delta, Icon }) => <button type="button" key={label} aria-label={`Mover esquina ${label === 'derecha' || label === 'izquierda' ? 'a la ' : 'hacia '}${label}`} className={control} onClick={() => moveCorner(delta[0], delta[1])}><Icon className="h-4 w-4" /></button>)}
        </div></details>}
        {!valid && source && <p role="alert" className="text-sm text-amber-700 dark:text-amber-200">Separa las cuatro esquinas sin cruzarlas. También puedes restablecer los bordes.</p>}
      </section>
      <section className={`${tab !== 'preview' ? 'hidden lg:block' : ''} min-w-0 space-y-3`} aria-label="Resultado de la preparación">
        <h3 className="text-sm font-bold">Preparada · comprueba las respuestas</h3>
        <div className="grid h-[max(12rem,calc(100dvh-19rem))] place-items-center overflow-auto rounded-xl border border-border bg-slate-100 p-2 dark:bg-slate-900">
          {previewUrl ? <img src={previewUrl} alt="Vista previa de la hoja preparada" className="max-h-[max(11rem,calc(100dvh-20rem))] max-w-full object-contain" style={{ opacity: preview?.key === recipeKey ? 1 : 0.45 }} /> : <p className="p-5 text-sm text-muted">{loading ? 'Preparando vista previa…' : 'La vista aparecerá al revisar los bordes.'}</p>}
        </div>
        <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">Aspecto<select aria-label="Aspecto de la hoja preparada" className="min-h-11 rounded-lg border border-border bg-surface px-3" value={profile} disabled={!source} onChange={(event) => { cancelAssistance(); setProfile(event.target.value as EvidenceScanRecipe['profile']); }}><option value="natural">Natural · conserva los colores</option><option value="lectura_suave">Lectura suave · ajusta un poco la luz</option></select></label>
        <p className="text-sm leading-6 text-muted">Revisa los bordes, el lápiz y los dibujos. No se reconstruyen respuestas. Los reflejos, las partes tapadas y el desenfoque pueden necesitar otra foto.</p>
        {!!quality?.warnings.length && <p className="rounded-lg border border-amber-300 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:text-amber-100">{quality.warnings.join(' ')}</p>}
      </section>
    </div>
    <div role="status" aria-live="polite" className="my-3 min-h-6 text-sm text-muted">{source && !valid ? 'Revisa las esquinas para continuar.' : loading ? 'Preparando en este dispositivo…' : accepted ? 'Vista lista. Comprueba la hoja antes de aceptar.' : ''}</div>
    </div>
    <footer className="mt-2 grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-surface pt-2 pb-[env(safe-area-inset-bottom)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <button type="button" className={cn(control, 'col-span-2 border-brand-600 bg-brand-600 text-white hover:bg-brand-700 sm:col-span-1')} disabled={!accepted} onClick={() => { if (accepted && preview) { cancelAssistance(); scanner.current?.dispose(); onAccept({ decision: 'prepared', recipe, preview: preview.blob }, quality); } }}><ScanLine className="h-4 w-4 shrink-0" /> Usar esta preparación</button>
      <button type="button" className={control} onClick={useOriginal}>Usar foto original</button>
      <button type="button" className={control} onClick={close}>Volver sin cambios</button>
    </footer>
  </Modal>;
}
