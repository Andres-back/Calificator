import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: http, default: http }));

import { recalificarLote } from './api';

describe('174 recalificar en lote', () => {
  beforeEach(() => { http.post.mockReset(); });

  it('envía los identificadores a la ruta de lote y devuelve el resultado por entrega', async () => {
    const result = { results: [{ calificacion_id: 'a', success: true, error: null }, { calificacion_id: 'b', success: false, error: 'Ya revisaste esta nota.' }], total: 2, exitosos: 1, fallidos: 1 };
    http.post.mockResolvedValue({ data: result });

    await expect(recalificarLote(['a', 'b'])).resolves.toEqual(result);

    expect(http.post).toHaveBeenCalledWith('/calificaciones/lote/recalificar', { calificacion_ids: ['a', 'b'] });
  });
});
