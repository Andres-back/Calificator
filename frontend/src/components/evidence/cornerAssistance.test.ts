import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCornerAssistant, createOrientationAssistant } from './cornerAssistance';

const http = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: http }));
const quad = [[.1, .1], [.9, .1], [.9, .9], [.1, .9]];
const image = { blob: new Blob(['stripped-preview']), sha256: 'a'.repeat(64), width: 80, height: 120 };

beforeEach(() => {
  http.post.mockReset(); http.get.mockReset();
  http.post.mockImplementation(async (_url: string, form: FormData) => ({ data: {
    request_id: form.get('solicitud_id'), image_sha256: image.sha256, state: 'proposed', corners: quad,
  } }));
});

describe('ayuda de esquinas sin claves ni imágenes en caché', () => {
  it('usa el contexto correcto y reutiliza la geometría sin otro POST', async () => {
    const ask = createCornerAssistant('evaluation-a', 'student-a', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), new AbortController().signal)).toEqual(quad);
    expect(await ask(new Blob(), new AbortController().signal)).toEqual(quad);
    expect(http.post).toHaveBeenCalledOnce();
    const form = http.post.mock.calls[0][1] as FormData;
    expect(form.get('evaluacion_id')).toBe('evaluation-a');
    expect(form.get('estudiante_id')).toBe('student-a');
    expect(form.get('image_sha256')).toBe(image.sha256);
    expect(form.get('imagen')).toBeInstanceOf(Blob);
  });
  it.each([
    { image_sha256: 'b'.repeat(64) }, { request_id: 'other-request' },
    { corners: [[100, 100], [900, 100], [900, 900], [100, 900]] },
  ])('rechaza identidad o escala ajena sin reintentar', async (changes) => {
    http.post.mockImplementationOnce(async (_url: string, form: FormData) => ({ data: {
      request_id: form.get('solicitud_id'), image_sha256: image.sha256, state: 'proposed', corners: quad, ...changes,
    } }));
    const ask = createCornerAssistant('evaluation', 'student', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), new AbortController().signal)).toBeNull();
    expect(http.post).toHaveBeenCalledOnce();
  });
  it('un POST sin acuse no se repite al volver a abrir la foto', async () => {
    http.post.mockRejectedValueOnce(new Error('unknown network state'));
    http.get.mockResolvedValue({ data: { state: 'unavailable' } });
    const ask = createCornerAssistant('evaluation', 'student', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), new AbortController().signal)).toBeNull();
    expect(await ask(new Blob(), new AbortController().signal)).toBeNull();
    expect(http.post).toHaveBeenCalledOnce();
  });
  it('no envía nada si se cancela antes de preparar la vista', async () => {
    const controller = new AbortController(); controller.abort();
    const ask = createCornerAssistant('evaluation', 'student', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), controller.signal)).toBeNull();
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('187 ayuda de giro', () => {
  it('pide la orientación en su propia ruta y acepta solo 0, 90, 180 o 270', async () => {
    http.post.mockImplementation(async (_url: string, form: FormData) => ({ data: {
      request_id: form.get('solicitud_id'), image_sha256: image.sha256, state: 'proposed', rotacion: 270,
    } }));
    const ask = createOrientationAssistant('evaluation-a', 'student-a', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), new AbortController().signal)).toBe(270);
    expect(await ask(new Blob(), new AbortController().signal)).toBe(270);
    expect(http.post).toHaveBeenCalledOnce();
    expect(http.post.mock.calls[0][0]).toBe('/calificaciones/sugerir-orientacion');
  });
  it.each([{ rotacion: 45 }, { rotacion: '90' }, { state: 'abstained' }, { image_sha256: 'b'.repeat(64) }])('rechaza una respuesta inválida o ajena', async (changes) => {
    http.post.mockImplementationOnce(async (_url: string, form: FormData) => ({ data: {
      request_id: form.get('solicitud_id'), image_sha256: image.sha256, state: 'proposed', rotacion: 90, ...changes,
    } }));
    const ask = createOrientationAssistant('evaluation', 'student', vi.fn().mockResolvedValue(image));
    expect(await ask(new Blob(), new AbortController().signal)).toBeNull();
  });
});

