import type { AIProvider, FeatureRouting } from '../../api';

export function providerSnapshot(providers: AIProvider[] | undefined) {
  return JSON.stringify((providers ?? []).map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries }) => ({
    id,
    tipo,
    label,
    base_url,
    model,
    active,
    priority,
    timeout_seconds,
    max_retries,
  })));
}

export function featureSnapshot(features: FeatureRouting[] | undefined) {
  return JSON.stringify((features ?? []).map(({ feature, label, primary_provider, fallback_provider, active }) => ({
    feature,
    label,
    primary_provider,
    fallback_provider,
    active,
  })));
}
