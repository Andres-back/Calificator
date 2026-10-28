import { validScanQuad, type ScanPoint, type ScanQuad } from './scanGeometry';
import type { CvMat, ScanCv } from './opencvTypes';

/** A four-point approximation alone can mistake a curled edge for a flat sheet. */
export function straightScanBoundary(contour: Int32Array, quad: ScanQuad, width: number, height: number) {
  const points = quad.map(([x, y]) => [x * (width - 1), y * (height - 1)]);
  const distances: number[] = [];
  for (let i = 0; i + 1 < contour.length; i += 2) {
    let nearest = Infinity;
    for (let edge = 0; edge < 4; edge++) {
      const a = points[edge], b = points[(edge + 1) % 4];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((contour[i] - a[0]) * dx + (contour[i + 1] - a[1]) * dy) / (dx * dx + dy * dy)));
      nearest = Math.min(nearest, Math.hypot(contour[i] - a[0] - t * dx, contour[i + 1] - a[1] - t * dy));
    }
    distances.push(nearest);
  }
  distances.sort((a, b) => a - b);
  return distances.length > 0 && distances[Math.floor((distances.length - 1) * 0.95)] <= 1 + Math.min(width, height) * 0.008;
}

function orderPoints(points: ScanPoint[]): ScanQuad | null {
  const center = points.reduce(([x, y], [a, b]) => [x + a / 4, y + b / 4], [0, 0]);
  points.sort((a, b) => Math.atan2(a[1] - center[1], a[0] - center[0]) - Math.atan2(b[1] - center[1], b[0] - center[0]));
  let first = 0;
  points.forEach((point, index) => { if (point[0] + point[1] < points[first][0] + points[first][1]) first = index; });
  const quad = [...points.slice(first), ...points.slice(0, first)] as ScanQuad;
  return validScanQuad(quad) ? quad : null;
}

/** A curved perimeter must be contained, not flattened by cutting its bulge. */
export function approximateScanBoundary(contour: Int32Array, width: number, height: number): ScanQuad | null {
  if (width < 2 || height < 2 || contour.length < 8) return null;
  let left = 1, top = 1, right = 0, bottom = 0;
  for (let i = 0; i + 1 < contour.length; i += 2) {
    const x = contour[i] / (width - 1), y = contour[i + 1] / (height - 1);
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  const area = (right - left) * (bottom - top);
  if (area < .25 || area > .95) return null;
  // Keep a visible, conservative margin. No perspective warp for a curved page.
  left = Math.max(0, left - .025); right = Math.min(1, right + .025);
  top = Math.max(0, top - .025); bottom = Math.min(1, bottom + .025);
  const result: ScanQuad = [[left, top], [right, top], [right, bottom], [left, bottom]];
  return validScanQuad(result) ? result : null;
}

function paperEdgeContrast(quad: ScanQuad, gray: CvMat) {
  let sum = 0; let count = 0;
  for (let edge = 0; edge < 4; edge++) {
    const a = quad[edge], b = quad[(edge + 1) % 4];
    const dx = (b[0] - a[0]) * (gray.cols - 1), dy = (b[1] - a[1]) * (gray.rows - 1);
    const length = Math.hypot(dx, dy);
    for (let sample = 1; sample <= 7; sample++) {
      const t = sample / 8;
      const x = (a[0] + (b[0] - a[0]) * t) * (gray.cols - 1);
      const y = (a[1] + (b[1] - a[1]) * t) * (gray.rows - 1);
      const values = [-1, 1].map((direction) => {
        const px = Math.round(x - direction * dy / length * 5), py = Math.round(y + direction * dx / length * 5);
        return px < 0 || py < 0 || px >= gray.cols || py >= gray.rows ? null : gray.data[py * gray.cols + px];
      });
      if (values[0] !== null && values[1] !== null) { sum += values[1] - values[0]; count++; }
    }
  }
  return count ? sum / count : 0;
}

/** A proposal, never a forced crop. Internal edge mask is not an output photograph. */
export function detectScanQuad(cv: ScanCv, rgba: CvMat): ScanQuad | null {
  const small = new cv.Mat(), gray = new cv.Mat(), blurred = new cv.Mat(), edges = new cv.Mat();
  const contours = new cv.MatVector(), hierarchy = new cv.Mat();
  try {
    const ratio = Math.min(1, 1024 / Math.max(rgba.cols, rgba.rows));
    cv.resize(rgba, small, new cv.Size(Math.round(rgba.cols * ratio), Math.round(rgba.rows * ratio)), 0, 0, cv.INTER_AREA);
    cv.cvtColor(small, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 60, 160);
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
    const candidates: { quad: ScanQuad; area: number; contrast: number }[] = [];
    // A noisy image is not worth unbounded contour work on a phone.
    if (contours.size() > 2000) return null;
    for (let index = 0; index < contours.size(); index++) {
      const contour = contours.get(index), approximate = new cv.Mat();
      try {
        cv.approxPolyDP(contour, approximate, 0.02 * cv.arcLength(contour, true), true);
        if (approximate.rows !== 4 || !cv.isContourConvex(approximate)) continue;
        const points: ScanPoint[] = Array.from({ length: 4 }, (_, i) => [approximate.data32S[i * 2] / (small.cols - 1), approximate.data32S[i * 2 + 1] / (small.rows - 1)]);
        const quad = orderPoints(points);
        if (!quad) continue;
        const contrast = paperEdgeContrast(quad, gray);
        if (contrast < 15) continue;
        const straight = straightScanBoundary(contour.data32S, quad, small.cols, small.rows);
        const proposal = straight ? quad : approximateScanBoundary(contour.data32S, small.cols, small.rows);
        if (!proposal) continue;
        const area = proposal.reduce((sum, [x, y], i) => sum + x * proposal[(i + 1) % 4][1] - y * proposal[(i + 1) % 4][0], 0) / 2;
        if (area < 0.15 || area > .97 || candidates.some((item) => item.quad.every((p, i) => Math.hypot(p[0] - proposal[i][0], p[1] - proposal[i][1]) < 0.025))) continue;
        candidates.push({ quad: proposal, area, contrast });
      } finally { contour.delete(); approximate.delete(); }
    }
    candidates.sort((a, b) => b.area - a.area);
    const first = candidates[0], second = candidates[1];
    if (!first || (second && second.area > first.area * 0.65)) return null;
    // Tiny outward safety margin for edge localization/rounding, never another crop.
    const center = first.quad.reduce(([x, y], [a, b]) => [x + a / 4, y + b / 4], [0, 0]);
    return first.quad.map(([x, y]) => [Math.max(0, Math.min(1, center[0] + (x - center[0]) * 1.008)), Math.max(0, Math.min(1, center[1] + (y - center[1]) * 1.008))]) as ScanQuad;
  } finally {
    small.delete(); gray.delete(); blurred.delete(); edges.delete(); contours.delete(); hierarchy.delete();
  }
}
