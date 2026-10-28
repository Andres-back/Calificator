import type { EvidencePage } from './evidencePayload';
import type { EvidenceScanRecipe } from './scanTypes';

export interface ScanSubmission {
  schema_version: 1;
  pages: { page_id: string; revision: number; decision: 'original' | 'prepared'; rotation: number;
    confirmed: true; recipe?: EvidenceScanRecipe }[];
}

export function scanPagesReviewed(pages: EvidencePage[]): boolean {
  return pages.length > 0 && pages.every((page) => Boolean(page.scan));
}

/** Explicit legacy opt-out: no image conversion or guessed quality success. */
export function withoutEvidenceScan(pages: EvidencePage[]): EvidencePage[] {
  return pages.map((page) => ({ ...page, scan: undefined, quality: page.quality ?? {
    status: 'warning', warnings: ['No pudimos comprobar la calidad. Revisa la foto antes de enviarla.'], width: 0, height: 0,
  } }));
}

/** Changes to quality/preview blobs are not a new grading intention. */
export function evidenceIntentKey(pages: EvidencePage[]): string {
  return JSON.stringify(pages.map((page) => ({ id: page.id, rotation: page.rotation,
    decision: page.scan?.decision, recipe: page.scan?.decision === 'prepared' ? page.scan.recipe : undefined })));
}

export function scanSubmission(pages: EvidencePage[]): ScanSubmission {
  if (pages.length > 10 || pages.some((page) => !page.file.type.startsWith('image/'))) {
    throw new Error('Esta preparación acepta fotos; el PDF usa la opción habitual.');
  }
  if (!scanPagesReviewed(pages)) throw new Error('Revisa cada hoja o elige usar su foto original antes de enviar.');
  return { schema_version: 1, pages: pages.map((page) => {
    if (!/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(page.id)) throw new Error('Revisa las fotos de esta selección antes de enviar.');
    if (page.scan?.decision === 'prepared') {
      const recipe = page.scan.recipe;
      if (recipe.rotation !== page.rotation) throw new Error('Revisa el giro de la hoja antes de enviar.');
      // Closed projection: never JSON.stringify the selection (it has a Blob).
      return { page_id: page.id, revision: 0, decision: 'prepared', rotation: page.rotation, confirmed: true,
        recipe: { width: recipe.width, height: recipe.height, corners: recipe.corners.map((corner) => [...corner]) as EvidenceScanRecipe['corners'],
          rotation: recipe.rotation, profile: recipe.profile, coordinate_frame: 'exif_oriented_source' } };
    }
    return { page_id: page.id, revision: 0, decision: 'original', rotation: page.rotation, confirmed: true };
  }) };
}
