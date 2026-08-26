import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AIModel, AIProvider, FeatureRouting } from '../../api';
import { clearCache, publishAIConfiguration, restorePreviousConfiguration, testProvider } from '../../api';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useAIMutations(
  draftProviders: AIProvider[],
  draftModels: AIModel[],
  draftFeatures: FeatureRouting[],
  hasConfigurationChanges: boolean,
  expectedVersion: number,
  setDraftProviders: (fn: (prev: AIProvider[]) => AIProvider[]) => void,
  setHasUnsavedChanges: (value: boolean) => void,
  setTestingProvider: (value: string | null) => void,
) {
  const invalidateConfiguration = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-ai-config-hash'] }),
    queryClient.invalidateQueries({ queryKey: ['admin-ai-audit'] }),
  ]);

  const testMutation = useMutation({
    mutationFn: ({ providerId, model, capability }: { providerId: string; model?: string | null; capability?: string | null }) => (
      testProvider(providerId, { model, capability })
    ),
    onSuccess: (result, variables) => {
      const providerId = variables.providerId;
      setDraftProviders((providers) => providers.map((provider) => (
        provider.id === providerId
          ? {
              ...provider,
              last_test_status: result.status,
              last_test_latency_ms: result.latency_ms,
              last_test_http_code: result.http_code,
              last_test_error: result.error,
            }
          : provider
      )));
      if (result.status === 'ok') toast.success(result.detail || 'Conexión comprobada.');
      else toast.error(result.detail || 'La conexión no pudo comprobarse.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
    onSettled: () => setTestingProvider(null),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!hasConfigurationChanges) return;
      await publishAIConfiguration(draftProviders, draftModels, draftFeatures, expectedVersion);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      void invalidateConfiguration();
      toast.success('Configuración de IA publicada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const restoreMutation = useMutation({
    mutationFn: restorePreviousConfiguration,
    onSuccess: () => {
      setHasUnsavedChanges(false);
      void invalidateConfiguration();
      toast.success('Se restauró la última configuración publicada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: () => toast.success('Caché de configuración invalidada.'),
    onError: (error) => toast.error(toApiError(error).detail),
  });

  return { testMutation, saveMutation, restoreMutation, clearCacheMutation };
}