import type { ImageQualityResult } from './imageQuality';
import type { ScanQuad, ScanRotation } from './scanGeometry';

export interface EvidenceScanRecipe {
  width: number;
  height: number;
  corners: ScanQuad;
  rotation: ScanRotation;
  profile: 'natural' | 'lectura_suave';
  coordinate_frame: 'exif_oriented_source';
}

export type EvidenceScanSelection = { decision: 'original' } | {
  decision: 'prepared'; recipe: EvidenceScanRecipe; preview: Blob;
};
export type ScanOptions = { mode: 'detect' } | { mode: 'preview'; recipe: EvidenceScanRecipe };
export interface ScanResult {
  width: number;
  height: number;
  quad: ScanQuad | null;
  sourcePreview?: Blob;
  preview?: Blob;
  quality: ImageQualityResult;
  durationMs: number;
}
export interface ScanPixels {
  rgba: ArrayBuffer; width: number; height: number; sourceWidth: number; sourceHeight: number; sourcePreview?: Blob;
}
export interface ScanRendered { rgba: ArrayBuffer; width: number; height: number }
export type ScanRequest = { id: number; file: File; options: ScanOptions; pixels?: ScanPixels };
export type ScanResponse = { id: number; ok: true; result: ScanResult & { rendered?: ScanRendered } } | { id: number; ok: false; code: string };
