import type { AIModel, AIProvider, FeatureRouting } from '../../api';

export function providerSnapshot(providers: AIProvider[] | undefined) {
  return JSON.stringify((providers ?? []).map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, allow_teacher_credentials, allow_institutional_fallback, credential_revision }) => ({
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
    credential_revision,
  })));
}

export function featureSnapshot(features: FeatureRouting[] | undefined) {
  return JSON.stringify((features ?? []).map(({ feature, label, capability, primary_provider, primary_model, fallback_provider, fallback_model, rollout_enabled, active, runtime_limits }) => ({
    feature,
    label,
    capability,
    primary_provider,
    primary_model,
    fallback_provider,
    fallback_model,
    rollout_enabled,
    runtime_limits,
    active,
  })));
}

export function modelSnapshot(models: AIModel[] | undefined) {
  return JSON.stringify((models ?? []).map(({ provider_id, model_id, label, capabilities, recommended, active, max_context_tokens, runtime_profile, verification_id }) => ({
    provider_id,
    model_id,
    label,
    capabilities,
    recommended,
    active,
    max_context_tokens,
    runtime_profile,
    verification_id,
  })));
}
