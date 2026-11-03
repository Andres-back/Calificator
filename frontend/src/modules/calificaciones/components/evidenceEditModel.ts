import type { EvidenceEditContext, EvidenceEditManifest, EditableEvidencePage } from '../api';
import type { EvidenceScanSelection } from '@/components/evidence/scanTypes';
import type { ScanRotation } from '@/components/evidence/scanGeometry';

export type EvidenceDraftPage = { key: string; rotation: ScanRotation; edit?: EvidenceScanSelection }
  & ({ existing: EditableEvidencePage; file?: never } | { existing?: never; file: File });

export function makeEvidenceDraft(context: EvidenceEditContext): EvidenceDraftPage[] {
  return context.paginas.map(existing => ({ key: existing.referencia, existing, rotation: existing.rotacion }));
}

export function buildEvidenceEdit(context: EvidenceEditContext, pages: EvidenceDraftPage[]) {
  const files: File[] = [];
  const evidenceEdit: EvidenceEditManifest = { fingerprint: context.fingerprint, paginas: pages.map(page => {
    const changes = { rotacion: page.rotation, ...(page.edit?.decision === 'prepared' ? { receta: page.edit.recipe } : {}) };
    if (page.existing) return { referencia: page.existing.referencia, ...(page.edit ? changes : {}) };
    return { archivo_indice: files.push(page.file) - 1, ...changes };
  }) };
  return { files, evidenceEdit };
}

export function evidenceDraftChanged(context: EvidenceEditContext, pages: EvidenceDraftPage[]) {
  return pages.length !== context.paginas.length || pages.some((page, i) => page.key !== context.paginas[i]?.referencia || page.edit);
}
