import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api';
import { collectionMotifs, motifFile } from './api';
import type { Motif } from './types';
vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }));
const motifs: Motif[] = Array.from({ length: 30 }, (_, i) => ({ id: `naturales-${i + 1}`, collection_id: 'naturales', label: 'Diseño', description: 'Ilustración', thumbnail_url: '', full_url: '/api/biblioteca-motivos/archivos/naturales-001/full/' + 'a'.repeat(64), width: 1024, height: 1024 }));
beforeEach(() => vi.resetAllMocks());
describe('curated metadata and files', () => {
  it('fetches three small pages for a mixed collection without loading images', async () => {
    vi.mocked(api.get).mockImplementation(async (_path, options) => {
      const offset = (options?.params as { offset?: number } | undefined)?.offset ?? 0;
      return { data: { catalog_version: '1', collection: 'naturales', total: 30, offset, limit: 12, items: motifs.slice(offset, offset + 12) } };
    });
    expect(await collectionMotifs('naturales')).toEqual(motifs);
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(vi.mocked(api.get).mock.calls.every(([path]) => path === '/biblioteca-motivos')).toBe(true);
  });
  it('rejects inconsistent versions instead of printing an incomplete mix', async () => {
    vi.mocked(api.get).mockImplementation(async (_path, options) => {
      const offset = (options?.params as { offset?: number } | undefined)?.offset ?? 0;
      return { data: { catalog_version: offset ? 'new' : 'old', collection: 'naturales', total: 30, offset, limit: 12, items: motifs.slice(offset, offset + 12) } };
    });
    await expect(collectionMotifs('naturales')).rejects.toThrow('La biblioteca se actualizó');
  });
  it('does not fetch external or private URLs for question insertion', async () => {
    await expect(motifFile({ ...motifs[0], full_url: 'https://example.test/private.png' })).rejects.toThrow();
    expect(api.get).not.toHaveBeenCalled();
  });
  it('checks image MIME and budget before creating an upload', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['not an image'], { type: 'text/html' }) });
    await expect(motifFile(motifs[0])).rejects.toThrow('No pudimos preparar');
    vi.mocked(api.get).mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }) });
    const file = await motifFile(motifs[0]);
    expect(file.name).toBe('naturales-1.png');
    expect(file.type).toBe('image/png');
  });
});
