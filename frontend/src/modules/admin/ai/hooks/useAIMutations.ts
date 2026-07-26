import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { AIProvider } from '../../api';
import { testProvider, saveProviders, saveFeatures, restoreDefaults, clearCache } from '../../api';
import { toApiError } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export function useAIMutations(
  draftProviders: AIProvider[],
  draftFeatures: { feature: string; label: string; primary_provider: string; fallback_provider: string | null; active: boolean }[],
  providersChanged: boolean,
  featuresChanged: boolean,
  setDraftProviders: (fn: (prev: AIProvider[]) => AIProvider[]) => void,
  setHasUnsavedChanges: (value: boolean) => void,
  setTestingProvider: (value: string | null) => void,
) {
  const testMutation = useMutation({
    mutationFn: (providerId: string) => testProvider(providerId),
    onSuccess: (result, providerId) => {
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
      const operations: Promise<unknown>[] = [];
      if (providersChanged) operations.push(saveProviders(draftProviders));
      if (featuresChanged) operations.push(saveFeatures(draftFeatures));
      await Promise.all(operations);
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-config-hash'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-audit'] }),
      ]);
      toast.success('Configuración de IA guardada.');
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreDefaults,
    onSuccess: () => {
      setHasUnsavedChanges(false);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-ai-settings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-config-hash'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-ai-audit'] }),
      ]);
      toast.success('Configuración restaurada a valores predeterminados.');
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
