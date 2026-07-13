import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { AdminAIConfigPage } from './AdminAIConfigPage';
import type { AISettings } from './api';

const adminApi = vi.hoisted(() => ({
  clearCache: vi.fn(),
  getAIAudit: vi.fn(),
  getAISettings: vi.fn(),
  getConfigHash: vi.fn(),
  restoreDefaults: vi.fn(),
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
  features: [
    {
      feature: 'chat',
      label: 'Chat',
      primary_provider: 'open_code',
      fallback_provider: null,
      active: true,
    },
  ],
  global_config: {
    modelo_llm_default: 'modelo-inicial',
    has_openai_key: true,
    has_cloudflare: false,
    has_groq_key: false,
    has_open_code_key: true,
    cloudflare_account_id: null,
    credential_sources: {
      openai: 'database',
      groq: 'not_configured',
      open_code: 'environment',
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
    <QueryClientProvider client={client}>
      <AdminAIConfigPage />
    </QueryClientProvider>,
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
  adminApi.saveProviders.mockResolvedValue({ status: 'ok' });
  adminApi.saveFeatures.mockResolvedValue({ status: 'ok' });
  adminApi.restoreDefaults.mockResolvedValue({ status: 'ok' });
  adminApi.clearCache.mockResolvedValue({ status: 'ok' });
  adminApi.testProvider.mockResolvedValue({ status: 'ok', latency_ms: 1, http_code: 200, error: null, detail: 'OK' });
  adminApi.updateGlobalAIConfig.mockResolvedValue({ status: 'updated' });
});

describe('AdminAIConfigPage', () => {
  it('saves an edited provider only after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    const modelInput = await screen.findByLabelText('Modelo');
    await user.clear(modelInput);
    await user.type(modelInput, 'modelo-nuevo');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));

    await waitFor(() => {
      expect(adminApi.saveProviders).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'open_code', model: 'modelo-nuevo' }),
      ]);
    });
  });

  it('restores defaults only after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Open Code');
    await user.click(screen.getByRole('button', { name: 'Restaurar valores' }));
    await user.click(await screen.findByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(adminApi.restoreDefaults).toHaveBeenCalledTimes(1));
  });

  it('shows a friendly backend validation message for a 422 save failure', async () => {
    adminApi.saveProviders.mockRejectedValueOnce(apiFailure(422, 'Modelo no permitido'));
    const user = userEvent.setup();
    renderPage();

    const modelInput = await screen.findByLabelText('Modelo');
    await user.clear(modelInput);
    await user.type(modelInput, 'modelo-invalido');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await user.click(await screen.findByRole('button', { name: /Guardar configuraci.n/ }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith('Modelo no permitido'));
  });

  it('saves a new provider credential without displaying the stored value', async () => {
    const user = userEvent.setup();
    renderPage();

    const groqInput = await screen.findByPlaceholderText('gsk_...');
    await user.type(groqInput, 'gsk-new-secret');
    await user.click(screen.getByRole('button', { name: 'Guardar credenciales' }));

    await waitFor(() => expect(adminApi.updateGlobalAIConfig).toHaveBeenCalledWith({ groq_key: 'gsk-new-secret' }));
    expect(groqInput).toHaveValue('');
  });
});
