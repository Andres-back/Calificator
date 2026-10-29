import { fireEvent, render, screen } from '@testing-library/react';
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
  it('mantiene el encuadre opcional apagado, sin respaldo o API personal, y deja elegir cualquier API visual', async () => {
    const update = vi.fn();
    const corner: FeatureRouting = { ...route, feature: 'calificacion.bordes', label: 'Ayuda para encuadrar la hoja',
      capability: 'vision', primary_provider: '', primary_model: null, active: false };
    const configured = { ...functions[0].stages[0].configured!, provider: null, model: null, active: false };
    const stage = { ...functions[0].stages[0], stage_id: 'corners', label: corner.label, runtime_feature: corner.feature,
      capability: 'vision', supported_providers: [], configured, effective: configured };
    const custom: AIProvider = { ...providers[0], id: 'api_independent', name: 'api_independent', label: 'Mi API visual' };
    const visual: AIModel = { ...models[0], provider_id: custom.id, model_id: 'vision-available-tomorrow', label: 'Visión configurable', capabilities: ['vision'], runtime_profile: { protocol: 'chat_completions' }, verification_id: 'checked' };
    render(<FunctionsSection functions={[{ ...functions[0], stages: [stage] }]} features={[corner]} providers={[custom]} models={[visual]} onUpsert={update} />);
    expect(screen.getByRole('checkbox', { name: /Activar ayuda para encuadrar/ })).not.toBeChecked();
    expect(screen.queryByRole('combobox', { name: 'Proveedor de respaldo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Permitir API del docente' })).not.toBeInTheDocument();
    expect(screen.queryByText('Falta preparar esta selección antes de guardar')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Proveedor' }), custom.id);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ feature: corner.feature, primary_provider: custom.id,
      primary_model: visual.model_id, active: false }));
  });
  it('edits reading limits without touching other routes and reopens saved controls', () => {
    const reading = { ...route, feature: 'calificacion.extraccion', capability: 'vision', runtime_limits: { call_timeout_seconds: 30, max_attempts: 2, max_output_tokens: 8192 } };
    const stage = { ...functions[0].stages[0], stage_id: 'extraction', runtime_feature: reading.feature, capability: 'vision', configured: { ...functions[0].stages[0].configured!, runtime_limits: reading.runtime_limits } };
    const upsert = vi.fn();
    render(<FunctionsSection functions={[{ ...functions[0], stages: [stage] }]} features={[reading]} providers={providers} models={models.map((m) => ({ ...m, capabilities: ['vision'] }))} onUpsert={upsert} />);
    const time = screen.getByRole('spinbutton', { name: 'Tiempo por intento (segundos)' });
    expect(time).toHaveValue(30);
    expect(time).toHaveAttribute('max', '60');
    fireEvent.change(time, { target: { value: '45' } });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ feature: reading.feature, runtime_limits: { ...reading.runtime_limits, call_timeout_seconds: 45 } }));
    expect(screen.getByRole('spinbutton', { name: 'Espacio de respuesta (tokens)' })).toHaveValue(8192);
    expect(screen.getByText(/Límites guardados de lectura: 30 s/)).toBeInTheDocument();
  });
  it('shows the effective grading deadline separately from shared provider settings', () => {
    render(<FunctionsSection functions={[{ ...functions[0], function_id: 'calificacion',
      execution_policy: { schema_version: 1, call_timeout_seconds: 60, max_stage_attempts: 2 },
    }]} features={[route]} providers={providers} models={models} onUpsert={vi.fn()} />);
    expect(screen.getByText(/Máximo de 60 segundos por llamada/)).toBeInTheDocument();
    expect(screen.getByText(/no incluye la espera en cola/i)).toBeInTheDocument();
  });
  it('does not assign duplicate navigation targets to deterministic stages', () => {
    const deterministic = { ...functions[0].stages[0], runtime_feature: null, editable: false, configured: null, effective: null };
    const { container } = render(<FunctionsSection functions={[{ ...functions[0], stages: [{ ...deterministic, stage_id: 'prepare' }, { ...deterministic, stage_id: 'consolidation' }, ...functions[0].stages] }]} features={[route]} providers={providers} models={models} onUpsert={vi.fn()} />);
    const ids = [...container.querySelectorAll('[id^="ai-route-"]')].map((element) => element.id);
    expect(ids).toEqual([`ai-route-${route.feature}`]);
  });
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
