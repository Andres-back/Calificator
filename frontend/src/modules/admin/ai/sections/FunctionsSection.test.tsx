import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AIFunctionControl, AIModel, AIProvider, FeatureRouting } from '../../api';
import { FunctionsSection } from './FunctionsSection';

const providers: AIProvider[] = ['open_code', 'groq'].map((id) => ({ id, name: id, label: id, tipo: 'texto', base_url: null, model: null, active: true, priority: 1, timeout_seconds: 30, max_retries: 1, auth_configured: true }));
const models: AIModel[] = [
  { provider_id: 'open_code', model_id: 'glm-5.3-flash', label: 'GLM Flash', capabilities: ['text'], active: true, recommended: true },
  { provider_id: 'groq', model_id: 'alternative-admin-model', label: 'Otro modelo', capabilities: ['text'], active: true, recommended: true },
];
const route: FeatureRouting = { feature: 'xali_evaluacion_post_entrega', label: 'Ayuda sobre nota y retroalimentación', capability: 'text', primary_provider: 'open_code', primary_model: 'glm-5.3-flash', fallback_provider: null, fallback_model: null, rollout_enabled: false, active: true };
const functions: AIFunctionControl[] = [{ function_id: 'xali', label: 'Asistente Xali', stages: [{
  function_id: 'xali', function_label: 'Asistente Xali', stage_id: 'feedback', label: route.label, runtime_feature: route.feature, capability: 'text', consumer: 'feedback_sharing.chat_service', condition: 'Preguntas posteriores; no vuelve a calificar', editable: true, inherits_from: null, supported_providers: ['open_code', 'groq'],
  configured: { provider: route.primary_provider, model: route.primary_model ?? null, fallback_provider: null, fallback_model: null, teacher_override_allowed: false, config_version: 11 },
  effective: { provider: route.primary_provider, model: route.primary_model ?? null, fallback_provider: null, fallback_model: null, teacher_override_allowed: false, config_version: 11 }, observed: null,
}] }];

describe('administración de IA de devoluciones', () => {
  it('permite cambiar proveedor y modelo desde el frontend sin fijar GLM en negocio', async () => {
    const update = vi.fn();
    render(<FunctionsSection functions={functions} features={[route]} providers={providers} models={models} onUpsert={update} />);
    expect(screen.getByRole('heading', { name: 'Ayuda sobre nota y retroalimentación' })).toBeInTheDocument();
    expect(screen.getByText(/Las imágenes y los evaluadores se configuran por separado/)).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proveedor' }), 'groq');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ feature: route.feature, primary_provider: 'groq', primary_model: 'alternative-admin-model' }));
    expect(route.primary_provider).toBe('open_code');
    expect(update.mock.calls.every(([changed]) => changed.feature === route.feature)).toBe(true);
  });

  it('permite seleccionar Sin respaldo de manera explícita', async () => {
    const update = vi.fn();
    render(<FunctionsSection functions={functions} features={[{ ...route, fallback_provider: 'groq', fallback_model: 'alternative-admin-model' }]} providers={providers} models={models} onUpsert={update} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proveedor de respaldo' }), '');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ feature: route.feature, fallback_provider: null, fallback_model: null }));
  });

  it('permite dos modelos distintos de la misma API como principal y respaldo', async () => {
    const update = vi.fn();
    const extra: AIModel = { ...models[0], model_id: 'new-principal', label: 'Principal nuevo' };
    render(<FunctionsSection functions={functions} features={[{ ...route, primary_model: extra.model_id }]} providers={providers} models={[...models, extra]} onUpsert={update} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proveedor de respaldo' }), 'open_code');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ primary_model: 'new-principal', fallback_provider: 'open_code', fallback_model: 'glm-5.3-flash' }));
  });
});
