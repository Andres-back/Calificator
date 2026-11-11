import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaudeConsoleSetup, type ClaudeConsoleSetupProps } from './ClaudeConsoleSetup';
import {
  prepareCompatibleConnection, probeCompatibleModel, publishAIControlCenter,
  type AIProvider,
} from '../../api';

vi.mock('../../api', () => ({
  prepareCompatibleConnection: vi.fn(), probeCompatibleModel: vi.fn(), publishAIControlCenter: vi.fn(),
}));

const originalProvider: AIProvider = {
  id: 'open_code', name: 'open_code', label: 'Existente', tipo: 'texto',
  base_url: 'https://gateway.example/v1', model: 'existing', active: true,
  priority: 1, timeout_seconds: 120, max_retries: 0,
};
const preparedProvider: AIProvider = {
  ...originalProvider, id: 'api_claude', name: 'api_claude', label: 'Claude Console',
  base_url: 'https://api.anthropic.com/v1', model: null, credential_revision: 'revision-cl', auth_configured: true,
};

function props(): ClaudeConsoleSetupProps {
  return {
    providers: [originalProvider],
    models: [{
      provider_id: 'open_code', model_id: 'existing', label: 'Modelo existente',
      capabilities: ['text'], active: true, recommended: true, verification_id: 'original-proof',
    }],
    features: [
      { feature: 'calificacion.extraccion', label: 'Leer', primary_provider: 'open_code', primary_model: 'vision', fallback_provider: null, active: true, capability: 'vision' },
      { feature: 'calificacion.valoracion', label: 'Calificar', primary_provider: 'open_code', primary_model: 'existing', fallback_provider: 'open_code', fallback_model: 'fallback', active: true, rollout_enabled: false, config_version: 9, capability: 'text' },
      { feature: 'calificacion.verificacion', label: 'Verificar', primary_provider: 'open_code', primary_model: 'verifier', fallback_provider: null, active: true },
      { feature: 'calificacion.revision_adicional', label: 'Revisar', primary_provider: 'open_code', primary_model: 'arbiter', fallback_provider: null, active: true },
    ],
    tools: [{ tool_id: 'test-tool', label: 'Herramienta', category: 'test', description: 'Existente', aliases: [], uses_ai: true, uses_image_ai: false, generation_enabled: false, unavailable_reason: null, pause_reason: 'Pausa actual', config_version: 4, route_override: null, inherits_from: null }],
    expectedVersion: 9,
    onSaved: vi.fn(),
  };
}

async function enterKeyAndSave(key = 'synthetic-claude-key') {
  await userEvent.type(screen.getByLabelText('Clave de Claude Console'), key);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' }));
}

function httpFailure(status: number, detail: string) {
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    data: { detail }, status, statusText: 'Error', headers: {}, config: { headers: new AxiosHeaders() },
  });
}

beforeEach(() => {
  vi.mocked(prepareCompatibleConnection).mockReset().mockResolvedValue(preparedProvider);
  vi.mocked(probeCompatibleModel).mockReset().mockImplementation(async (provider, model) => ({
    status: 'ok', detail: 'Comprobado', latency_ms: 20, provider, model: { ...model, verification_id: 'proof' },
  }));
  vi.mocked(publishAIControlCenter).mockReset().mockResolvedValue({ status: 'ok', version: 10 });
});

