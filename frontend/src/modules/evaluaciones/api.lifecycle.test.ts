import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activarRecepcionEvaluacion,
  cerrarEvaluacion,
  deleteEvaluacion,
  getMiEntrega,
  pausarRecepcionEvaluacion,
  publicarEvaluacion,
} from './api';


const transport = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());


describe('evaluation lifecycle API', () => {
  it('uses one evaluation resource for publish, pause, reactivate, close and delete', async () => {
    const evaluation = { id: 'evaluation-1' };
    transport.post.mockResolvedValue({ data: evaluation });
    transport.delete.mockResolvedValue({ data: undefined });

    await expect(publicarEvaluacion('evaluation-1')).resolves.toBe(evaluation);
    await expect(pausarRecepcionEvaluacion('evaluation-1')).resolves.toBe(evaluation);
    await expect(activarRecepcionEvaluacion('evaluation-1')).resolves.toBe(evaluation);
    await expect(cerrarEvaluacion('evaluation-1')).resolves.toBe(evaluation);
    await expect(deleteEvaluacion('evaluation-1')).resolves.toBeUndefined();

    expect(transport.post.mock.calls.map(([path]) => path)).toEqual([
      '/evaluaciones/evaluation-1/publicar',
      '/evaluaciones/evaluation-1/pausar-recepcion',
      '/evaluaciones/evaluation-1/activar-recepcion',
      '/evaluaciones/evaluation-1/cerrar',
    ]);
    expect(transport.delete).toHaveBeenCalledWith('/evaluaciones/evaluation-1');
  });

  it('returns the current student delivery and treats a missing delivery as null', async () => {
    const delivery = { id: 'delivery-1' };
    transport.get.mockResolvedValueOnce({ data: delivery });

    await expect(getMiEntrega('evaluation-1')).resolves.toBe(delivery);
    expect(transport.get).toHaveBeenLastCalledWith(
      '/evaluaciones/evaluation-1/mi-entrega',
    );

    transport.get.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(getMiEntrega('evaluation-1')).resolves.toBeNull();
  });

  it('does not hide delivery lookup failures other than not-found', async () => {
    const failure = { response: { status: 503 } };
    transport.get.mockRejectedValueOnce(failure);

    await expect(getMiEntrega('evaluation-1')).rejects.toBe(failure);
  });
});
