import { describe, expect, it } from 'vitest';
import type { EvidenceEditContext } from '../api';
import type { EvidenceScanRecipe } from '@/components/evidence/scanTypes';
import { buildEvidenceEdit, evidenceDraftChanged, makeEvidenceDraft } from './evidenceEditModel';

const context: EvidenceEditContext = {
  version_esperada: '2026-11-03T00:00:00Z', fingerprint: 'a'.repeat(64),
  paginas: [{ referencia: 'saved', numero: 1, preview_url: '/api/test', rotacion: 90 }],
  limites: { max_pages: 10, max_file_bytes: 1024, max_total_bytes: 4096 },
};

describe('borrador de evidencia existente', () => {
  it('envía solo los archivos nuevos y conserva el orden de las hojas mixtas', () => {
    const [saved] = makeEvidenceDraft(context);
    const file = new File(['sintética'], 'nueva.jpg', { type: 'image/jpeg' });
    expect(evidenceDraftChanged(context, [saved])).toBe(false);
    const draft = [{ key: 'new', file, rotation: 0 as const }, saved];
    expect(evidenceDraftChanged(context, draft)).toBe(true);
    expect(buildEvidenceEdit(context, draft)).toEqual({
      files: [file], evidenceEdit: { fingerprint: context.fingerprint,
        paginas: [{ archivo_indice: 0, rotacion: 0 }, { referencia: 'saved' }] },
    });
  });

  it('envía únicamente la receta de un recorte; no sustituye la fuente por el preview', () => {
    const [saved] = makeEvidenceDraft(context);
    const recipe: EvidenceScanRecipe = { width: 800, height: 1000, corners: [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]], rotation: 90, profile: 'natural', coordinate_frame: 'exif_oriented_source' };
    const payload = buildEvidenceEdit(context, [{ ...saved, edit: { decision: 'prepared', recipe, preview: new Blob(['derivado']) } }]);
    expect(payload.files).toEqual([]);
    expect(payload.evidenceEdit.paginas).toEqual([{ referencia: 'saved', rotacion: 90, receta: recipe }]);
  });
});
