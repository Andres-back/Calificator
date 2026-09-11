import { useEffect, useMemo, useState } from 'react';
import type { AIModel, AIProvider, FeatureRouting } from '../../api';
import { providerSnapshot, featureSnapshot, modelSnapshot } from '../utils/snapshots';

export function useAISettingsDraft(settingsData: { providers: AIProvider[]; models?: AIModel[]; features: FeatureRouting[] } | undefined) {
  const [draftProviders, setDraftProviders] = useState<AIProvider[]>([]);
  const [draftFeatures, setDraftFeatures] = useState<FeatureRouting[]>([]);
  const [draftModels, setDraftModels] = useState<AIModel[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData.providers) && Array.isArray(settingsData.features) && !hasUnsavedChanges) {
      setDraftProviders(settingsData.providers.map((provider) => ({ ...provider })));
      setDraftFeatures(settingsData.features.map((feature) => ({ ...feature })));
      setDraftModels((settingsData.models ?? []).map((model) => ({ ...model, capabilities: [...model.capabilities] })));
    }
  }, [hasUnsavedChanges, settingsData]);

  const providersChanged = useMemo(
    () => Boolean(settingsData) && providerSnapshot(draftProviders) !== providerSnapshot(settingsData!.providers),
    [draftProviders, settingsData],
  );
  const modelsChanged = useMemo(
    () => Boolean(settingsData) && modelSnapshot(draftModels) !== modelSnapshot(settingsData!.models),
    [draftModels, settingsData],
  );
  const featuresChanged = useMemo(
    () => Boolean(settingsData) && featureSnapshot(draftFeatures) !== featureSnapshot(settingsData!.features),
    [draftFeatures, settingsData],
  );

  function updateProvider(providerId: string, changes: Partial<AIProvider>) {
    setDraftProviders((providers) => providers.map((provider) => (
      provider.id === providerId ? { ...provider, ...changes } : provider
    )));
    setHasUnsavedChanges(true);
  }

  function updateModel(providerId: string, modelId: string, changes: Partial<AIModel>) {
    setDraftModels((models) => models.map((model) => (
      model.provider_id === providerId && model.model_id === modelId ? { ...model, ...changes } : model
    )));
    setHasUnsavedChanges(true);
  }

  function replaceProviderModels(providerId: string, nextModels: AIModel[]) {
    setDraftModels((models) => [
      ...models.filter((model) => model.provider_id !== providerId),
      ...nextModels.map((model) => ({ ...model, capabilities: [...model.capabilities] })),
    ]);
  }

  function updateFeature(featureId: string, changes: Partial<FeatureRouting>) {
    setDraftFeatures((features) => features.map((feature) => (
      feature.feature === featureId ? { ...feature, ...changes } : feature
    )));
    setHasUnsavedChanges(true);
  }

  function upsertFeature(feature: FeatureRouting) {
    setDraftFeatures((features) => {
      const exists = features.some((item) => item.feature === feature.feature);
      return exists
        ? features.map((item) => item.feature === feature.feature ? { ...item, ...feature } : item)
        : [...features, feature];
    });
    setHasUnsavedChanges(true);
  }

  function removeFeature(featureId: string) {
    setDraftFeatures((features) => features.filter((feature) => feature.feature !== featureId));
    setHasUnsavedChanges(true);
  }

  return {
    draftProviders,
    draftModels,
    draftFeatures,
    hasUnsavedChanges,
    providersChanged,
    modelsChanged,
    featuresChanged,
    updateProvider,
    updateModel,
    replaceProviderModels,
    updateFeature,
    upsertFeature,
    removeFeature,
    setDraftProviders,
    setHasUnsavedChanges,
  };
}
