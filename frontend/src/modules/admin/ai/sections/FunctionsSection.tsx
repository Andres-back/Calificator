import { useMemo, useState } from 'react';
import { Activity, Bot, ChevronDown, Cpu, Search, ShieldCheck } from 'lucide-react';
import { Badge, Card, Field, Input, Select } from '@/components/ui';
import type { AIFunctionControl, AIModel, AIProvider, FeatureRouting } from '../../api';

function compatibleModels(models: AIModel[], provider: string, capability: string) {
  return models.filter((model) => model.provider_id === provider && model.active && model.capabilities.includes(capability));
}

function routeForStage(stage: AIFunctionControl['stages'][number], features: FeatureRouting[]): FeatureRouting | null {
  if (!stage.runtime_feature || !stage.configured) return null;
  return features.find((feature) => feature.feature === stage.runtime_feature) ?? {
    feature: stage.runtime_feature,
    label: stage.label,
    capability: stage.capability,
    primary_provider: stage.configured.provider ?? 'groq',
    primary_model: stage.configured.model,
    fallback_provider: stage.configured.fallback_provider,
    fallback_model: stage.configured.fallback_model,
    rollout_enabled: stage.configured.teacher_override_allowed,
    config_version: stage.configured.config_version,
    active: true,
  };
}

function routeText(provider?: string | null, model?: string | null) {
  return provider ? `${provider} · ${model || 'modelo del proveedor'}` : 'No aplica';
}

