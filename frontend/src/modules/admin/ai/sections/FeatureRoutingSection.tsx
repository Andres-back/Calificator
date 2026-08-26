import { ChevronRight, PlugZap, Sliders } from 'lucide-react';
import { Button, Card, Field, Select } from '@/components/ui';
import type { AIModel, AIProvider, FeatureRouting } from '../../api';

function compatibleModels(models: AIModel[], providerId: string, capability: string) {
  return models.filter((model) => (
    model.provider_id === providerId
    && model.active
    && model.capabilities.includes(capability)
  ));
}

function FeatureRoutingEditor({
  feature,
  providers,
  models,
  onUpdate,
  onTest,
  testingProvider,
  isTesting,
}: {
  feature: FeatureRouting;
  providers: AIProvider[];
  models: AIModel[];
  onUpdate: (featureId: string, changes: Partial<FeatureRouting>) => void;
  onTest: (providerId: string, model: string | null, capability: string) => void;
  testingProvider: string | null;
  isTesting: boolean;
}) {
  const capability = feature.capability ?? 'text';
  const availableProviders = providers.filter((provider) => (
    provider.active && compatibleModels(models, provider.id, capability).length > 0
  ));
  const providerIds = availableProviders.map((provider) => provider.id);
  const primaryOptions = providerIds.includes(feature.primary_provider) ? providerIds : [feature.primary_provider, ...providerIds];
  const fallbackOptions = feature.fallback_provider && !providerIds.includes(feature.fallback_provider)
    ? [feature.fallback_provider, ...providerIds]
    : providerIds;
  const primaryModels = compatibleModels(models, feature.primary_provider, capability);
  const fallbackModels = feature.fallback_provider
    ? compatibleModels(models, feature.fallback_provider, capability)
    : [];

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">{feature.label}</p>
          <p className="mt-1 text-xs text-muted">{feature.feature}</p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
          {capability}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_1fr_1fr] xl:items-end">
        <Field label="Proveedor principal">
          <Select
            value={feature.primary_provider}
            onChange={(event) => {
              const providerId = event.currentTarget.value;
              const recommended = compatibleModels(models, providerId, capability).find((model) => model.recommended)
                ?? compatibleModels(models, providerId, capability)[0];
              onUpdate(feature.feature, { primary_provider: providerId, primary_model: recommended?.model_id ?? null });
            }}
          >
            {primaryOptions.map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
          </Select>
        </Field>
        <Field label="Modelo principal">
          <Select value={feature.primary_model ?? ''} onChange={(event) => onUpdate(feature.feature, { primary_model: event.currentTarget.value || null })}>
            <option value="">Predeterminado del proveedor</option>
            {primaryModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}{model.recommended ? ' · recomendado' : ''}</option>)}
          </Select>
        </Field>
        <ChevronRight className="hidden h-5 w-5 self-center text-muted xl:block" aria-hidden="true" />
        <Field label="Proveedor de respaldo">
          <Select
            value={feature.fallback_provider ?? ''}
            onChange={(event) => {
              const providerId = event.currentTarget.value || null;
              const recommended = providerId
                ? compatibleModels(models, providerId, capability).find((model) => model.recommended) ?? compatibleModels(models, providerId, capability)[0]
                : undefined;
              onUpdate(feature.feature, { fallback_provider: providerId, fallback_model: recommended?.model_id ?? null });
            }}
          >
            <option value="">Sin respaldo</option>
            {fallbackOptions.filter((providerId) => providerId !== feature.primary_provider).map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
          </Select>
        </Field>
        <Field label="Modelo de respaldo">
          <Select disabled={!feature.fallback_provider} value={feature.fallback_model ?? ''} onChange={(event) => onUpdate(feature.feature, { fallback_model: event.currentTarget.value || null })}>
            <option value="">Predeterminado del proveedor</option>
            {fallbackModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-fg">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600 focus-ring"
            checked={feature.active}
            onChange={(event) => onUpdate(feature.feature, { active: event.currentTarget.checked })}
          />
          Ruta activa
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-fg">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-600 focus-ring"
            checked={Boolean(feature.rollout_enabled)}
            onChange={(event) => onUpdate(feature.feature, { rollout_enabled: event.currentTarget.checked })}
          />
          Aplicar a trabajos nuevos
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          loading={isTesting && testingProvider === feature.primary_provider}
          disabled={isTesting || !feature.primary_model}
          onClick={() => onTest(feature.primary_provider, feature.primary_model ?? null, capability)}
        >
          <PlugZap className="h-4 w-4" aria-hidden="true" />
          Probar modelo principal
        </Button>
      </div>
    </Card>
  );
}

export function FeatureRoutingSection({
  features,
  providers,
  models,
  onUpdate,
  onModelUpdate,
  onTest,
  testingProvider,
  isTesting,
}: {
  features: FeatureRouting[];
  providers: AIProvider[];
  models: AIModel[];
  onUpdate: (featureId: string, changes: Partial<FeatureRouting>) => void;
  onModelUpdate: (providerId: string, modelId: string, changes: Partial<AIModel>) => void;
  onTest: (providerId: string, model: string | null, capability: string) => void;
  testingProvider: string | null;
  isTesting: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sliders className="h-5 w-5 text-amber-500" />
        <div>
          <h2 className="font-display text-lg font-bold">Ruteo por capacidad</h2>
          <p className="text-sm text-muted">Solo aparecen modelos compatibles. Los cambios afectan trabajos nuevos al activar el rollout.</p>
        </div>
      </div>
      <details className="mb-5 rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer font-semibold text-sm text-fg">
          Catálogo de modelos · {models.filter((model) => model.active).length} activos
        </summary>
        <p className="mt-2 text-xs text-muted">Desactiva modelos retirados o no autorizados. Primero cambia cualquier ruta que todavía los use.</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {models.map((model) => {
            const inUse = features.some((feature) => feature.active && (
              (feature.primary_provider === model.provider_id && feature.primary_model === model.model_id)
              || (feature.fallback_provider === model.provider_id && feature.fallback_model === model.model_id)
            ));
            return (
              <label key={`${model.provider_id}:${model.model_id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{model.label}</span>
                  <span className="block truncate text-xs text-muted">{model.provider_id} · {model.capabilities.join(', ')}</span>
                  {inUse && <span className="block text-xs text-amber-700 dark:text-amber-300">Usado por una ruta activa</span>}
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-brand-600 focus-ring"
                  checked={model.active}
                  disabled={inUse && model.active}
                  onChange={(event) => onModelUpdate(model.provider_id, model.model_id, { active: event.currentTarget.checked })}
                  aria-label={`Activar modelo ${model.label}`}
                />
              </label>
            );
          })}
        </div>
      </details>
      <div className="grid gap-3">
        {features.map((feature) => (
          <FeatureRoutingEditor
            key={feature.feature}
            feature={feature}
            providers={providers}
            models={models}
            onUpdate={onUpdate}
            onTest={onTest}
            testingProvider={testingProvider}
            isTesting={isTesting}
          />
        ))}
      </div>
    </section>
  );
}