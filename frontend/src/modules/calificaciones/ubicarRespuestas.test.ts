import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: http, default: http }));

import { ubicarRespuestas } from './api';

describe('175 ubicar respuestas en la hoja', () => {
  beforeEach(() => { http.post.mockReset(); });

  it('pide la ubicación de la nota sin enviar datos y espera más que una petición normal', async () => {
    const result = { ubicadas: 3, pendientes: 1, intentos: 1, intentos_maximos: 2 };
    http.post.mockResolvedValue({ data: result });

    await expect(ubicarRespuestas('c1')).resolves.toEqual(result);

    expect(http.post).toHaveBeenCalledWith('/calificaciones/c1/ubicar-respuestas', undefined, { timeout: 65_000 });
  });
});
