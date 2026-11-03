import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRegradingContext, marcarRevisionManual, reprocessGrade } from './api';

const transport = vi.hoisted(() => ({ patch: vi.fn(), get: vi.fn(), post: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('manual grading review API', () => {
  it('marks the grade for manual review without sending a replacement score', async () => {
    const grade = { id: 'grade-1', estado: 'requiere_revision', nota_sugerida: 4 };
    transport.patch.mockResolvedValue({ data: grade });

    await expect(
      marcarRevisionManual('grade-1', 'Comprobar el procedimiento.'),
    ).resolves.toBe(grade);

    expect(transport.patch).toHaveBeenCalledWith(
      '/calificaciones/grade-1/revision-manual',
      { motivo: 'Comprobar el procedimiento.' },
    );
    expect(transport.patch.mock.calls[0][1]).not.toHaveProperty('nota_confirmada');
  });
});

describe('140 explicit scoring context API', () => {
  it('reads the grading context without writing or submitting evidence', async () => {
    const context = { estado: 'puntajes_actualizados', cambios: [] };
    transport.get.mockResolvedValue({ data: context });
    await expect(getRegradingContext('grade-1')).resolves.toBe(context);
    expect(transport.get).toHaveBeenCalledWith('/calificaciones/grade-1/recalificacion-contexto');
    expect(transport.post).not.toHaveBeenCalled();
  });
  it('sends exactly the accepted target and fingerprint with the existing reopening fields', async () => {
    transport.post.mockResolvedValue({ data: { id: 'grade-1', estado: 'procesando' } });
    await reprocessGrade('grade-1', { requestId: 'request-1', version: '2026-11-03T00:00:00', confirmed: true,
      reason: '', useCurrentScores: true, targetScoreVersion: 'version-2', scoreContextFingerprint: 'a'.repeat(64) });
    const [url, body] = transport.post.mock.calls[0];
    expect(url).toBe('/calificaciones/grade-1/recalificar');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('usar_puntajes_actuales')).toBe('true');
    expect(body.get('version_puntajes_objetivo')).toBe('version-2');
    expect(body.get('contexto_puntajes_fingerprint')).toBe('a'.repeat(64));
    expect(body.get('confirmar_reapertura')).toBe('true');
    expect(body.has('motivo')).toBe(false);
    expect(body.has('foto')).toBe(false);
  });
  it('does not invent a new score acceptance for unchanged contexts', async () => {
    transport.post.mockResolvedValue({ data: { id: 'grade-1' } });
    await reprocessGrade('grade-1', { requestId: 'request-2', version: '2026-11-03T00:00:00', confirmed: false, reason: '' });
    const body = transport.post.mock.calls[0][1];
    expect(body.has('usar_puntajes_actuales')).toBe(false);
    expect(body.has('version_puntajes_objetivo')).toBe(false);
    expect(body.has('contexto_puntajes_fingerprint')).toBe(false);
  });
});
