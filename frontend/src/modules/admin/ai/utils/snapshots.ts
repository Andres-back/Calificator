import type { AIModel, AIProvider, FeatureRouting } from '../../api';

export function providerSnapshot(providers: AIProvider[] | undefined) {
  return JSON.stringify((providers ?? []).map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, allow_teacher_credentials, allow_institutional_fallback }) => ({
    id,
    tipo,
    label,
    base_url,
    model,
    active,
    priority,
    timeout_seconds,
    max_retries,
    allow_teacher_credentials,
    allow_institutional_fallback,
  })));
}

export function featureSnapshot(features: FeatureRouting[] | undefined) {
  return JSON.stringify((features ?? []).map(({ feature, label, capability, primary_provider, primary_model, fallback_provider, fallback_model, rollout_enabled, active }) => ({
    feature,
    label,
    capability,
    primary_provider,
    primary_model,
    fallback_provider,
    fallback_model,
    rollout_enabled,
    active,
  })));
}

export function modelSnapshot(models: AIModel[] | undefined) {
  return JSON.stringify((models ?? []).map(({ provider_id, model_id, label, capabilities, recommended, active, max_context_tokens }) => ({
    provider_id,
    model_id,
    label,
    capabilities,
    recommended,
    active,
    max_context_tokens,
  })));
}