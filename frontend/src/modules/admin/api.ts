import { api } from '@/lib/api';

export interface AIProvider {
  /** Canonical persisted identifier used by save/update/test endpoints. */
  id: string;
  /** Retained by the backend for compatibility with existing consumers. */
  name: string;
  tipo: 'texto' | 'imagen' | string;
  label: string;
  base_url: string | null;
  model: string | null;
  active: boolean;
  priority: number;
  timeout_seconds: number;
  max_retries: number;
  allow_teacher_credentials?: boolean;
  allow_institutional_fallback?: boolean;
  config_version?: number;
  auth_configured?: boolean;
  last_test_status?: string | null;
  last_test_latency_ms?: number | null;
  last_test_http_code?: number | null;
  last_test_error?: string | null;
  last_test_at?: string | null;
}

export interface FeatureRouting {
  feature: string;
  label: string;
  primary_provider: string;
  primary_model?: string | null;
  fallback_provider: string | null;
  fallback_model?: string | null;
  capability?: 'text' | 'vision' | 'image' | 'embedding' | string;
  rollout_enabled?: boolean;
  config_version?: number;
  active: boolean;
}

export interface AIModel {
  provider_id: string;
  model_id: string;
  label: string;
  capabilities: string[];
  recommended: boolean;
  active: boolean;
  max_context_tokens?: number | null;
}

export interface GlobalAIConfig {
  modelo_llm_default: string | null;
  has_openai_key: boolean;
  has_cloudflare: boolean;
  has_groq_key: boolean;
  has_open_code_key: boolean;
  cloudflare_account_id?: string | null;
  credential_sources?: Record<string, 'database' | 'environment' | 'mixed' | 'not_configured' | string>;
}

export interface GlobalAIConfigUpdate {
  openai_key?: string;
  groq_key?: string;
  open_code_key?: string;
  cloudflare_token?: string;
  cloudflare_account_id?: string | null;
  modelo_llm_default?: string | null;
  clear_openai_key?: boolean;
  clear_groq_key?: boolean;
  clear_open_code_key?: boolean;
  clear_cloudflare_token?: boolean;
  clear_cloudflare_account_id?: boolean;
}

export interface UsageStats {
  total_calls: number;
  total_tokens_input: number;
  total_tokens_output: number;
  total_cost: number;
  by_provider: { provider: string; calls: number; cost: number }[];
}

export interface AISettings {
  providers: AIProvider[];
  models?: AIModel[];
  features: FeatureRouting[];
  version?: number;
  global_config: GlobalAIConfig;
  usage: UsageStats;
}

export interface ProviderTestResult {
  status: string;
  latency_ms: number | null;
  http_code: number | null;
  error: string | null;
  detail: string;
}

export interface ApiResponse {
  status: string;
  detail?: string;
  message?: string;
}

export interface AIConfigHash {
  backend_hash: string;
  worker_hash: string | null;
  consistent: boolean;
  backend_source: string;
  worker_source: string;
  worker_error: string | null;
}

export interface AIAuditLog {
  action: string;
  entity: string;
  entity_id: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  result: string;
  created_at: string | null;
}

export interface AIAuditResponse {
  total: number;
  limit: number;
  offset: number;
  logs: AIAuditLog[];
}

export async function getAISettings(): Promise<AISettings> {
  const { data } = await api.get<AISettings>('/admin/ai-settings');
  return data;
}

export async function updateGlobalAIConfig(payload: GlobalAIConfigUpdate): Promise<ApiResponse> {
  const { data } = await api.patch<ApiResponse>('/admin/ai-config', payload);
  return data;
}

export async function testProvider(
  providerId: string,
  payload?: { model?: string | null; capability?: string | null },
): Promise<ProviderTestResult> {
  const { data } = await api.post<ProviderTestResult>(
    `/admin/ai-providers/${providerId}/test`,
    payload ?? {},
  );
  return data;
}

export async function publishAIConfiguration(
  providers: AIProvider[],
  models: AIModel[],
  features: FeatureRouting[],
  expectedVersion: number,
): Promise<ApiResponse & { version?: number }> {
  const { data } = await api.put<ApiResponse & { version?: number }>('/admin/ai-settings/publish', {
    expected_version: expectedVersion,
    providers: providers.map(({ id, name, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, allow_teacher_credentials, allow_institutional_fallback, config_version }) => ({
      id, name, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries,
      allow_teacher_credentials, allow_institutional_fallback, config_version,
    })),
    models: models.map(({ provider_id, model_id, label, capabilities, recommended, active, max_context_tokens }) => ({
      provider_id, model_id, label, capabilities, recommended, active, max_context_tokens,
    })),
    features: features.map(({ feature, label, capability, primary_provider, primary_model, fallback_provider, fallback_model, rollout_enabled, config_version, active }) => ({
      feature, label, capability, primary_provider, primary_model, fallback_provider,
      fallback_model, rollout_enabled, config_version, active,
    })),
  });
  return data;
}
export async function saveProviders(providers: AIProvider[]): Promise<ApiResponse> {
  const payload = providers.map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries, allow_teacher_credentials, allow_institutional_fallback, config_version }) => ({
    id,
    tipo,
    label,
    base_url,
    model,
    active,
    priority,
    timeout_seconds,
    max_retries,
    ...(allow_teacher_credentials !== undefined ? { allow_teacher_credentials } : {}),
    ...(allow_institutional_fallback !== undefined ? { allow_institutional_fallback } : {}),
    ...(config_version !== undefined ? { config_version } : {}),
  }));
  const { data } = await api.put<ApiResponse>('/admin/ai-providers', payload);
  return data;
}

export async function saveFeatures(features: FeatureRouting[], expectedVersion: number): Promise<ApiResponse> {
  const payload = features.map(({ feature, label, capability, primary_provider, primary_model, fallback_provider, fallback_model, rollout_enabled, config_version, active }) => ({
    feature,
    label,
    capability,
    primary_provider,
    primary_model,
    fallback_provider,
    fallback_model,
    rollout_enabled,
    config_version,
    active,
  }));
  const { data } = await api.put<ApiResponse>('/admin/ai-features', {
    expected_version: expectedVersion,
    features: payload,
  });
  return data;
}

export async function updateProvider(id: string, updates: Partial<AIProvider>): Promise<ApiResponse> {
  const { data } = await api.patch<ApiResponse>(`/admin/ai-providers/${id}`, updates);
  return data;
}

export async function restorePreviousConfiguration(): Promise<ApiResponse & { version?: number }> {
  const { data } = await api.post<ApiResponse & { version?: number }>('/admin/ai-settings/restore-previous');
  return data;
}
export async function restoreDefaults(): Promise<ApiResponse> {
  const { data } = await api.post<ApiResponse>('/admin/ai-settings/restore-defaults');
  return data;
}

export async function clearCache(): Promise<ApiResponse> {
  const { data } = await api.post<ApiResponse>('/admin/ai-cache/clear');
  return data;
}

export async function getConfigHash(): Promise<AIConfigHash> {
  const { data } = await api.get<AIConfigHash>('/admin/ai-config-hash');
  return data;
}

export async function getAiUsage(): Promise<UsageStats> {
  const { data } = await api.get<UsageStats>('/admin/ai-usage');
  return data;
}

export async function getAIAudit(limit = 8): Promise<AIAuditResponse> {
  const { data } = await api.get<AIAuditResponse>('/admin/ai-audit', { params: { limit } });
  return data;
}
