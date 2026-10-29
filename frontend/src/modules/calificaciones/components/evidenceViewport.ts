export type EvidenceBox = [number, number, number, number];
export type EvidenceViewport = { zoom: number; centerX: number; centerY: number };
export type EvidenceDimensions = { width: number; height: number; imageWidth: number; imageHeight: number };

const complete = (): EvidenceViewport => ({ zoom: 1, centerX: 0.5, centerY: 0.5 });
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const usable = (size: EvidenceDimensions) => Object.values(size).every((value) => Number.isFinite(value) && value > 0);
const fit = (size: EvidenceDimensions) => Math.min(size.width / size.imageWidth, size.height / size.imageHeight);

export function validEvidenceBox(value: unknown): value is EvidenceBox {
  if (!Array.isArray(value) || value.length !== 4 || !value.every((item) => typeof item === 'number' && Number.isFinite(item))) return false;
  const [x, y, width, height] = value;
  return x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1;
}

export function clampEvidenceViewport(size: EvidenceDimensions, viewport: EvidenceViewport): EvidenceViewport {
  if (!usable(size)) return complete();
  const zoom = Number.isFinite(viewport.zoom) ? clamp(viewport.zoom, 1, 8) : 1;
  const ratio = fit(size) * zoom;
  const axis = (center: number, rendered: number, available: number) => rendered <= available
    ? 0.5
    : clamp(Number.isFinite(center) ? center : 0.5, available / (2 * rendered), 1 - available / (2 * rendered));
  return { zoom, centerX: axis(viewport.centerX, size.imageWidth * ratio, size.width), centerY: axis(viewport.centerY, size.imageHeight * ratio, size.height) };
}

export function evidenceImageLayout(size: EvidenceDimensions, viewport: EvidenceViewport) {
  if (!usable(size)) return null;
  const view = clampEvidenceViewport(size, viewport);
  const width = size.imageWidth * fit(size) * view.zoom;
  const height = size.imageHeight * fit(size) * view.zoom;
  return { width, height, left: size.width / 2 - view.centerX * width, top: size.height / 2 - view.centerY * height };
}

export function focusEvidenceRegion(size: EvidenceDimensions, box: unknown): EvidenceViewport {
  if (!usable(size) || !validEvidenceBox(box)) return complete();
  const [x, y, width, height] = box;
  const paddedWidth = Math.min(1, x + width + 0.03) - Math.max(0, x - 0.03);
  const paddedHeight = Math.min(1, y + height + 0.03) - Math.max(0, y - 0.03);
  const zoom = Math.min(size.width / (size.imageWidth * fit(size) * paddedWidth), size.height / (size.imageHeight * fit(size) * paddedHeight));
  return clampEvidenceViewport(size, { zoom, centerX: x + width / 2, centerY: y + height / 2 });
}

export function zoomEvidenceViewport(size: EvidenceDimensions, viewport: EvidenceViewport, factor: number, anchor = { x: size.width / 2, y: size.height / 2 }): EvidenceViewport {
  const before = evidenceImageLayout(size, viewport);
  if (!before || !Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return clampEvidenceViewport(size, viewport);
  const zoom = clamp(viewport.zoom * factor, 1, 8);
  const nextRatio = fit(size) * zoom;
  return clampEvidenceViewport(size, {
    zoom,
    centerX: (anchor.x - before.left) / before.width - (anchor.x - size.width / 2) / (size.imageWidth * nextRatio),
    centerY: (anchor.y - before.top) / before.height - (anchor.y - size.height / 2) / (size.imageHeight * nextRatio),
  });
}

export function panEvidenceViewport(size: EvidenceDimensions, viewport: EvidenceViewport, dx: number, dy: number): EvidenceViewport {
  const layout = evidenceImageLayout(size, viewport);
  if (!layout || !Number.isFinite(dx) || !Number.isFinite(dy)) return clampEvidenceViewport(size, viewport);
  return clampEvidenceViewport(size, { ...viewport, centerX: viewport.centerX - dx / layout.width, centerY: viewport.centerY - dy / layout.height });
}
