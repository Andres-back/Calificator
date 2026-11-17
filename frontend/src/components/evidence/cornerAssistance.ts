import { api } from '@/lib/api';
import { validScanQuad, type ScanQuad } from './scanGeometry';

export type CornerAssistant = (source: Blob, signal: AbortSignal) => Promise<ScanQuad | null>;
/** Spec 187: grados en sentido horario para que el texto de la hoja se lea derecho. */
export type ScanRotationAdvice = 0 | 90 | 180 | 270;
export type OrientationAssistant = (source: Blob, signal: AbortSignal) => Promise<ScanRotationAdvice | null>;
export interface CornerQueryImage { blob: Blob; sha256: string; width: number; height: number }
type Entry<T> = { id: string; at: number; completed: boolean; value: T | null };

/** Only a small, already EXIF-oriented local preview crosses this boundary. */
export async function prepareCornerQuery(source: Blob, signal: AbortSignal): Promise<CornerQueryImage> {
  if (signal.aborted || source.size > 10 * 1024 * 1024) throw new Error('unavailable');
  const bitmap = await createImageBitmap(source, { imageOrientation: 'none' });
  const canvas = document.createElement('canvas');
  try {
    if (signal.aborted || bitmap.width > 1600 || bitmap.height > 1600) throw new Error('unavailable');
    const ratio = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(2, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(2, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('unavailable');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('unavailable')), 'image/jpeg', .92));
    if (signal.aborted || blob.size > 1024 * 1024) throw new Error('unavailable');
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return { blob, width: canvas.width, height: canvas.height,
      sha256: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('') };
  } finally {
    bitmap.close(); canvas.width = 1; canvas.height = 1;
  }
}

function proposal(data: unknown, entry: Entry<unknown>, sha256: string): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const result = data as Record<string, unknown>;
  return result.request_id === entry.id && result.image_sha256 === sha256 && result.state === 'proposed' ? result : null;
}

function geometry(data: unknown, entry: Entry<ScanQuad>, sha256: string): ScanQuad | null {
  const result = proposal(data, entry, sha256);
  if (!result || !validScanQuad(result.corners)) return null;
  const [a, b, c, d] = result.corners;
  return a[1] + b[1] < c[1] + d[1] && a[0] + d[0] < b[0] + c[0] ? result.corners : null;
}

function pause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); };
    const timer = setTimeout(done, 750);
    signal.addEventListener('abort', done, { once: true });
    if (signal.aborted) done();
  });
}

/** Geometry-only, in-memory cache. An uncertain POST is queried, never replayed. */
function createAdvisor<T>(path: string, read: (data: unknown, entry: Entry<T>, sha256: string) => T | null,
  evaluationId: string, studentId: string, prepare: typeof prepareCornerQuery, actorScope: string) {
  const cache = new Map<string, Entry<T>>();
  return async (source: Blob, signal: AbortSignal): Promise<T | null> => {
    if (signal.aborted) return null;
    let entry: Entry<T> | undefined;
    try {
      const image = await prepare(source, signal);
      if (signal.aborted) return null;
      for (const [key, value] of cache) if (Date.now() - value.at >= 15 * 60_000) cache.delete(key);
      const key = `${actorScope}:${image.sha256}:${image.width}:${image.height}`;
      entry = cache.get(key);
      if (entry?.completed) return entry.value;
      const fresh = !entry;
      if (!entry) {
        if (cache.size >= 10) cache.delete(cache.keys().next().value!);
        entry = { id: crypto.randomUUID(), at: Date.now(), completed: false, value: null };
        cache.set(key, entry);
      }
      const params = { evaluacion_id: evaluationId, estudiante_id: studentId, image_sha256: image.sha256, width: image.width, height: image.height };
      const deadline = Date.now() + 20_000;
      let data: unknown;
      if (fresh) {
        const form = new FormData();
        Object.entries(params).forEach(([name, value]) => form.append(name, String(value)));
        form.append('solicitud_id', entry.id); form.append('imagen', image.blob, 'encuadre.jpg');
        ({ data } = await api.post(path, form, { signal, timeout: 20_000 }));
      } else {
        ({ data } = await api.get(`${path}/${entry.id}`, { params, signal, timeout: 5000 }));
      }
      for (let poll = 0; poll < 20 && !signal.aborted && Date.now() < deadline
        && data && typeof data === 'object' && (data as Record<string, unknown>).state === 'pending'; poll += 1) {
        await pause(signal);
        if (signal.aborted) return null;
        ({ data } = await api.get(`${path}/${entry.id}`, { params, signal, timeout: Math.max(1, Math.min(5000, deadline - Date.now())) }));
      }
      if (signal.aborted) return null;
      entry.value = read(data, entry, image.sha256);
      entry.completed = !data || typeof data !== 'object' || (data as Record<string, unknown>).state !== 'pending';
      return entry.value;
    } catch {
      // Keep an uncertain intention so reopening performs only GET, not another
      // potentially billed POST. Never surface provider bodies to the teacher.
      return null;
    }
  };
}

export function createCornerAssistant(evaluationId: string, studentId: string, prepare = prepareCornerQuery, actorScope = ''): CornerAssistant {
  return createAdvisor<ScanQuad>('/calificaciones/sugerir-bordes', geometry, evaluationId, studentId, prepare, actorScope);
}

const ROTATIONS: ScanRotationAdvice[] = [0, 90, 180, 270];

/** Spec 187: el servidor compara las cuatro vistas de la miniatura y elige la que se lee derecha. */
export function createOrientationAssistant(evaluationId: string, studentId: string, prepare = prepareCornerQuery, actorScope = ''): OrientationAssistant {
  return createAdvisor<ScanRotationAdvice>('/calificaciones/sugerir-orientacion', (data, entry, sha256) => {
    const rotation = proposal(data, entry, sha256)?.rotacion;
    return ROTATIONS.includes(rotation as ScanRotationAdvice) ? rotation as ScanRotationAdvice : null;
  }, evaluationId, studentId, prepare, actorScope);
}
