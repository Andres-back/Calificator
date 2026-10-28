/// <reference lib="webworker" />
import { SCAN_MAX_PIXELS } from './imageHeader';
import { scanSource } from './scanSource';
import { assessEvidencePixels } from './imageQuality';
import { scanOutputSize, validScanQuad } from './scanGeometry';
import { detectScanQuad } from './scanDetection';
import { blendScanLuminance } from './scanLuminance';
import type { ScanCv, CvMat } from './opencvTypes';
import type { EvidenceScanRecipe, ScanPixels, ScanRequest, ScanResponse, ScanResult, ScanRendered } from './scanTypes';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let cvPromise: Promise<ScanCv> | null = null;
function loadCv() {
  // Fixed self-hosted module adapter; no CDN, eval, image upload or app startup load.
  const path = '/vendor/opencv/4.13.0-csp1/opencv-module.js';
  cvPromise ??= import(/* @vite-ignore */ path).then(async (module) => await module.default as ScanCv);
  return cvPromise;
}

async function toBlob(mat: CvMat) {
  if (typeof OffscreenCanvas !== 'function') return { rendered: { rgba: new Uint8Array(mat.data).buffer, width: mat.cols, height: mat.rows } };
  const canvas = new OffscreenCanvas(mat.cols, mat.rows);
  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('unsupported_image');
    context.putImageData(new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows), 0, 0);
    return { preview: await canvas.convertToBlob({ type: 'image/png' }) };
  } finally { canvas.width = 1; canvas.height = 1; }
}

async function preparedPreview(cv: ScanCv, source: CvMat, recipe: EvidenceScanRecipe) {
  if (!validScanQuad(recipe.corners) || ![0, 90, 180, 270].includes(recipe.rotation) || !['natural', 'lectura_suave'].includes(recipe.profile)) throw new Error('invalid_recipe');
  const size = scanOutputSize(source.cols, source.rows, recipe.corners, 1600);
  const points = cv.matFromArray(4, 1, cv.CV_32FC2, recipe.corners.flatMap(([x, y]) => [x * (source.cols - 1), y * (source.rows - 1)]));
  const target = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, size.width - 1, 0, size.width - 1, size.height - 1, 0, size.height - 1]);
  const warped = new cv.Mat(), rotated = new cv.Mat(); let matrix: CvMat | null = null;
  try {
    matrix = cv.getPerspectiveTransform(points, target);
    cv.warpPerspective(source, warped, matrix, new cv.Size(size.width, size.height), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
    const rotation = recipe.rotation === 90 ? cv.ROTATE_90_CLOCKWISE : recipe.rotation === 180 ? cv.ROTATE_180 : cv.ROTATE_90_COUNTERCLOCKWISE;
    if (recipe.rotation) cv.rotate(warped, rotated, rotation);
    const page = recipe.rotation ? rotated : warped;
    if (recipe.profile === 'natural') return await toBlob(page);
    const rgb = new cv.Mat(), ycc = new cv.Mat(), channels = new cv.MatVector(), adjusted = new cv.MatVector();
    const enhanced = new cv.Mat(), merged = new cv.Mat(), outputRgb = new cv.Mat(), output = new cv.Mat();
    const clahe = new cv.CLAHE(1.25, new cv.Size(8, 8));
    const borrowed: CvMat[] = [];
    try {
      cv.cvtColor(page, rgb, cv.COLOR_RGBA2RGB); cv.cvtColor(rgb, ycc, cv.COLOR_RGB2YCrCb); cv.split(ycc, channels);
      const luminance = channels.get(0); borrowed.push(luminance);
      clahe.apply(luminance, enhanced);
      blendScanLuminance(luminance.data, enhanced.data);
      adjusted.push_back(luminance);
      for (let i = 1; i < 3; i++) { const channel = channels.get(i); borrowed.push(channel); adjusted.push_back(channel); }
      cv.merge(adjusted, merged); cv.cvtColor(merged, outputRgb, cv.COLOR_YCrCb2RGB); cv.cvtColor(outputRgb, output, cv.COLOR_RGB2RGBA);
      return await toBlob(output);
    } finally {
      borrowed.forEach((mat) => mat.delete()); clahe.delete(); rgb.delete(); ycc.delete(); channels.delete(); adjusted.delete();
      enhanced.delete(); merged.delete(); outputRgb.delete(); output.delete();
    }
  } finally { points.delete(); target.delete(); matrix?.delete(); warped.delete(); rotated.delete(); }
}

