import { Blob as NodeBlob } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEvaluationDocument } from './api';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { get: mocks.get } }));

beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('Blob', NodeBlob); });
afterEach(() => vi.unstubAllGlobals());

describe('evaluation document API', () => {
  it('uses authenticated shared API with format, version and abort signal', async () => {
    const file = new Blob(['word'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    mocks.get.mockResolvedValue({ data: file });
    const controller = new AbortController();
    expect(await getEvaluationDocument('evaluation', 'docx', true, controller.signal)).toBe(file);
    expect(mocks.get).toHaveBeenCalledWith('/evaluaciones/evaluation/docx', {
      params: { soluciones: true }, responseType: 'blob', signal: controller.signal,
    });
  });

  it('recovers JSON error detail received as Blob without losing the HTTP error', async () => {
    const failure = { response: { status: 422, data: new Blob([JSON.stringify({ detail: 'Usa el PDF para conservar el dibujo' })]) } };
    mocks.get.mockRejectedValue(failure);
    await expect(getEvaluationDocument('evaluation', 'docx')).rejects.toBe(failure);
    expect(failure.response.data).toEqual({ detail: 'Usa el PDF para conservar el dibujo' });
  });

  it('preserves an original HTTP error when its body is not JSON', async () => {
    const failure = { response: { status: 500, data: new Blob(['upstream unavailable']) } };
    mocks.get.mockRejectedValue(failure);
    await expect(getEvaluationDocument('evaluation', 'pdf')).rejects.toBe(failure);
  });
});
