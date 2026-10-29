import { useMemo, useState } from 'react';
import { Activity, Bot, ChevronDown, Cpu, Search, ShieldCheck } from 'lucide-react';
import { Badge, Card, Field, Input, Select } from '@/components/ui';
import type { AIFunctionControl, AIModel, AIProvider, AIStageControl, FeatureRouting } from '../../api';
import { RouteModelReadiness } from './RouteModelReadiness';
import type { ModelPreparationSelection } from '../utils/routePreparation';

function compatibleModels(models: AIModel[], provider: string, capability: string) {
  return models.filter((model) => model.provider_id === provider && model.active && model.capabilities.includes(capability));
}

function unavailableModel(models: AIModel[], provider: string, modelId: string | null | undefined) {
  if (!modelId) return null;
  return models.find((model) => model.provider_id === provider && model.model_id === modelId) ?? {
    provider_id: provider,
    model_id: modelId,
    label: modelId,
    capabilities: [],
    recommended: false,
    active: false,
  };
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
    active: stage.configured.active ?? true,
    runtime_limits: stage.configured.runtime_limits,
  };
}

function routeText(provider?: string | null, model?: string | null) {
  return provider ? `${provider} · ${model || 'modelo del proveedor'}` : 'No aplica';
}

function GradingPipelineSummary({ stages, policy }: { stages: AIStageControl[]; policy?: AIFunctionControl['execution_policy'] }) {
  const extraction = stages.find((stage) => stage.stage_id === 'extraction')?.effective;
  const primary = stages.find((stage) => stage.stage_id === 'grading_primary')?.effective;
  const verification = stages.find((stage) => stage.stage_id === 'grading_secondary')?.effective;
  const arbitration = stages.find((stage) => stage.stage_id === 'targeted_recheck')?.effective;
  if (!extraction && !primary && !verification && !arbitration && !policy) return null;

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
      <p className="font-bold">Ruta institucional de calificación</p>
      {policy && <p className="mt-2 text-sm">Máximo de {policy.call_timeout_seconds} segundos por llamada de evaluación o verificación; no incluye la espera en cola ni la suma de etapas. Si una etapa falla temporalmente, se intenta solo esa etapa pendiente, con un máximo de {policy.max_stage_attempts} intentos en total.</p>}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {extraction && <p><span className="block text-xs font-semibold text-muted">Lectura visual</span>{routeText(extraction.provider, extraction.model)}</p>}
        {primary && <p><span className="block text-xs font-semibold text-muted">Evaluador principal</span>{routeText(primary.provider, primary.model)}</p>}
        {verification && <p><span className="block text-xs font-semibold text-muted">Segundo evaluador</span>{routeText(verification.provider, verification.model)}</p>}
        {arbitration && <p><span className="block text-xs font-semibold text-muted">Árbitro ante discrepancias</span>{routeText(arbitration.provider, arbitration.model)}</p>}
      </div>
      {extraction?.fallback_provider && (
        <p className="mt-3 border-t border-brand-200 pt-2 text-xs text-muted dark:border-brand-500/30">
          Si falla la lectura visual y queda un intento disponible, se intenta {routeText(extraction.fallback_provider, extraction.fallback_model)}. Esta contingencia no reemplaza al segundo evaluador ni al árbitro.
        </p>
      )}
    </div>
  );
}

