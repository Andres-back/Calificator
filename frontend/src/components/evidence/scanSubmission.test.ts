import { describe, expect, it } from 'vitest';
import { scanSubmission, scanPagesReviewed, withoutEvidenceScan } from './scanSubmission';
import type { EvidencePage } from './evidencePayload';

const page = (): EvidencePage => ({ id: crypto.randomUUID(), file: new File(['source'], 'private-name.png', { type: 'image/png' }), rotation: 0 });

describe('closed evidence submission', () => {
  it('optar por carga habitual conserva archivos/giros y no presenta calidad desconocida como buena', () => {
    const unknown = page();
    unknown.rotation = 90;
    unknown.scan = { decision: 'original' };
    const unusable = { ...page(), quality: { status: 'unusable' as const, warnings: ['No se lee'], width: 20, height: 20 } };
    const result = withoutEvidenceScan([unknown, unusable]);
    expect(result[0].file).toBe(unknown.file);
    expect(result[0].rotation).toBe(90);
    expect(result[0].scan).toBeUndefined();
    expect(result[0].quality?.status).toBe('warning');
    expect(result[1].quality).toBe(unusable.quality);
    expect(unknown.scan?.decision).toBe('original');
  });
  it('requires an explicit decision per page, without changing legacy quality rules', () => {
    const value = page();
    expect(scanPagesReviewed([value])).toBe(false);
    expect(() => scanSubmission([value])).toThrow('Revisa');
    value.scan = { decision: 'original' };
    expect(scanPagesReviewed([value])).toBe(true);
    expect(scanSubmission([value]).pages[0]).toEqual({ page_id: value.id, revision: 0, decision: 'original', rotation: 0, confirmed: true });
  });
  it('sends geometry and original files, never preview blobs, filenames or paths', () => {
    const value = page();
    value.rotation = 90;
    value.scan = { decision: 'prepared', preview: new Blob(['PREVIEW-MUST-NOT-UPLOAD']), recipe: {
      width: 800, height: 1100, corners: [[0, 0], [1, 0], [1, 1], [0, 1]], rotation: 90,
      profile: 'natural', coordinate_frame: 'exif_oriented_source',
    } };
    const result = scanSubmission([value]);
    expect(result.pages[0].recipe).toEqual(value.scan.recipe);
    expect(JSON.stringify(result)).not.toMatch(/PREVIEW|private-name|"(?:preview|file|key)"/);
    expect(value.file.name).toBe('private-name.png');
  });
  it('rejects stale recipe turns or a PDF instead of silently discarding a crop', () => {
    const value = page();
    value.scan = { decision: 'prepared', preview: new Blob(), recipe: {
      width: 800, height: 1100, corners: [[0, 0], [1, 0], [1, 1], [0, 1]], rotation: 90,
      profile: 'natural', coordinate_frame: 'exif_oriented_source',
    } };
    expect(() => scanSubmission([value])).toThrow('Revisa');
    value.file = new File(['pdf'], 'guide.pdf', { type: 'application/pdf' });
    expect(() => scanSubmission([value])).toThrow('fotos');
  });
});
