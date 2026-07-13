import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveProviders, updateGlobalAIConfig, type AIProvider } from './api';

const transport = vi.hoisted(() => ({ put: vi.fn(), patch: vi.fn() }));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('saveProviders', () => {
  it('sends only the persistible provider fields and never serializes credentials', async () => {
    transport.put.mockResolvedValue({ data: { status: 'ok' } });
    const provider = {
      id: 'open_code',
      name: 'Open Code',
      tipo: 'texto',
      label: 'Open Code',
      base_url: 'https://provider.example.test',
      model: 'modelo',
      active: true,
      priority: 1,
      timeout_seconds: 30,
      max_retries: 1,
      auth_configured: true,
      api_key: 'secret-value',
    } as AIProvider & { api_key: string };

    await saveProviders([provider]);

    const [, payload] = transport.put.mock.calls[0] as [string, Array<Record<string, unknown>>];
    expect(transport.put).toHaveBeenCalledWith('/admin/ai-providers', [
      {
        id: 'open_code',
        tipo: 'texto',
        label: 'Open Code',
        base_url: 'https://provider.example.test',
        model: 'modelo',
        active: true,
        priority: 1,
        timeout_seconds: 30,
        max_retries: 1,
      },
    ]);
    expect(payload[0]).not.toHaveProperty('api_key');
    expect(payload[0]).not.toHaveProperty('auth_configured');
    expect(JSON.stringify(payload)).not.toContain('secret-value');
  });

  it('uses the dedicated global config endpoint for credential updates', async () => {
    transport.patch.mockResolvedValue({ data: { status: 'updated' } });

    await updateGlobalAIConfig({ groq_key: 'gsk-secret', modelo_llm_default: 'llama' });

    expect(transport.patch).toHaveBeenCalledWith('/admin/ai-config', {
      groq_key: 'gsk-secret',
      modelo_llm_default: 'llama',
    });
  });
});
