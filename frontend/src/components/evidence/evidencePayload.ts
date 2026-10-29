import type { ImageQualityResult } from './imageQuality';
import type { EvidenceScanSelection } from './scanTypes';

export type EvidenceRotation = 0 | 90 | 180 | 270;

export interface EvidencePage {
  id: string;
  file: File;
  rotation: EvidenceRotation;
  quality?: ImageQualityResult | null;
  scan?: EvidenceScanSelection;
}

export const evidenceFiles = (pages: EvidencePage[]) => pages.map((page) => page.file);
export const evidenceRotations = (pages: EvidencePage[]) => pages.map((page) => page.rotation);
export const hasUnusableEvidence = (pages: EvidencePage[]) => (
  pages.some((page) => page.quality?.status === 'unusable')
);
