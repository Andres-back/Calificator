import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPublicFeedbackClient, FeedbackAccessError } from './publicApi';

afterEach(() => vi.unstubAllGlobals());
const token = 'a'.repeat(43);

describe('cliente individual sin sesión de plataforma', () => {
  it('envía credencial solo en cabecera y omite cookies, caché y referrer', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ resultado: {} })));
    vi.stubGlobal('fetch', fetcher);
    await createPublicFeedbackClient(token).read();
    expect(fetcher).toHaveBeenCalledWith('/api/public/devolucion', expect.objectContaining({
      credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
    }));
    expect(fetcher.mock.calls[0][0]).not.toContain(token);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('reintento explícito conserva request_id y no añade identidad en payload', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response('{}', { status: 202 }));
    vi.stubGlobal('fetch', fetcher);
    const client = createPublicFeedbackClient(token);
    await client.ask('00000000-0000-4000-8000-000000000001', '¿Cómo practico?');
    await client.ask('00000000-0000-4000-8000-000000000001', '¿Cómo practico?');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ request_id: '00000000-0000-4000-8000-000000000001', mensaje: '¿Cómo practico?' });
  });

  it('normaliza cierre sin revelar errores del servidor ni credencial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(`secret ${token}`, { status: 404 })));
    await expect(createPublicFeedbackClient(token).read()).rejects.toMatchObject({ status: 404, message: 'Este enlace no está disponible. Pide a tu profesor que lo revise.' });
  });

  it('expone espera del servidor sin consumir otra petición', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': '37' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(createPublicFeedbackClient(token).ask('id', 'Pregunta')).rejects.toMatchObject({ status: 429, retryAfter: 37 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('rechaza una credencial mal formada sin solicitud', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(() => createPublicFeedbackClient('Bearer <jwt>')).toThrow(FeedbackAccessError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fallo de red no se reintenta ni incluye URL/contenido técnico', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error(`network ${token}`));
    vi.stubGlobal('fetch', fetcher);
    await expect(createPublicFeedbackClient(token).read()).rejects.toMatchObject({ status: 0, message: 'No pudimos conectar. Comprueba tu conexión e inténtalo de nuevo.' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('obtiene evidencia con la misma credencial en cabecera, no una URL pública permanente', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('synthetic', { headers: { 'Content-Type': 'image/png', 'X-Evidence-Pages': '2' } }));
    vi.stubGlobal('fetch', fetcher);
    const result = await createPublicFeedbackClient(token).evidence(1);
    expect(result.pages).toBe(2);
    expect(await result.blob.text()).toBe('synthetic');
    expect(fetcher.mock.calls[0][0]).toBe('/api/public/devolucion/evidencia/1');
    expect(fetcher.mock.calls[0][1].credentials).toBe('omit');
  });
});
