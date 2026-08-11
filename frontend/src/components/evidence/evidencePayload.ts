export type EvidenceRotation = 0 | 90 | 180 | 270;

export interface EvidencePage {
  id: string;
  file: File;
  rotation: EvidenceRotation;
}

export const evidenceFiles = (pages: EvidencePage[]) => pages.map((page) => page.file);
export const evidenceRotations = (pages: EvidencePage[]) => pages.map((page) => page.rotation);