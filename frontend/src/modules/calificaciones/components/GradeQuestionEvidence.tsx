import { useEffect, useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui';
import type { GradeEvidenceRegion } from '@/types/api';
import { GradeEvidenceViewer } from './GradeEvidenceViewer';
import { validEvidenceBox } from './evidenceViewport';

function VersionedEvidence({ evidenceUrl, page, region, focusSignal }: { evidenceUrl: string; page: number; region: GradeEvidenceRegion; focusSignal?: number }) {
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [manual, setManual] = useState(false);
  const versionedUrl = `${evidenceUrl}/paginas/${page}?evidencia_version=${region.evidencia_version}`;
  useEffect(() => {
    if (manual) return;
    const controller = new AbortController();
    let objectUrl = '';
    let active = true;
    void (async () => {
      // El servidor responde 409 si la versión pedida ya no es la vigente. Solo eso, o una
      // cabecera que lo contradiga, demuestra que la zona no corresponde a esta hoja.
      let mismatch = false;
      try {
        const response = await fetch(versionedUrl, { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' });
        const version = response.headers.get('X-Evidence-Version');
        const sentPage = response.headers.get('X-Evidence-Page');
        mismatch = response.status === 409 || (version !== null && version !== region.evidencia_version) || (sentPage !== null && sentPage !== String(page));
        if (mismatch) throw new Error('evidence_version_mismatch');
        const type = (response.headers.get('Content-Type') ?? '').split(';')[0].trim();
        if (!response.ok || version === null || sentPage === null || !type.startsWith('image/')) throw new Error('evidence_version_unverified');
        const blob = await response.blob();
        if (!active) return;
        if (blob.size > 32 * 1024 * 1024) throw new Error('evidence_preview_too_large');
        objectUrl = URL.createObjectURL(blob);
        setLoadedUrl(objectUrl);
      } catch {
        if (!active) return;
        // Spec 176: si la comprobación previa no concluye (un intermediario altera la respuesta o la
        // lectura falla), la hoja se pide directamente con su versión: el servidor solo la entrega si coincide.
        if (mismatch) setFailed(true);
        else setLoadedUrl(versionedUrl);
      }
    })();
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidenceUrl, page, region.evidencia_version, manual, versionedUrl]);
  if (manual) return <GradeEvidenceViewer src={`${evidenceUrl}/paginas/${page}`} label={`Hoja ${page} de la evidencia`} />;
  if (failed) return <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-surface p-3 text-sm">
    <p>No pudimos comprobar que esta zona corresponda a la evidencia actual. Actualiza la revisión o abre la hoja sin señalar una zona.</p>
    <button type="button" onClick={() => setManual(true)} className="focus-ring min-h-11 rounded-lg border border-border px-3 font-semibold">Abrir hoja sin señalamiento</button>
  </div>;
  if (!loadedUrl) return <p role="status" className="rounded-xl border border-border p-4 text-sm text-muted">Comprobando la hoja de esta respuesta…</p>;
  return <>
    <p className="sr-only">Vista cercana de esta respuesta.</p>
    <GradeEvidenceViewer src={loadedUrl} label={`Hoja ${page} de la evidencia`} region={region.bbox} wholeQuestion={region.metodo === 'cuadricula'} focusSignal={focusSignal} />
  </>;
}

/** Qué puede hacer el docente cuando la respuesta no tiene zona: pedirla a la IA o leer por qué no se puede. */
export type AnswerLocationAction = { onLocate?: () => void; locating?: boolean; note?: string };

export function GradeQuestionEvidence({ evidenceUrl, pages, associatedPages, regions = [], activePage, onPageChange, focusSignal, location }: {
  evidenceUrl: string;
  pages: number;
  associatedPages: number[];
  regions?: GradeEvidenceRegion[];
  activePage: number;
  onPageChange: (page: number) => void;
  focusSignal?: number;
  location?: AnswerLocationAction;
}) {
  const count = Number.isSafeInteger(pages) && pages > 0 ? Math.min(pages, 20) : 1;
  const validRegions = regions.filter((region) => region.marco === 'pagina_canonica_orientada' && /^[a-f0-9]{32}$/.test(region.evidencia_version) && validEvidenceBox(region.bbox) && Number.isInteger(region.pagina) && region.pagina >= 1 && region.pagina <= count).slice(0, 8);
  const references = [...new Set([...associatedPages, ...validRegions.map((region) => region.pagina)].filter((page) => Number.isSafeInteger(page) && page >= 1 && page <= count))];
  const available = references.length ? references : Array.from({ length: count }, (_, index) => index + 1);
  const page = available.includes(activePage) ? activePage : available[0];
  const pageRegions = validRegions.filter((region) => region.pagina === page);
  const [regionIndex, setRegionIndex] = useState(0);
  const activeRegion = pageRegions[Math.min(regionIndex, pageRegions.length - 1)];
  return <section className="min-w-0 space-y-2" aria-label="Evidencia de la respuesta seleccionada">
    {!activeRegion && !location && <p className="text-xs text-muted">No hay una zona localizada; se muestra la hoja completa.</p>}
    {!activeRegion && location && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 dark:border-brand-500/40 dark:bg-brand-500/10" data-testid="answer-location-action">
      <p className="min-w-0 flex-1 basis-52 text-sm leading-5 text-fg" role={location.locating ? 'status' : undefined}>{location.locating
        ? 'Ubicando las preguntas en la hoja… Tarda unos segundos.'
        : location.note ?? 'No hay una zona localizada; se muestra la hoja completa.'}</p>
      {location.onLocate && <Button type="button" size="sm" className="min-h-11" loading={location.locating} onClick={location.onLocate}>
        <ScanSearch aria-hidden="true" className="h-4 w-4" />Ubicar preguntas con IA
      </Button>}
    </div>}
    {available.length > 1 && <nav className="flex flex-wrap gap-2" aria-label="Hojas de esta respuesta">
      {available.map((item) => <button type="button" key={item} aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)}
        className={`focus-ring min-h-11 min-w-11 rounded-lg border px-3 text-sm font-semibold ${item === page ? 'border-brand-400 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'border-border bg-surface text-fg'}`}>Hoja {item}</button>)}
    </nav>}
    {pageRegions.length > 1 && <nav className="flex flex-wrap gap-2" aria-label="Fragmentos de esta respuesta">
      {pageRegions.map((region, index) => <button key={`${region.evidencia_version}:${index}`} type="button" onClick={() => setRegionIndex(index)} aria-current={activeRegion === region ? 'step' : undefined} className="focus-ring min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-semibold">Fragmento {index + 1}</button>)}
    </nav>}
    {activeRegion ? <VersionedEvidence key={`${evidenceUrl}:${page}:${activeRegion.evidencia_version}`} evidenceUrl={evidenceUrl} page={page} region={activeRegion} focusSignal={focusSignal} /> : <GradeEvidenceViewer key={`${evidenceUrl}:${page}`} src={`${evidenceUrl}/paginas/${page}`} label={`Hoja ${page} de la evidencia`} />}
    {activeRegion && location && (location.locating
      ? <p role="status" className="text-sm text-muted">Ubicando las preguntas en la hoja… Tarda unos segundos.</p>
      : location.onLocate
        ? <button type="button" onClick={location.onLocate} className="focus-ring min-h-11 rounded-lg px-1 text-left text-sm font-semibold text-brand-700 underline underline-offset-2 dark:text-brand-300" data-testid="answer-relocate">¿El recuadro no está en la pregunta? Ubicar de nuevo</button>
        : location.note && <p className="text-sm text-muted">{location.note}</p>)}
  </section>;
}
