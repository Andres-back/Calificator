import type { ImageQualityResult } from './imageQuality';

export type EvidenceRotation = 0 | 90 | 180 | 270;

export interface EvidencePage {
  id: string;
  file: File;
  rotation: EvidenceRotation;
  quality?: ImageQualityResult | null;
}

export const evidenceFiles = (pages: EvidencePage[]) => pages.map((page) => page.file);
export const evidenceRotations = (pages: EvidencePage[]) => pages.map((page) => page.rotation);
export const hasUnusableEvidence = (pages: EvidencePage[]) => (
  pages.some((page) => page.quality?.status === 'unusable')
);