export function FunctionsSection({
  functions,
  features,
  providers,
  models,
  onUpsert,
  onPrepare,
}: {
  functions: AIFunctionControl[];
  features: FeatureRouting[];
  providers: AIProvider[];
  models: AIModel[];
  onUpsert: (feature: FeatureRouting) => void;
  onPrepare?: (selection: ModelPreparationSelection) => void;
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
            {(item.function_id === 'xali' || item.function_id === 'recursos') && (
              <p className="text-sm text-muted">Para las respuestas y el texto de recursos solo se usarán los proveedores elegidos aquí. «Sin respaldo» no enviará la solicitud a otro proveedor. Las imágenes y los evaluadores se configuran por separado.</p>
            )}
            {item.function_id === 'calificacion' && <GradingPipelineSummary stages={item.stages} policy={item.execution_policy} />}
            {item.stages.map((stage) => {
              const cornerAssistance = stage.runtime_feature === 'calificacion.bordes';
              const route = routeForStage(stage, features);
              const supportedProviders = stage.supported_providers ?? [];
              const providerOptions = providers.filter((provider) => (
                provider.active
                && provider.auth_configured
                && compatibleModels(models, provider.id, stage.capability).length > 0
                && (supportedProviders.length === 0 || supportedProviders.includes(provider.id) || (['text', 'vision'].includes(stage.capability) && compatibleModels(models, provider.id, stage.capability).some((m) => m.runtime_profile && m.verification_id)))
              ));
              const modelOptions = route ? compatibleModels(models, route.primary_provider, stage.capability) : [];
              const fallbackModelOptions = route?.fallback_provider ? compatibleModels(models, route.fallback_provider, stage.capability).filter((model) => route.fallback_provider !== route.primary_provider || model.model_id !== route.primary_model) : [];
              const currentProviderUnavailable = route && !providerOptions.some((provider) => provider.id === route.primary_provider)
                ? providers.find((provider) => provider.id === route.primary_provider)
                : null;
              const currentModelUnavailable = route && !modelOptions.some((model) => model.model_id === route.primary_model)
                ? unavailableModel(models, route.primary_provider, route.primary_model)
                : null;
              const fallbackProviderUnavailable = route?.fallback_provider && !providerOptions.some((provider) => provider.id === route.fallback_provider)
                ? providers.find((provider) => provider.id === route.fallback_provider)
                : null;
              const fallbackModelUnavailable = route?.fallback_provider && !fallbackModelOptions.some((model) => model.model_id === route.fallback_model)
                ? unavailableModel(models, route.fallback_provider, route.fallback_model)
                : null;
              return (
                <Card key={`${item.function_id}:${stage.stage_id}`} id={stage.runtime_feature ? `ai-route-${stage.runtime_feature}` : undefined} className="space-y-4 p-4">
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
                      {cornerAssistance && <label className="col-span-full flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={route.active} onChange={(event) => onUpsert({ ...route, active: event.currentTarget.checked, rollout_enabled: false, fallback_provider: null, fallback_model: null })} className="h-4 w-4 accent-brand-600" />Activar ayuda para encuadrar · un intento por foto, sin recalificar</label>}
                      <Field label="Proveedor">
                        <Select value={route.primary_provider} onChange={(event) => {
                          const provider = event.currentTarget.value;
                          const first = compatibleModels(models, provider, stage.capability).find((model) => model.recommended) ?? compatibleModels(models, provider, stage.capability)[0];
                          onUpsert({
                            ...route,
                            primary_provider: provider,
                            primary_model: first?.model_id ?? null,
                            fallback_provider: route.fallback_provider,
                            fallback_model: route.fallback_model,
                          });
                        }}>
                          {cornerAssistance && !route.primary_provider && <option value="">Elige un proveedor</option>}
                          {currentProviderUnavailable && <option value={currentProviderUnavailable.id} disabled>{currentProviderUnavailable.label} (no disponible)</option>}
                          {providerOptions.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Modelo">
                        <Select value={route.primary_model ?? ''} onChange={(event) => onUpsert({ ...route, primary_model: event.currentTarget.value || null })}>
                          {cornerAssistance && !route.primary_model && <option value="">Elige y comprueba un modelo visual</option>}
                          {currentModelUnavailable && <option value={currentModelUnavailable.model_id} disabled>{currentModelUnavailable.label} (no disponible)</option>}
                          {modelOptions.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}
                        </Select>
                      </Field>
                      {!cornerAssistance && <><Field label="Proveedor de respaldo">
                        <Select value={route.fallback_provider ?? ''} onChange={(event) => {
                          const fallbackProvider = event.currentTarget.value || null;
                          const candidates = fallbackProvider ? compatibleModels(models, fallbackProvider, stage.capability).filter((model) => fallbackProvider !== route.primary_provider || model.model_id !== route.primary_model) : [];
                          const first = candidates.find((model) => model.recommended) ?? candidates[0] ?? null;
                          onUpsert({ ...route, fallback_provider: fallbackProvider, fallback_model: first?.model_id ?? null });
                        }}>
                          <option value="">Sin respaldo</option>
                          {fallbackProviderUnavailable && <option value={fallbackProviderUnavailable.id} disabled>{fallbackProviderUnavailable.label} (no disponible)</option>}
                          {providerOptions.filter((provider) => compatibleModels(models, provider.id, stage.capability).some((model) => provider.id !== route.primary_provider || model.model_id !== route.primary_model)).map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Modelo de respaldo">
                        <Select disabled={!route.fallback_provider} value={route.fallback_model ?? ''} onChange={(event) => onUpsert({ ...route, fallback_model: event.currentTarget.value || null })}>
                          {!route.fallback_provider && <option value="">No aplica</option>}
                          {fallbackModelUnavailable && <option value={fallbackModelUnavailable.model_id} disabled>{fallbackModelUnavailable.label} (no disponible)</option>}
                          {fallbackModelOptions.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}
                        </Select>
                      </Field>
                      </>}
                      {!cornerAssistance && <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium md:col-span-2 xl:col-span-4">
                        <input type="checkbox" checked={Boolean(route.rollout_enabled)} onChange={(event) => onUpsert({ ...route, rollout_enabled: event.currentTarget.checked })} className="h-4 w-4 accent-brand-600" />
                        Permitir API del docente
                      </label>}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">Esta etapa se ejecuta de forma determinista y no necesita seleccionar un modelo.</p>
                  )}

                  {stage.editable && route && <RouteModelReadiness route={route} previous={routeForStage(stage, []) ?? undefined} providers={providers} models={models} onUpsert={onUpsert} onPrepare={onPrepare} />}

                  {route?.feature === 'calificacion.extraccion' && <fieldset className="min-w-0 rounded-lg border border-border p-3">
                    <legend className="px-1 text-sm font-bold">Límites de lectura visual</legend>
                    <p className="mb-3 text-xs text-muted">Solo se usan el modelo principal y el respaldo elegidos arriba. Los intentos se comparten por hoja; no se prueban otros modelos ocultos. La espera en cola y el total de hojas se cuentan aparte.</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      {([
                        ['call_timeout_seconds', 'Tiempo por intento (segundos)', 5, 60, 60],
                        ['max_attempts', 'Intentos totales por hoja', 1, 2, 2],
                        ['max_output_tokens', 'Espacio de respuesta (tokens)', 1024, 10000, 10000],
                      ] as const).map(([key, label, min, max, initial]) => <Field key={key} label={label}>
                        <Input aria-label={label} type="number" min={min} max={max} step={1} value={route.runtime_limits?.[key] ?? initial} onChange={(event) => onUpsert({ ...route, runtime_limits: { call_timeout_seconds: 60, max_attempts: 2, max_output_tokens: 10000, ...route.runtime_limits, [key]: event.currentTarget.value === '' ? 0 : Number(event.currentTarget.value) } })} />
                        <span className="text-xs text-muted">De {min} a {max}.</span>
                      </Field>)}
                    </div>
                    <p className="mt-3 text-xs text-muted">Con un solo intento no se ejecuta el respaldo. Más espacio de respuesta puede aumentar el consumo. Estos cambios se aplican a nuevos trabajos después de guardar; los ya enviados conservan su configuración.</p>
                  </fieldset>}

                  <div className="grid gap-2 md:grid-cols-3">
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><Bot className="h-3.5 w-3.5" /> Guardado</span><p className="mt-1 break-words text-sm font-semibold">{routeText(stage.configured?.provider, stage.configured?.model)}</p><p className="mt-1 text-xs text-muted">Versión {stage.configured?.config_version ?? 'no registrada'}{stage.configured?.fallback_provider ? ` · Alternativa si falla esta etapa: ${routeText(stage.configured.fallback_provider, stage.configured.fallback_model)}` : ''}</p></div>
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><ShieldCheck className="h-3.5 w-3.5" /> Efectivo</span><p className="mt-1 break-words text-sm font-semibold">{routeText(stage.effective?.provider, stage.effective?.model)}</p><p className="mt-1 text-xs text-muted">Origen: {stage.effective?.origin || 'institucional'} · Versión {stage.effective?.config_version ?? 'no registrada'}</p></div>
                    <div className="rounded-lg bg-surface-2 p-3"><span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted"><Activity className="h-3.5 w-3.5" /> Último observado</span><p className="mt-1 break-words text-sm font-semibold">{stage.observed ? routeText(stage.observed.provider, stage.observed.model) : 'No registrado'}</p><p className="mt-1 text-xs text-muted">{stage.observed ? `Versión ${stage.observed.config_version ?? 'no registrada'}${stage.observed.fallback_used ? ' · Usó respaldo' : ''}` : 'Aún no hay una ejecución trazable.'}</p></div>
                  </div>
                  {stage.configured?.runtime_limits && <p className="text-xs text-muted">Límites guardados de lectura: {stage.configured.runtime_limits.call_timeout_seconds} s por intento · {stage.configured.runtime_limits.max_attempts} intentos por hoja · {stage.configured.runtime_limits.max_output_tokens} tokens. Efectivos para los trabajos nuevos.</p>}
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
