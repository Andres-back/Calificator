import type { ResourceDecoration } from './types';
import { curatedAssetPath } from './motifLibrary';

function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function rawDecoration(content: unknown): Record<string, unknown> | null {
  if (!record(content) || !record(content._presentacion) || !record(content._presentacion.decoracion)) return null;
  return content._presentacion.decoracion;
}
export function readDecoration(content: unknown): ResourceDecoration | null {
  const value = rawDecoration(content);
  return value?.placement === 'header' && typeof value.motif_id === 'string' && /^[a-z][a-z0-9-]{0,69}$/.test(value.motif_id) ? { motif_id: value.motif_id, placement: 'header' } : null;
}
export function readDecorationUrl(content: unknown): string | null {
  const value = rawDecoration(content);
  if (!readDecoration(content) || typeof value?.asset_url !== 'string') return null;
  try { return curatedAssetPath(value.asset_url); } catch { return null; }
}