export function FunctionsSection({
  functions,
  features,
  providers,
  models,
  onUpsert,
}: {
  functions: AIFunctionControl[];
  features: FeatureRouting[];
  providers: AIProvider[];
  models: AIModel[];
  onUpsert: (feature: FeatureRouting) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    if (!query) return functions;
    return functions.filter((item) => `${item.label} ${item.stages.map((stage) => stage.label).join(' ')}`.toLocaleLowerCase('es').includes(query));
  }, [functions, search]);

  return (
    <section className="space-y-4" aria-labelledby="ai-functions-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="ai-functions-title" className="font-display text-xl font-extrabold">IA por función real</h2>
          <p className="mt-1 text-sm text-muted">Configura cada etapa y compara lo guardado, lo efectivo y lo observado.</p>
        </div>
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Buscar función o etapa</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.currentTarget.value)} className="pl-9" placeholder="Buscar función o etapa" />
        </label>
      </div>

      {visible.map((item, index) => (
        <details key={item.function_id} open={index === 0} className="group rounded-xl border border-border bg-surface shadow-sm">
          <summary className="focus-ring flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 sm:px-5">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"><Cpu className="h-5 w-5" /></span>
              <span><strong className="block">{item.label}</strong><span className="text-sm text-muted">{item.stages.length} etapas documentadas</span></span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 border-t border-border p-3 sm:p-5">
            {item.stages.map((stage) => {
              const route = routeForStage(stage, features);
              const supportedProviders = stage.supported_providers ?? [];
              const providerOptions = providers.filter((provider) => (
                provider.active
                && compatibleModels(models, provider.id, stage.capability).length > 0
                && (supportedProviders.length === 0 || supportedProviders.includes(provider.id))
              ));
              const modelOptions = route ? compatibleModels(models, route.primary_provider, stage.capability) : [];
              const fallbackModelOptions = route?.fallback_provider ? compatibleModels(models, route.fallback_provider, stage.capability) : [];
              return (
                <Card key={`${item.function_id}:${stage.stage_id}`} className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{stage.label}</h3><Badge tone={stage.editable ? 'violet' : 'neutral'}>{stage.editable ? stage.capability : 'Sin IA'}</Badge></div>
                      <p className="mt-1 text-xs text-muted">{stage.condition} · {stage.consumer}</p>
                      {stage.runtime_feature && <p className="mt-1 break-all font-mono text-[11px] text-muted">{stage.runtime_feature}</p>}
                    </div>
                    {stage.inherits_from && <Badge tone="neutral">Hereda de {stage.inherits_from}</Badge>}
                  </div>

                  {stage.editable && route ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Proveedor">
                        <Select value={route.primary_provider} onChange={(event) => {
                          const provider = event.currentTarget.value;
                          const first = compatibleModels(models, provider, stage.capability).find((model) => model.recommended) ?? compatibleModels(models, provider, stage.capability)[0];
                          const clearsFallback = route.fallback_provider === provider;
                          onUpsert({
                            ...route,
                            primary_provider: provider,
                            primary_model: first?.model_id ?? null,
                            fallback_provider: clearsFallback ? null : route.fallback_provider,
                            fallback_model: clearsFallback ? null : route.fallback_model,
                          });
                        }}>
                          {providerOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Modelo">
                        <Select value={route.primary_model ?? ''} onChange={(event) => onUpsert({ ...route, primary_model: event.currentTarget.value || null })}>
                          {modelOptions.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Proveedor de respaldo">
                        <Select value={route.fallback_provider ?? ''} onChange={(event) => {
                          const fallbackProvider = event.currentTarget.value || null;
                          const first = fallbackProvider ? compatibleModels(models, fallbackProvider, stage.capability).find((model) => model.recommended) ?? compatibleModels(models, fallbackProvider, stage.capability)[0] : null;
                          onUpsert({ ...route, fallback_provider: fallbackProvider, fallback_model: first?.model_id ?? null });
                        }}>
                          <option value="">Sin respaldo</option>
                          {providerOptions.filter((provider) => provider.id !== route.primary_provider).map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Modelo de respaldo">
                        <Select disabled={!route.fallback_provider} value={route.fallback_model ?? ''} onChange={(event) => onUpsert({ ...route, fallback_model: event.currentTarget.value || null })}>
                          {!route.fallback_provider && <option value="">No aplica</option>}
                          {fallbackModelOptions.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}
                        </Select>
                      </Field>
                      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium md:col-span-2 xl:col-span-4">
                        <input type="checkbox" checked={Boolean(route.rollout_enabled)} onChange={(event) => onUpsert({ ...route, rollout_enabled: event.currentTarget.checked })} className="h-4 w-4 accent-brand-600" />
                        Permitir API del docente
                      </label>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Esta etapa se ejecuta de forma determinista y no necesita seleccionar un modelo.</p>
                  )}

                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><Bot className="h-3.5 w-3.5" /> Guardado</span><p className="mt-1 break-words text-sm font-semibold">{routeText(stage.configured?.provider, stage.configured?.model)}</p><p className="mt-1 text-xs text-muted">Versión {stage.configured?.config_version ?? 'no registrada'}{stage.configured?.fallback_provider ? ` · Respaldo: ${routeText(stage.configured.fallback_provider, stage.configured.fallback_model)}` : ''}</p></div>
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Efectivo</span><p className="mt-1 break-words text-sm font-semibold">{routeText(stage.effective?.provider, stage.effective?.model)}</p><p className="mt-1 text-xs text-muted">Origen: {stage.effective?.origin || 'institucional'} · Versión {stage.effective?.config_version ?? 'no registrada'}</p></div>
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><Activity className="h-3.5 w-3.5" /> Último observado</span><p className="mt-1 break-words text-sm font-semibold">{stage.observed ? routeText(stage.observed.provider, stage.observed.model) : 'No registrado'}</p><p className="mt-1 text-xs text-muted">{stage.observed ? `Versión ${stage.observed.config_version ?? 'no registrada'}${stage.observed.fallback_used ? ' · Usó respaldo' : ''}` : 'Aún no hay una ejecución trazable.'}</p></div>
                  </div>
                </Card>
              );
            })}
          </div>
        </details>
      ))}
      {visible.length === 0 && <Card className="p-6 text-center text-sm text-muted">No encontramos una función o etapa con ese nombre.</Card>}
    </section>
  );
}
