import { useEffect, useState } from 'react';
import type { GradeEvidenceRegion } from '@/types/api';
import { GradeEvidenceViewer } from './GradeEvidenceViewer';
import { validEvidenceBox } from './evidenceViewport';

function VersionedEvidence({ evidenceUrl, page, region }: { evidenceUrl: string; page: number; region: GradeEvidenceRegion }) {
  const [loadedUrl, setLoadedUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (manual) return;
    const controller = new AbortController();
    let objectUrl = '';
    let active = true;
    void (async () => {
      try {
        const response = await fetch(`${evidenceUrl}/paginas/${page}?evidencia_version=${region.evidencia_version}`, { signal: controller.signal, credentials: 'same-origin', cache: 'no-store' });
        if (!response.ok || response.headers.get('X-Evidence-Version') !== region.evidencia_version || response.headers.get('X-Evidence-Page') !== String(page) || response.headers.get('Content-Type')?.split(';')[0] !== 'image/png') throw new Error('evidence_version_unverified');
        const blob = await response.blob();
        if (!active) return;
        if (blob.size > 32 * 1024 * 1024) throw new Error('evidence_preview_too_large');
        objectUrl = URL.createObjectURL(blob);
        setLoadedUrl(objectUrl);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => { active = false; controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [evidenceUrl, page, region.evidencia_version, manual]);
  if (manual) return <GradeEvidenceViewer src={`${evidenceUrl}/paginas/${page}`} label={`Hoja ${page} de la evidencia`} />;
  if (failed) return <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-surface p-3 text-sm">
    <p>No pudimos comprobar que esta zona corresponda a la evidencia actual. Actualiza la revisión o abre la hoja sin señalar una zona.</p>
    <button type="button" onClick={() => setManual(true)} className="focus-ring min-h-11 rounded-lg border border-border px-3 font-semibold">Abrir hoja sin señalamiento</button>
  </div>;
  if (!loadedUrl) return <p role="status" className="rounded-xl border border-border p-4 text-sm text-muted">Comprobando la hoja de esta respuesta…</p>;
  return <GradeEvidenceViewer src={loadedUrl} label={`Hoja ${page} de la evidencia`} region={region.bbox} />;
}

export function GradeQuestionEvidence({ evidenceUrl, pages, associatedPages, regions = [], activePage, onPageChange }: {
  evidenceUrl: string;
  pages: number;
  associatedPages: number[];
  regions?: GradeEvidenceRegion[];
  activePage: number;
  onPageChange: (page: number) => void;
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
    <p className="text-xs leading-5 text-muted">{references.length ? 'Consulta la hoja asociada y amplía la respuesta para comprobarla.' : 'No hay una zona localizada para esta respuesta. Elige la hoja y amplía para revisarla.'}</p>
    {available.length > 1 && <nav className="flex flex-wrap gap-2" aria-label="Hojas de esta respuesta">
      {available.map((item) => <button type="button" key={item} aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)}
        className={`focus-ring min-h-11 min-w-11 rounded-lg border px-3 text-sm font-semibold ${item === page ? 'border-brand-400 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'border-border bg-surface text-fg'}`}>Hoja {item}</button>)}
    </nav>}
    {pageRegions.length > 1 && <nav className="flex flex-wrap gap-2" aria-label="Fragmentos de esta respuesta">
      {pageRegions.map((region, index) => <button key={`${region.evidencia_version}:${index}`} type="button" onClick={() => setRegionIndex(index)} aria-current={activeRegion === region ? 'step' : undefined} className="focus-ring min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-semibold">Fragmento {index + 1}</button>)}
    </nav>}
    {activeRegion ? <VersionedEvidence key={`${evidenceUrl}:${page}:${activeRegion.evidencia_version}`} evidenceUrl={evidenceUrl} page={page} region={activeRegion} /> : <GradeEvidenceViewer key={`${evidenceUrl}:${page}`} src={`${evidenceUrl}/paginas/${page}`} label={`Hoja ${page} de la evidencia`} />}
  </section>;
}
