import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AdminAIConfigPage } from './AdminAIConfigPage';
import type { AISettings } from './api';

const adminApi = vi.hoisted(() => ({
  clearCache: vi.fn(),
  getAIAudit: vi.fn(),
  getAIControlCenter: vi.fn(),
  getAIControlCenterUsage: vi.fn(),
  getAISettings: vi.fn(),
  getConfigHash: vi.fn(),
  restoreDefaults: vi.fn(),
  restorePreviousConfiguration: vi.fn(),
  publishAIConfiguration: vi.fn(),
  publishAIControlCenter: vi.fn(),
  validateAIControlCenter: vi.fn(),
  refreshGlobalOllamaModels: vi.fn(),
  saveFeatures: vi.fn(),
  saveProviders: vi.fn(),
  testProvider: vi.fn(),
  updateGlobalAIConfig: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  toast: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./api', () => adminApi);
vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastMocks.toast, {
    success: toastMocks.success,
    error: toastMocks.error,
  }),
}));

const settings: AISettings = {
  version: 4,
  providers: [
    {
      id: 'open_code',
      name: 'Open Code',
      tipo: 'texto',
      label: 'Open Code',
      base_url: null,
      model: 'modelo-inicial',
      active: true,
      priority: 1,
      timeout_seconds: 30,
      max_retries: 1,
      auth_configured: true,
    },
  ],
  models: [
    {
      provider_id: 'open_code',
      model_id: 'qwen3.7-plus',
      label: 'Qwen 3.7 Plus',
      capabilities: ['text', 'vision'],
      recommended: true,
      active: true,
    },
  ],
  features: [
    {
      feature: 'calificacion.valoracion',
      label: 'Valoración principal',
      capability: 'text',
      primary_provider: 'open_code',
      primary_model: 'qwen3.7-plus',
      fallback_provider: null,
      rollout_enabled: false,
      active: true,
    },
  ],
  global_config: {
    modelo_llm_default: 'modelo-inicial',
    has_openai_key: true,
    has_cloudflare: false,
    has_groq_key: false,
    has_open_code_key: true,
    has_ollama_key: false,
    cloudflare_account_id: null,
    credential_sources: {
      openai: 'database',
      groq: 'not_configured',
      open_code: 'environment',
      ollama: 'not_configured',
      cloudflare: 'not_configured',
    },
  },
  usage: {
    total_calls: 0,
    total_tokens_input: 0,
    total_tokens_output: 0,
    total_cost: 0,
    by_provider: [],
  },
};

const controlCenter = {
  version: 4,
  functions: [{
    function_id: 'calificacion', label: 'Calificación', stages: [{
      function_id: 'calificacion', function_label: 'Calificación', stage_id: 'grading_primary',
      label: 'Valoración principal', runtime_feature: 'calificacion.valoracion', capability: 'text',
      consumer: 'grading.primary_evaluator', condition: 'Siempre', editable: true,
      inherits_from: null, supported_providers: ['open_code'],
      configured: { provider: 'open_code', model: 'qwen3.7-plus', fallback_provider: null, fallback_model: null, teacher_override_allowed: false, config_version: 4 },
      effective: { provider: 'open_code', model: 'qwen3.7-plus', fallback_provider: null, fallback_model: null, teacher_override_allowed: false, config_version: 4 },
      observed: null,
    }],
  }],
  tools: [{ tool_id: 'taller', label: 'Taller', category: 'Material', description: 'Práctica gradual.', aliases: [], uses_ai: true, uses_image_ai: false, generation_enabled: true, unavailable_reason: null, pause_reason: null, config_version: 4, route_override: null, inherits_from: 'herramientas_educativas' }],
  providers: settings.providers,
  models: settings.models,
  deployment: { provider_max_concurrency: 3, slow_warning_seconds: 120, managed_by: 'deployment', editable: false },
};

