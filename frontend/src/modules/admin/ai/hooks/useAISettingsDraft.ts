import { useEffect, useMemo, useState } from 'react';
import type { AIProvider, FeatureRouting } from '../../api';
import { providerSnapshot, featureSnapshot } from '../utils/snapshots';

export function useAISettingsDraft(settingsData: { providers: AIProvider[]; features: FeatureRouting[] } | undefined) {
  const [draftProviders, setDraftProviders] = useState<AIProvider[]>([]);
  const [draftFeatures, setDraftFeatures] = useState<FeatureRouting[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (settingsData && Array.isArray(settingsData.providers) && Array.isArray(settingsData.features) && !hasUnsavedChanges) {
      setDraftProviders(settingsData.providers.map((provider) => ({ ...provider })));
      setDraftFeatures(settingsData.features.map((feature) => ({ ...feature })));
    }
  }, [hasUnsavedChanges, settingsData]);

  const providersChanged = useMemo(
    () => Boolean(settingsData) && providerSnapshot(draftProviders) !== providerSnapshot(settingsData!.providers),
    [draftProviders, settingsData],
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

  function updateFeature(featureId: string, changes: Partial<FeatureRouting>) {
    setDraftFeatures((features) => features.map((feature) => (
      feature.feature === featureId ? { ...feature, ...changes } : feature
    )));
    setHasUnsavedChanges(true);
  }

  return {
    draftProviders,
    draftFeatures,
    hasUnsavedChanges,
    providersChanged,
    featuresChanged,
    updateProvider,
    updateFeature,
    setDraftProviders,
    setHasUnsavedChanges,
  };
}
