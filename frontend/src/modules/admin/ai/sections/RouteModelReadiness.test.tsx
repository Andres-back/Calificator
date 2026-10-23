import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AIProvider, AIModel, FeatureRouting } from '../../api';
import { RouteModelReadiness } from './RouteModelReadiness';

const providers = ['api', 'ollama'].map((id) => ({ id, label: id, active: true, auth_configured: true, base_url: 'https://example.test/v1' })) as AIProvider[];
const models = [
  { provider_id: 'api', model_id: 'primary', label: 'Nuevo principal', runtime_profile: { protocol: 'responses' }, verification_id: 'proof', capabilities: ['vision'], active: true },
  { provider_id: 'api', model_id: 'backup', label: 'Respaldo comprobado', runtime_profile: { protocol: 'chat_completions' }, verification_id: 'proof2', capabilities: ['vision'], active: true },
  { provider_id: 'ollama', model_id: 'native', label: 'Anterior', capabilities: ['vision'], active: true },
] as AIModel[];
const previous = { feature: 'calificacion.extraccion', primary_provider: 'api', primary_model: 'old', fallback_provider: 'ollama', fallback_model: 'native', capability: 'vision' } as FeatureRouting;
const route = { ...previous, primary_model: 'primary' };

describe('route model repair', () => {
  it('offers an explicit proven replacement without mutating a published route', async () => {
    const upsert = vi.fn();
    render(<RouteModelReadiness route={route} previous={previous} models={models} providers={providers} onUpsert={upsert} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Respaldo: Anterior');
    expect(upsert).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Elegir respaldo comprobado' }), JSON.stringify(['api', 'backup']));
    expect(upsert).toHaveBeenCalledWith({ ...route, fallback_provider: 'api', fallback_model: 'backup' });
    expect(route.fallback_provider).toBe('ollama');
  });
  it('removes only after a deliberate action', async () => {
    const upsert = vi.fn();
    render(<RouteModelReadiness route={route} previous={previous} models={models} providers={providers} onUpsert={upsert} />);
    await userEvent.click(screen.getByRole('button', { name: 'Quitar respaldo' }));
    expect(upsert).toHaveBeenCalledWith({ ...route, fallback_provider: null, fallback_model: null });
  });
  it('opens preparation for the exact new model and leaves the draft intact', async () => {
    const prepare = vi.fn();
    const upsert = vi.fn();
    render(<RouteModelReadiness route={{ ...route, primary_model: 'future', fallback_provider: null }} previous={previous} models={models} providers={providers} onUpsert={upsert} onPrepare={prepare} />);
    await userEvent.click(screen.getByRole('button', { name: 'Comprobar modelo principal' }));
    expect(prepare).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'api', modelId: 'future', capability: 'vision' }));
    expect(upsert).not.toHaveBeenCalled();
  });
});
