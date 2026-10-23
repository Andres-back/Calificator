import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompatibleAPISection } from './CompatibleAPISection';
import { discoverCompatibleModels, prepareCompatibleConnection, probeCompatibleModel, type AIProvider } from '../../api';

vi.mock('../../api', () => ({ discoverCompatibleModels: vi.fn(), prepareCompatibleConnection: vi.fn(), probeCompatibleModel: vi.fn() }));
const provider: AIProvider = { id: 'api_direct', name: 'api_direct', label: 'Directa', tipo: 'texto', base_url: 'https://api.example/v1',
  model: null, active: true, priority: 1, timeout_seconds: 120, max_retries: 0, auth_configured: true, credential_revision: 'rev1' };

describe('Compatible API administration', () => {
  it('prepares a separate connection and clears the write-only key', async () => {
    vi.mocked(prepareCompatibleConnection).mockResolvedValue(provider);
    const onProvider = vi.fn();
    render(<CompatibleAPISection providers={[]} models={[]} onProvider={onProvider} onModels={vi.fn()} />);
    await userEvent.click(screen.getByText('Añadir una API o actualizar su clave'));
    await userEvent.type(screen.getByLabelText('Nombre de la conexión'), 'Directa');
    await userEvent.type(screen.getByLabelText('URL HTTPS de la API'), 'https://api.example/v1');
    await userEvent.type(screen.getByLabelText('Clave de esta API'), 'synthetic-key');
    await userEvent.click(screen.getByRole('button', { name: 'Preparar conexión' }));
    expect(onProvider).toHaveBeenCalledWith(provider);
    expect(screen.getByLabelText('Clave de esta API')).toHaveValue('');
  });

  it('allows a new model ID and prepares it only after a successful probe', async () => {
    const prepared = { provider_id: provider.id, model_id: 'unknown-model-2099', label: 'future', capabilities: ['text', 'vision'], active: true, recommended: false, verification_id: 'checked' };
    vi.mocked(probeCompatibleModel).mockResolvedValue({ status: 'ok', detail: 'Comprobado', latency_ms: 100, provider, model: prepared });
    const onModels = vi.fn();
    render(<CompatibleAPISection providers={[provider]} models={[]} onProvider={vi.fn()} onModels={onModels} />);
    await userEvent.selectOptions(screen.getByLabelText('API para el modelo'), provider.id);
    await userEvent.type(screen.getByLabelText('Modelo (identificador exacto)'), 'unknown-model-2099');
    await userEvent.selectOptions(screen.getByLabelText('Formato de la API'), 'responses');
    await userEvent.click(screen.getByRole('checkbox', { name: /recibe imágenes/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Probar y preparar modelo' }));
    expect(probeCompatibleModel).toHaveBeenCalledWith(provider, expect.objectContaining({ model_id: 'unknown-model-2099', capabilities: ['text', 'vision'], runtime_profile: expect.objectContaining({ protocol: 'responses' }) }));
    expect(onModels).toHaveBeenCalledWith([prepared]);
  });

  it('keeps the selection and existing models after a failed catalog or probe', async () => {
    vi.mocked(discoverCompatibleModels).mockRejectedValue(new Error('offline'));
    vi.mocked(probeCompatibleModel).mockResolvedValue({ status: 'error', detail: 'No se cambió la ruta', latency_ms: 100 });
    const onModels = vi.fn();
    render(<CompatibleAPISection providers={[provider]} models={[]} onProvider={vi.fn()} onModels={onModels} />);
    await userEvent.selectOptions(screen.getByLabelText('API para el modelo'), provider.id);
    await userEvent.click(screen.getByRole('button', { name: 'Consultar modelos disponibles' }));
    expect(onModels).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Modelo (identificador exacto)'), 'future');
    await userEvent.click(screen.getByRole('button', { name: 'Probar y preparar modelo' }));
    expect(screen.getByRole('status')).toHaveTextContent('No se cambió la ruta');
    expect(screen.getByLabelText('Modelo (identificador exacto)')).toHaveValue('future');
    expect(onModels).not.toHaveBeenCalled();
  });
});