function apiFailure(status: number, detail: string) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { detail },
      status,
      statusText: 'Error',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    },
  );
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AdminAIConfigPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  adminApi.getAISettings.mockResolvedValue(settings);
  adminApi.getConfigHash.mockResolvedValue({
    backend_hash: 'backend',
    worker_hash: 'worker',
    consistent: true,
    backend_source: 'db',
    worker_source: 'db',
    worker_error: null,
  });
  adminApi.getAIAudit.mockResolvedValue({ total: 0, limit: 6, offset: 0, logs: [] });
  adminApi.getAIControlCenter.mockResolvedValue(controlCenter);
  adminApi.getAIControlCenterUsage.mockResolvedValue({ period_days: 30, from: '', to: '', sample_size: 0, rows: [] });
  adminApi.saveProviders.mockResolvedValue({ status: 'ok' });
  adminApi.saveFeatures.mockResolvedValue({ status: 'ok' });
  adminApi.restoreDefaults.mockResolvedValue({ status: 'ok' });
  adminApi.restorePreviousConfiguration.mockResolvedValue({ status: 'ok', version: 5 });
  adminApi.publishAIConfiguration.mockResolvedValue({ status: 'ok', version: 5 });
  adminApi.publishAIControlCenter.mockResolvedValue({ status: 'ok', version: 5 });
  adminApi.validateAIControlCenter.mockResolvedValue({ valid: true, errors: [], warnings: [] });
  adminApi.refreshGlobalOllamaModels.mockResolvedValue([]);
  adminApi.clearCache.mockResolvedValue({ status: 'ok' });
  adminApi.testProvider.mockResolvedValue({ status: 'ok', latency_ms: 1, http_code: 200, error: null, detail: 'OK' });
  adminApi.updateGlobalAIConfig.mockResolvedValue({ status: 'updated' });
});

describe('AdminAIConfigPage', () => {
  it('saves an edited stage only after validation and confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('Permitir API del docente'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));

    await waitFor(() => {
      expect(adminApi.publishAIControlCenter).toHaveBeenCalledWith(
        settings.providers,
        settings.models,
        [expect.objectContaining({ feature: 'calificacion.valoracion', rollout_enabled: true })],
        controlCenter.tools,
        4,
      );
    });
  });

  it('pauses new generations with an explicit reason', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Herramientas' }));
    await user.click(await screen.findByRole('checkbox', { name: /Nuevas generaciones/ }));
    await user.type(screen.getByLabelText('Motivo de la pausa'), 'Mantenimiento programado');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));
    await waitFor(() => expect(adminApi.publishAIControlCenter).toHaveBeenCalledWith(
      settings.providers, settings.models, settings.features,
      [expect.objectContaining({ tool_id: 'taller', generation_enabled: false, pause_reason: 'Mantenimiento programado' })], 4,
    ));
  });

  it('restores the previous version only after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Open Code');
    await user.click(screen.getByRole('button', { name: 'Restaurar versión anterior' }));
    await user.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(adminApi.restorePreviousConfiguration).toHaveBeenCalledTimes(1));
  });

  it('shows a friendly backend validation message for a 422 save failure', async () => {
    adminApi.publishAIControlCenter.mockRejectedValueOnce(apiFailure(422, 'Modelo no permitido'));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByLabelText('Permitir API del docente'));
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith('Modelo no permitido'));
  });

  it('keeps the draft when another administrator publishes first', async () => {
    adminApi.publishAIControlCenter.mockRejectedValueOnce(apiFailure(409, 'La configuración cambió en otra sesión.'));
    const user = userEvent.setup();
    renderPage();

    const override = await screen.findByLabelText('Permitir API del docente');
    await user.click(override);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith('La configuración cambió en otra sesión.'));
    expect(override).toBeChecked();
    expect(screen.getByText('Cambios sin guardar')).toBeVisible();
  });

  it('saves a new provider credential without displaying the stored value', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Proveedores y claves' }));

    const groqInput = await screen.findByPlaceholderText('gsk_...');
    await user.type(groqInput, 'gsk-new-secret');
    await user.click(screen.getByRole('button', { name: 'Guardar credenciales' }));

    await waitFor(() => expect(adminApi.updateGlobalAIConfig).toHaveBeenCalledWith({ groq_key: 'gsk-new-secret' }));
    expect(groqInput).toHaveValue('');
  });

  it('saves Ollama Cloud credentials and refreshes its discovered models', async () => {
    const user = userEvent.setup();
    adminApi.getAISettings.mockResolvedValue({
      ...settings,
      global_config: {
        ...settings.global_config,
        has_ollama_key: true,
        credential_sources: { ...settings.global_config.credential_sources, ollama: 'database' },
      },
    });
    adminApi.refreshGlobalOllamaModels.mockResolvedValue([settings.models![0]]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Proveedores y claves' }));

    const input = await screen.findByPlaceholderText('Clave de Ollama Cloud');
    await user.type(input, 'ollama-synthetic-key');
    await user.click(screen.getByRole('button', { name: 'Guardar credenciales' }));
    await waitFor(() => expect(adminApi.updateGlobalAIConfig).toHaveBeenCalledWith({ ollama_key: 'ollama-synthetic-key' }));
    expect(input).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Actualizar modelos' }));
    await waitFor(() => expect(adminApi.refreshGlobalOllamaModels).toHaveBeenCalled());
  });
});
