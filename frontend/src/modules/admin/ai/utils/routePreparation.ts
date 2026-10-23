import type { AIModel, AIProvider, FeatureRouting } from '../../api';

export type ModelPreparationSelection = { providerId: string; modelId: string; capability: string };
export type RoutePreparationIssue = ModelPreparationSelection & { slot: 'primary' | 'fallback'; label: string };

/** Advisory guidance only. The server still validates the actual proof and dependencies. */
export function routePreparationIssues(route: FeatureRouting, previous: FeatureRouting | undefined, providers: AIProvider[], models: AIModel[]): RoutePreparationIssue[] {
  const capability = route.capability ?? 'text';
  if (!['text', 'vision'].includes(capability)) return [];
  const fields = ['primary_provider', 'primary_model', 'fallback_provider', 'fallback_model', 'active', 'rollout_enabled'] as const;
  if (previous && fields.every((field) => route[field] === previous[field])) return [];
  const selections = (['primary', 'fallback'] as const).map((slot) => {
    const providerId = route[`${slot}_provider`] || '';
    const modelId = route[`${slot}_model`] || providers.find((p) => p.id === providerId)?.model || '';
    return { slot, providerId, modelId, model: models.find((m) => m.provider_id === providerId && m.model_id === modelId) };
  });
  const profiled = selections.some((s) => s.model?.runtime_profile);
  return selections.filter((s) => {
    if (!s.providerId || s.providerId === 'template') return false;
    if (s.model?.runtime_profile) return !s.model.verification_id;
    const unchangedSelection = previous && (['primary', 'fallback'] as const).some((slot) => previous[`${slot}_provider`] === s.providerId && previous[`${slot}_model`] === s.modelId);
    return profiled || (!unchangedSelection && s.providerId !== 'ollama');
  }).map(({ slot, providerId, modelId, model }) => ({ slot, providerId, modelId, capability, label: model?.label || modelId }));
}
