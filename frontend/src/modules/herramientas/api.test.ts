import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToolCatalog } from './api';

const transport = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('tool catalogue API', () => {
  it('reads the canonical availability catalogue used by the creation screen', async () => {
    transport.get.mockResolvedValue({ data: [{ tool_id: 'unir_columnas', aliases: ['emparejar'], generation_enabled: true }] });

    const result = await getToolCatalog();

    expect(transport.get).toHaveBeenCalledWith('/herramientas/catalogo');
    expect(result).toHaveLength(1);
    expect(result[0].tool_id).toBe('unir_columnas');
  });
});
