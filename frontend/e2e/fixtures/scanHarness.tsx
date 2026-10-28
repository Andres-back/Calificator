// Browser-only synthetic harness. Not imported by the application/build.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MultiPageEvidencePicker } from '../../src/components/evidence/MultiPageEvidencePicker';
import type { EvidencePage } from '../../src/components/evidence/evidencePayload';
import { EvidenceScanner } from '../../src/components/evidence/evidenceScan';
import type { EvidenceScanRecipe } from '../../src/components/evidence/scanTypes';
import { createCornerAssistant, type CornerAssistant } from '../../src/components/evidence/cornerAssistance';

function photo(base64: string) {
  return new File([Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))], 'hoja-sintetica.png', { type: 'image/png' });
}
export function mount(suggestCorners?: CornerAssistant) {
  const app = document.getElementById('root'); if (app) app.style.display = 'none';
  const container = document.createElement('div'); container.id = 'scan-synthetic-harness'; document.body.append(container);
  function Harness() {
    const [pages, setPages] = useState<EvidencePage[]>([]);
    return <main className="mx-auto max-w-6xl p-3"><h1 className="mb-4 text-xl">Prueba sintética de captura</h1><MultiPageEvidencePicker scanEnabled suggestCorners={suggestCorners} pages={pages} onChange={setPages} contextKey="synthetic-only" /><output aria-label="Decisiones del paquete">{pages.map((page) => page.scan?.decision ?? 'pending').join(',')}</output></main>;
  }
  createRoot(container).render(<Harness />);
}

/** Simulate ONLY a local abstention to exercise the optional authenticated API.
 * Real Worker decode/preparation is retained. No provider is called by this file;
 * the test must intercept /api. Not imported by application or phone QA builds.
 */
export function mountAssistedTest() {
  const run = EvidenceScanner.prototype.run;
  EvidenceScanner.prototype.run = async function (file, options) {
    const result = await run.call(this, file, options);
    return options.mode === 'detect' ? { ...result, quad: null } : result;
  };
  mount(createCornerAssistant('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'));
}
export async function probe(base64: string, recipe?: EvidenceScanRecipe) {
  const scanner = new EvidenceScanner();
  try {
    const source = photo(base64);
    const result = await scanner.run(source, { mode: 'detect' });
    const actualRecipe = recipe ?? { width: result.width, height: result.height, corners: result.quad ?? [[0, 0], [1, 0], [1, 1], [0, 1]], rotation: 0, profile: 'natural', coordinate_frame: 'exif_oriented_source' };
    const prepared = await scanner.run(source, { mode: 'preview', recipe: actualRecipe });
    const bitmap = await createImageBitmap(prepared.preview!);
    const dimensions = [bitmap.width, bitmap.height]; bitmap.close();
    return { width: result.width, height: result.height, quad: result.quad, detectMs: result.durationMs, previewMs: prepared.durationMs, previewBytes: prepared.preview!.size, previewMime: prepared.preview!.type, dimensions };
  } finally { scanner.dispose(); }
}

export async function fidelityPreviews(base64: string) {
  const scanner = new EvidenceScanner();
  try {
    const source = photo(base64);
    const detected = await scanner.run(source, { mode: 'detect' });
    const corners = detected.quad ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    const results = [];
    for (const profile of ['natural', 'lectura_suave'] as const) {
      const recipe: EvidenceScanRecipe = { width: detected.width, height: detected.height, corners,
        rotation: 0, profile, coordinate_frame: 'exif_oriented_source' };
      const prepared = await scanner.run(source, { mode: 'preview', recipe });
      if (!prepared.preview) throw new Error('Synthetic preview missing');
      results.push({ recipe, mime: prepared.preview.type, bytes: Array.from(new Uint8Array(await prepared.preview.arrayBuffer())) });
    }
    return { proposal: Boolean(detected.quad), quality: detected.quality, results };
  } finally { scanner.dispose(); }
}
