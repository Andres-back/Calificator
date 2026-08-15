import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from './api';
import { surfaceForPath, trackEvent } from './analytics';

vi.mock('./api', () => ({
  api: {
    post: vi.fn(),
  },
}));

const post = vi.mocked(api.post);

describe('analytics event contract', () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({ data: { status: 'ok' } });
  });

  it('sends canonical references outside metadata and never sends identity or role', () => {
    trackEvent('calificacion_opened', {
      evaluacion_id: 'evaluation-1',
      calificacion_id: 'grade-1',
    });

    expect(post).toHaveBeenCalledWith('/analytics/evento', {
      tipo: 'calificacion_opened',
      evaluacion_id: 'evaluation-1',
      calificacion_id: 'grade-1',
    });
    const payload = post.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('actor_id');
    expect(payload).not.toHaveProperty('rol');
    expect(payload).not.toHaveProperty('user_id');
  });

  it('keeps allowed metadata scoped to its event', () => {
    trackEvent('workspace_opened', {
      evaluacion_id: 'evaluation-1',
      metadata_json: { materia_id: 'subject-1' },
    });
    trackEvent('batch_confirmed', {
      evaluacion_id: 'evaluation-1',
      metadata_json: { batch_size: 4 },
    });

    expect(post).toHaveBeenNthCalledWith(1, '/analytics/evento', {
      tipo: 'workspace_opened',
      evaluacion_id: 'evaluation-1',
      metadata_json: { materia_id: 'subject-1' },
    });
    expect(post).toHaveBeenNthCalledWith(2, '/analytics/evento', {
      tipo: 'batch_confirmed',
      evaluacion_id: 'evaluation-1',
      metadata_json: { batch_size: 4 },
    });
  });

  it('absorbs a rejected telemetry request without throwing into the academic flow', async () => {
    post.mockRejectedValueOnce(new Error('telemetry unavailable'));

    expect(() => {
      trackEvent('calificacion_confirmed', { evaluacion_id: 'evaluation-1' });
    }).not.toThrow();
    await Promise.resolve();

    expect(post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/app', 'inicio'],
    ['/app/materias/materia-1', 'materias'],
    ['/app/evaluaciones', 'actividades'],
    ['/app/calificaciones/boletin', 'resultados'],
    ['/app/calificaciones/workspace/grade-1', 'calificaciones'],
    ['/app/xali', 'xali'],
    ['/app/presentaciones', 'presentaciones'],
  ] as const)('maps %s to the closed surface %s', (path, surface) => {
    expect(surfaceForPath(path)).toBe(surface);
  });
});
