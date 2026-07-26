import { ChevronRight, Sliders } from 'lucide-react';
import { Card, Field, Select } from '@/components/ui';
import type { AIProvider, FeatureRouting } from '../../api';

function FeatureRoutingEditor({
  feature,
  providers,
  onUpdate,
}: {
  feature: FeatureRouting;
  providers: AIProvider[];
  onUpdate: (featureId: string, changes: Partial<FeatureRouting>) => void;
}) {
  const providerIds = providers.map((provider) => provider.id);
  const primaryOptions = providerIds.includes(feature.primary_provider) ? providerIds : [feature.primary_provider, ...providerIds];
  const fallbackOptions = feature.fallback_provider && !providerIds.includes(feature.fallback_provider)
    ? [feature.fallback_provider, ...providerIds]
    : providerIds;

  return (
    <Card className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,1fr)_minmax(160px,0.85fr)_auto_minmax(160px,0.85fr)_auto] lg:items-end">
      <div>
        <p className="font-semibold text-sm">{feature.label}</p>
        <p className="mt-1 text-xs text-muted">{feature.feature}</p>
      </div>
      <Field label="Principal">
        <Select value={feature.primary_provider} onChange={(event) => onUpdate(feature.feature, { primary_provider: event.currentTarget.value })}>
          {primaryOptions.map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
        </Select>
      </Field>
      <ChevronRight className="hidden h-5 w-5 self-center text-muted lg:block" aria-hidden="true" />
      <Field label="Fallback">
        <Select value={feature.fallback_provider ?? ''} onChange={(event) => onUpdate(feature.feature, { fallback_provider: event.currentTarget.value || null })}>
          <option value="">Sin fallback</option>
          {fallbackOptions.filter((providerId) => providerId !== feature.primary_provider).map((providerId) => <option key={providerId} value={providerId}>{providerId}</option>)}
        </Select>
      </Field>
      <label className="flex h-11 items-center gap-2 text-sm font-medium text-fg">
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600 focus-ring"
          checked={feature.active}
          onChange={(event) => onUpdate(feature.feature, { active: event.currentTarget.checked })}
        />
        Activo
      </label>
    </Card>
  );
}

export function FeatureRoutingSection({
  features,
  providers,
  onUpdate,
}: {
  features: FeatureRouting[];
  providers: AIProvider[];
  onUpdate: (featureId: string, changes: Partial<FeatureRouting>) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Sliders className="h-5 w-5 text-amber-500" />
        <div>
          <h2 className="font-display text-lg font-bold">Ruteo por funcionalidad</h2>
          <p className="text-sm text-muted">Define proveedor principal y fallback para cada capacidad.</p>
        </div>
      </div>
      <div className="grid gap-3">
        {features.map((feature) => (
          <FeatureRoutingEditor
            key={feature.feature}
            feature={feature}
            providers={providers}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </section>
  );
}