async function decode(request: ScanRequest): Promise<ScanPixels> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') throw new Error('needs_canvas_bridge');
  const normalized = await scanSource(request.file);
  const bitmap = await createImageBitmap(normalized.blob, { imageOrientation: 'none' });
  let sourceCanvas: OffscreenCanvas | null = null;
  try {
    const { width, height } = normalized.frame;
    if (bitmap.width !== normalized.dimensions.width || bitmap.height !== normalized.dimensions.height) throw new Error('unsupported_image');
    const scale = Math.min(1, 1600 / Math.max(width, height));
    sourceCanvas = new OffscreenCanvas(Math.max(2, Math.round(width * scale)), Math.max(2, Math.round(height * scale)));
    const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('needs_canvas_bridge');
    context.fillStyle = '#fff'; context.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    const [a, b, c, d, e, f] = normalized.frame.transform;
    const sx = sourceCanvas.width / width, sy = sourceCanvas.height / height;
    context.setTransform(a * sx, b * sy, c * sx, d * sy, e * sx, f * sy);
    context.drawImage(bitmap, 0, 0);
    // Release full source pixels before allocating OpenCV matrices/WASM memory.
    bitmap.close();
    const rgba = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data.buffer as ArrayBuffer;
    const sourcePreview = request.options.mode === 'detect' ? await sourceCanvas.convertToBlob({ type: 'image/png' }) : undefined;
    return { rgba, width: sourceCanvas.width, height: sourceCanvas.height, sourceWidth: width, sourceHeight: height, sourcePreview };
  } finally { bitmap.close(); if (sourceCanvas) { sourceCanvas.width = 1; sourceCanvas.height = 1; } }
}

function assessBoundedPixels(pixels: ScanPixels) {
  const scale = Math.min(1, 384 / Math.max(pixels.width, pixels.height));
  const width = Math.max(2, Math.round(pixels.width * scale)), height = Math.max(2, Math.round(pixels.height * scale));
  const source = new Uint8ClampedArray(pixels.rgba), sample = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (Math.min(pixels.height - 1, Math.floor(y / scale)) * pixels.width + Math.min(pixels.width - 1, Math.floor(x / scale))) * 4;
    sample.set(source.subarray(offset, offset + 4), (y * width + x) * 4);
  }
  return assessEvidencePixels(sample, width, height, pixels.sourceWidth, pixels.sourceHeight);
}

async function process(request: ScanRequest): Promise<ScanResult & { rendered?: ScanRendered }> {
  const started = performance.now();
  const pixels = request.pixels ?? await decode(request);
  const { sourceWidth: width, sourceHeight: height } = pixels;
  if (![pixels.width, pixels.height, width, height].every((n) => Number.isSafeInteger(n) && n >= 2)
    || Math.max(pixels.width, pixels.height) > 1600 || width * height > SCAN_MAX_PIXELS
    || pixels.rgba.byteLength !== pixels.width * pixels.height * 4) throw new Error('pixel_budget');
  if (request.options.mode === 'preview' && (request.options.recipe.width !== width || request.options.recipe.height !== height)) throw new Error('invalid_recipe');
  const quality = assessBoundedPixels(pixels);
  let source: CvMat | null = null;
  try {
    const cv = await loadCv();
    source = new cv.Mat(pixels.height, pixels.width, cv.CV_8UC4); source.data.set(new Uint8Array(pixels.rgba));
    if (request.options.mode === 'detect') {
      const quad = detectScanQuad(cv, source);
      return { width, height, quad, sourcePreview: pixels.sourcePreview, quality, durationMs: performance.now() - started };
    }
    const preview = await preparedPreview(cv, source, request.options.recipe);
    return { width, height, quad: request.options.recipe.corners, ...preview, quality, durationMs: performance.now() - started };
  } finally { source?.delete(); }
}

// The owning client serializes requests. Reject accidental concurrent decodes too.
let busy = false;
scope.onmessage = async (event: MessageEvent<ScanRequest>) => {
  const request = event.data;
  if (busy) { scope.postMessage({ id: request.id, ok: false, code: 'busy' } satisfies ScanResponse); return; }
  busy = true;
  try {
    const result = await process(request);
    scope.postMessage({ id: request.id, ok: true, result } satisfies ScanResponse, result.rendered ? [result.rendered.rgba] : []);
  }
  catch (error) {
    // Never include file names, image bytes, EXIF or arbitrary native errors.
    const code = error instanceof Error && ['needs_canvas_bridge', 'pixel_budget', 'source_size_budget', 'unsupported_image', 'invalid_recipe'].includes(error.message) ? error.message : 'preparation_failed';
    scope.postMessage({ id: request.id, ok: false, code } satisfies ScanResponse);
  } finally { busy = false; }
};