describe('Claude Console setup', () => {
  it('checks Sonnet with Messages and images, preserving every other route, model and tool', async () => {
    const snapshot = props();
    const before = structuredClone({ providers: snapshot.providers, models: snapshot.models, features: snapshot.features, tools: snapshot.tools });
    render(<ClaudeConsoleSetup {...snapshot} />);
    expect(screen.getByText(/https:\/\/api.anthropic.com\/v1/)).toBeInTheDocument();
    expect(screen.getByText(/consume una pequeña cantidad/)).toBeInTheDocument();
    await enterKeyAndSave();
    await waitFor(() => expect(snapshot.onSaved).toHaveBeenCalledTimes(1));
    expect(prepareCompatibleConnection).toHaveBeenCalledExactlyOnceWith({
      label: 'Claude Console', base_url: 'https://api.anthropic.com/v1', api_key: 'synthetic-claude-key',
    });
    expect(probeCompatibleModel).toHaveBeenCalledWith(preparedProvider, expect.objectContaining({
      model_id: 'claude-sonnet-5-5', capabilities: ['text', 'vision'],
      runtime_profile: { protocol: 'messages', auth_style: 'auto', thinking: null, reasoning_effort: null, send_temperature: false },
    }));
    const [providers, models, features, tools, version] = vi.mocked(publishAIControlCenter).mock.calls[0];
    expect(providers).toEqual([originalProvider, preparedProvider]);
    expect(models).toEqual([snapshot.models[0], expect.objectContaining({ model_id: 'claude-sonnet-5-5', verification_id: 'proof' })]);
    expect(features).toEqual(snapshot.features.map((feature) => feature.feature === 'calificacion.valoracion'
      ? { ...feature, primary_provider: preparedProvider.id, primary_model: 'claude-sonnet-5-5' } : feature));
    expect(tools).toEqual(snapshot.tools);
    expect(version).toBe(9);
    expect({ providers: snapshot.providers, models: snapshot.models, features: snapshot.features, tools: snapshot.tools }).toEqual(before);
    expect(screen.getByLabelText('Clave de Claude Console')).toHaveValue('');
    expect(screen.queryByText('synthetic-claude-key')).not.toBeInTheDocument();
  });

  it('keeps the prepared connection after a failed probe and retries without another key or connection', async () => {
    const snapshot = props();
    vi.mocked(probeCompatibleModel).mockResolvedValueOnce({ status: 'error', detail: 'Revisa acceso al modelo.', latency_ms: 15 });
    render(<ClaudeConsoleSetup {...snapshot} />);
    await enterKeyAndSave();
    await screen.findByText('Revisa acceso al modelo.');
    expect(publishAIControlCenter).not.toHaveBeenCalled();
    expect(snapshot.onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Clave de Claude Console')).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' }));
    await waitFor(() => expect(snapshot.onSaved).toHaveBeenCalledTimes(1));
    expect(prepareCompatibleConnection).toHaveBeenCalledTimes(1);
    expect(probeCompatibleModel).toHaveBeenCalledTimes(2);
    expect(publishAIControlCenter).toHaveBeenCalledTimes(1);
  });

  it('prepares an independent connection when a different key is entered after a failed probe', async () => {
    vi.mocked(probeCompatibleModel).mockResolvedValue({ status: 'error', detail: 'Clave sin acceso.', latency_ms: 15 });
    render(<ClaudeConsoleSetup {...props()} />);
    await enterKeyAndSave();
    await screen.findByText('Clave sin acceso.');
    await enterKeyAndSave('replacement-synthetic-key');
    await waitFor(() => expect(prepareCompatibleConnection).toHaveBeenCalledTimes(2));
    expect(prepareCompatibleConnection).toHaveBeenLastCalledWith({
      label: 'Claude Console', base_url: 'https://api.anthropic.com/v1', api_key: 'replacement-synthetic-key',
    });
    expect(publishAIControlCenter).not.toHaveBeenCalled();
  });

  it('stops on a publication conflict and requires refreshing the snapshot', async () => {
    const snapshot = props();
    vi.mocked(publishAIControlCenter).mockRejectedValue(httpFailure(409, 'Otra sesión cambió la configuración.'));
    render(<ClaudeConsoleSetup {...snapshot} />);
    await enterKeyAndSave();
    await screen.findByText(/La configuración cambió en otra sesión/);
    expect(snapshot.onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' })).toBeDisabled();
    expect(screen.getByLabelText('Clave de Claude Console')).toHaveValue('');
    expect(snapshot.features[1].primary_provider).toBe('open_code');
  });

  it('blocks setup while an unrelated draft is pending', async () => {
    render(<ClaudeConsoleSetup {...props()} disabled />);
    expect(screen.getByLabelText('Clave de Claude Console')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' })).toBeDisabled();
    expect(screen.getByText(/Guarda o descarta tus cambios pendientes/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' }));
    expect(prepareCompatibleConnection).not.toHaveBeenCalled();
    expect(publishAIControlCenter).not.toHaveBeenCalled();
  });

  it('does not prepare or publish when the valuation route is missing', async () => {
    const snapshot = props();
    render(<ClaudeConsoleSetup {...snapshot} features={snapshot.features.filter((feature) => feature.feature !== 'calificacion.valoracion')} />);
    await enterKeyAndSave();
    expect(screen.getByRole('status')).toHaveTextContent('No se encontró una ruta única de valoración');
    expect(prepareCompatibleConnection).not.toHaveBeenCalled();
    expect(publishAIControlCenter).not.toHaveBeenCalled();
  });

  it('rejects an incomplete successful probe and disables the form while working', async () => {
    let finish: (value: Awaited<ReturnType<typeof probeCompatibleModel>>) => void = () => undefined;
    vi.mocked(probeCompatibleModel).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onBusyChange = vi.fn();
    render(<ClaudeConsoleSetup {...props()} onBusyChange={onBusyChange} />);
    await enterKeyAndSave();
    await waitFor(() => expect(probeCompatibleModel).toHaveBeenCalled());
    expect(screen.getByLabelText('Clave de Claude Console')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Comprobando y guardando Sonnet…' })).toBeDisabled();
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    finish({ status: 'ok', detail: 'Sin prueba verificable', latency_ms: 15, provider: preparedProvider });
    await screen.findByText(/La prueba no devolvió una configuración completa/);
    expect(publishAIControlCenter).not.toHaveBeenCalled();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  });

  it('shows a safe validation error from publication without discarding the prepared key', async () => {
    const snapshot = props();
    vi.mocked(publishAIControlCenter).mockRejectedValueOnce(httpFailure(422, 'Comprueba el modelo de respaldo antes de publicar.'));
    render(<ClaudeConsoleSetup {...snapshot} />);
    await enterKeyAndSave();
    await screen.findByText('Comprueba el modelo de respaldo antes de publicar.');
    expect(snapshot.onSaved).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar clave y usar Sonnet 5.5' }));
    await waitFor(() => expect(snapshot.onSaved).toHaveBeenCalledTimes(1));
    expect(prepareCompatibleConnection).toHaveBeenCalledTimes(1);
  });

  it('does not display a submitted key in a validation error', async () => {
    vi.mocked(publishAIControlCenter).mockRejectedValue(httpFailure(422, 'Revisa synthetic-claude-key para continuar.'));
    render(<ClaudeConsoleSetup {...props()} />);
    await enterKeyAndSave();
    await screen.findByText('Revisa la configuración de Claude Console antes de guardar de nuevo.');
    expect(screen.queryByText(/Revisa synthetic-claude-key/)).not.toBeInTheDocument();
  });
});
