import { afterEach, describe, expect, it, vi } from 'vitest';
import { publishAIConfiguration, restorePreviousConfiguration, saveFeatures, saveProviders, testProvider, updateGlobalAIConfig, type AIProvider } from './api';

const transport = vi.hoisted(() => ({ put: vi.fn(), patch: vi.fn(), post: vi.fn() }));

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

  it('tests the exact model and capability selected by the administrator', async () => {
    transport.post.mockResolvedValue({ data: { status: 'ok', detail: 'OK' } });

    await testProvider('open_code', { model: 'qwen3.7-plus', capability: 'vision' });

    expect(transport.post).toHaveBeenCalledWith('/admin/ai-providers/open_code/test', {
      model: 'qwen3.7-plus',
      capability: 'vision',
    });
  });

  it('publishes feature routes with the version the administrator reviewed', async () => {
    transport.put.mockResolvedValue({ data: { status: 'ok' } });
    await saveFeatures([{
      feature: 'calificacion_foto', label: 'Calificación por foto', capability: 'vision',
      primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null,
      rollout_enabled: true, config_version: 4, active: true,
    }], 4);
    expect(transport.put).toHaveBeenCalledWith('/admin/ai-features', {
      expected_version: 4,
      features: [expect.objectContaining({ primary_model: 'qwen3.7-plus', rollout_enabled: true })],
    });
  });

  it('publishes providers, models and routes atomically', async () => {
    transport.put.mockResolvedValue({ data: { status: 'ok', version: 5 } });
    await publishAIConfiguration(
      [{ id: 'open_code', name: 'OpenCode', tipo: 'texto', label: 'OpenCode', base_url: null, model: 'qwen3.7-plus', active: true, priority: 1, timeout_seconds: 60, max_retries: 2 }],
      [{ provider_id: 'open_code', model_id: 'qwen3.7-plus', label: 'Qwen', capabilities: ['vision'], recommended: true, active: true }],
      [{ feature: 'calificacion_foto', label: 'Foto', capability: 'vision', primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null, active: true }],
      4,
    );
    expect(transport.put).toHaveBeenCalledWith('/admin/ai-settings/publish', expect.objectContaining({
      expected_version: 4,
      models: [expect.objectContaining({ model_id: 'qwen3.7-plus', active: true })],
    }));
  });

  it('restores the previous published configuration', async () => {
    transport.post.mockResolvedValue({ data: { status: 'ok', version: 6 } });
    await restorePreviousConfiguration();
    expect(transport.post).toHaveBeenCalledWith('/admin/ai-settings/restore-previous');
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
