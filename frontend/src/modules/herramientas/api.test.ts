import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToolCatalog, listMaterials } from './api';

const transport = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('tool catalogue API', () => {
  it('passes explicit pagination without changing the legacy type argument', async () => {
    transport.get.mockResolvedValue({ data: [] });
    await listMaterials(undefined, { limit: 50, offset: 100 });
    expect(transport.get).toHaveBeenCalledWith('/herramientas', { params: { limit: 50, offset: 100 } });
    await listMaterials('guia');
    expect(transport.get).toHaveBeenLastCalledWith('/herramientas', { params: { tipo: 'guia' } });
  });
  it('reads the canonical availability catalogue used by the creation screen', async () => {
    transport.get.mockResolvedValue({ data: [{ tool_id: 'unir_columnas', aliases: ['emparejar'], generation_enabled: true }] });

    const result = await getToolCatalog();

    expect(transport.get).toHaveBeenCalledWith('/herramientas/catalogo');
    expect(result).toHaveLength(1);
    expect(result[0].tool_id).toBe('unir_columnas');
  });
});
