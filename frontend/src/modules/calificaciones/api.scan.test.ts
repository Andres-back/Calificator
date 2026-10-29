import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calificarFoto, getEvidenceScanCapability, reprocessGrade } from './api';
import type { ScanSubmission } from '@/components/evidence/scanSubmission';

const calls = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: calls }));
const submission: ScanSubmission = { schema_version: 1, pages: [{ page_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', revision: 0, decision: 'original', rotation: 90, confirmed: true }] };
beforeEach(() => { vi.clearAllMocks(); calls.post.mockResolvedValue({ data: { id: 'synthetic-grade' } }); calls.get.mockResolvedValue({ data: { enabled: false } }); });

describe('scan admission API', () => {
  it('uploads raw originals exactly once with request/recipe, without legacy recompression parameters', async () => {
    const source = new File(['RAW-SOURCE'], 'camera.png', { type: 'image/png' });
    await calificarFoto('e1', 's1', [source], [], { requestId: 'request-1', submission });
    const body = calls.post.mock.calls[0][1] as FormData;
    expect(body.getAll('foto')).toHaveLength(1);
    expect((body.get('foto') as File).size).toBe(source.size);
    expect(body.get('solicitud_id')).toBe('request-1');
    expect(JSON.parse(String(body.get('escaneo')))).toEqual(submission);
    expect(body.has('rotaciones')).toBe(false);
    expect([...body.keys()].sort()).toEqual(['escaneo', 'estudiante_id', 'evaluacion_id', 'foto', 'solicitud_id']);
  });
  it('uses the same reviewed contract for replacement and keeps ordinary regrading image-free', async () => {
    const file = new File(['RAW'], 'source.png', { type: 'image/png' });
    const base = { requestId: 'intent', version: '2026-10-27T12:00:00Z', confirmed: true, reason: '' };
    await reprocessGrade('c1', { ...base, files: [file], scan: submission });
    const body = calls.post.mock.calls[0][1] as FormData;
    expect(body.has('escaneo')).toBe(true);
    expect(body.has('rotaciones')).toBe(false);
    expect(body.getAll('foto')).toHaveLength(1);
    await reprocessGrade('c1', base);
    const retry = calls.post.mock.calls[1][1] as FormData;
    expect(retry.has('foto')).toBe(false);
    expect(retry.has('escaneo')).toBe(false);
  });
  it('binds capability to academic context and propagates cancellation', async () => {
    const controller = new AbortController();
    await getEvidenceScanCapability('e1', 's1', controller.signal);
    expect(calls.get).toHaveBeenCalledWith('/calificaciones/capacidades-evidencia', {
      params: { evaluacion_id: 'e1', estudiante_id: 's1' }, signal: controller.signal,
    });
  });
});
