import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TeacherAIConfigPage } from './TeacherAIConfigPage';

const teacherApi = vi.hoisted(() => ({
  createOllamaPairingCode: vi.fn(),
  deleteTeacherCredential: vi.fn(),
  getOllamaConnectors: vi.fn(),
  getTeacherOllamaModels: vi.fn(),
  getTeacherAIConfig: vi.fn(),
  refreshTeacherOllamaModels: vi.fn(),
  revokeOllamaConnector: vi.fn(),
  saveTeacherAIConfig: vi.fn(),
  saveTeacherCredential: vi.fn(),
  testTeacherProvider: vi.fn(),
}));

vi.mock('./api', () => teacherApi);
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const config = {
  mode: 'institutional' as const,
  allow_institutional_fallback: true,
  active: true,
  version: 2,
  providers: [{
    id: 'open_code', name: 'open_code', tipo: 'texto', label: 'OpenCode', base_url: null,
    model: 'qwen3.7-plus', active: true, priority: 1, timeout_seconds: 60, max_retries: 2,
  }],
  models: [{
    provider_id: 'open_code', model_id: 'qwen3.7-plus', label: 'Qwen 3.7 Plus',
    capabilities: ['text', 'vision'], recommended: true, active: true,
  }],
  features: [{
    feature: 'calificacion_foto', label: 'Calificación por foto', capability: 'vision',
    primary_provider: 'open_code', primary_model: 'qwen3.7-plus', fallback_provider: null,
    rollout_enabled: true, active: true,
  }],
  credentials: [{ provider_id: 'open_code', configured: true, last_four: '1234' }],
  preferences: [],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}><TeacherAIConfigPage /></QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  teacherApi.getTeacherAIConfig.mockResolvedValue(config);
  teacherApi.getOllamaConnectors.mockResolvedValue([]);
  teacherApi.getTeacherOllamaModels.mockResolvedValue([]);
  teacherApi.refreshTeacherOllamaModels.mockResolvedValue([]);
  teacherApi.createOllamaPairingCode.mockResolvedValue({ code: 'ABCD-EFGH', expires_at: '2026-08-30T23:59:00Z' });
  teacherApi.revokeOllamaConnector.mockResolvedValue(undefined);
  teacherApi.saveTeacherAIConfig.mockResolvedValue(config);
  teacherApi.saveTeacherCredential.mockResolvedValue({ status: 'updated' });
  teacherApi.testTeacherProvider.mockResolvedValue({ status: 'ok', detail: 'Conexión exitosa' });
});

describe('TeacherAIConfigPage', () => {
  it('starts with the safe institutional mode and does not render any secret', async () => {
    renderPage();
    expect(await screen.findByRole('button', { name: /Usar IA de la institución/ })).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelector('[data-educational-icon="ai-institutional"]')).toBeInTheDocument();
    expect(document.querySelector('[data-educational-icon="ai-own-key"]')).toBeInTheDocument();
    expect(document.querySelector('[data-educational-icon="ai-routing"]')).toBeInTheDocument();
    expect(screen.queryByLabelText('Sustituir clave')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('teacher-secret');
  });

  it('shows only masked credential metadata and can test the stored key', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Usar mi API automáticamente/ }));
    expect(await screen.findByText('Configurada ····1234')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Probar' }));
    await waitFor(() => expect(teacherApi.testTeacherProvider).toHaveBeenCalledWith('open_code', {}));
  });

  it('supports advanced per-feature selection and explicit fallback consent', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Personalizar por función/ }));
    expect(await screen.findByText('Configuración avanzada por función')).toBeInTheDocument();
    expect(screen.getByText('Calificación por foto')).toBeInTheDocument();
    const fallback = screen.getByRole('checkbox');
    expect(fallback).toBeChecked();
    await user.click(fallback);
    await user.click(screen.getByRole('button', { name: 'Guardar preferencias' }));
    await waitFor(() => expect(teacherApi.saveTeacherAIConfig).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'advanced', allow_institutional_fallback: false, expected_version: 2,
    })));
  });

  it('shows connector state, pairs a computer and allows revocation', async () => {
    const user = userEvent.setup();
    teacherApi.getOllamaConnectors.mockResolvedValue([{
      id: 'connector-1', name: 'Portátil del aula', platform: 'windows', version: '1.0.0',
      status: 'connected', active: true, last_seen_at: '2026-08-30T20:00:00Z',
      models: [{ model_id: 'qwen3:8b', capabilities: ['text'], available: true }],
    }]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Usar mi API automáticamente/ }));
    expect(await screen.findByText('Portátil del aula')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText(/Disponible para generar presentaciones/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Vincular computador/ }));
    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Revocar/ }));
    await waitFor(() => expect(teacherApi.revokeOllamaConnector.mock.calls[0][0]).toBe('connector-1'));
  });

  it('offers Ollama local for presentations but never for photo grading', async () => {
    const user = userEvent.setup();
    teacherApi.getTeacherAIConfig.mockResolvedValue({
      ...config,
      providers: [
        ...config.providers,
        {
          id: 'ollama_local', name: 'ollama_local', tipo: 'texto',
          label: 'Ollama local (este computador)', base_url: null, model: null,
          active: true, priority: 99, timeout_seconds: 0, max_retries: 0,
        },
      ],
      models: [
        ...config.models,
        {
          provider_id: 'ollama_local', model_id: 'qwen3:8b', label: 'qwen3:8b',
          capabilities: ['text'], recommended: false, active: true,
        },
      ],
      features: [
        ...config.features,
        {
          feature: 'presentaciones', label: 'Presentaciones', capability: 'text',
          primary_provider: 'open_code', primary_model: 'qwen3.7-plus',
          fallback_provider: null, rollout_enabled: true, active: true,
        },
      ],
    });
    teacherApi.getOllamaConnectors.mockResolvedValue([{
      id: 'connector-1', name: 'Equipo', platform: 'windows', version: '1.0.0',
      status: 'connected', active: true, last_seen_at: '2026-08-30T20:00:00Z',
      models: [{ model_id: 'qwen3:8b', capabilities: ['text'], available: true }],
    }]);
    renderPage();

    await user.click(await screen.findByRole('button', { name: /Personalizar por función/ }));
    const localOptions = await screen.findAllByRole('option', { name: 'Ollama local (este computador)' });
    expect(localOptions).toHaveLength(1);
    expect(screen.getByText(/nunca se envían al conector local/)).toBeInTheDocument();
  });
});
