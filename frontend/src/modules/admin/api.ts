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
  active: boolean;
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
  features: FeatureRouting[];
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

export async function testProvider(providerId: string): Promise<ProviderTestResult> {
  const { data } = await api.post<ProviderTestResult>(`/admin/ai-providers/${providerId}/test`);
  return data;
}

export async function saveProviders(providers: AIProvider[]): Promise<ApiResponse> {
  const payload = providers.map(({ id, tipo, label, base_url, model, active, priority, timeout_seconds, max_retries }) => ({
    id,
    tipo,
    label,
    base_url,
    model,
    active,
    priority,
    timeout_seconds,
    max_retries,
  }));
  const { data } = await api.put<ApiResponse>('/admin/ai-providers', payload);
  return data;
}

export async function saveFeatures(features: FeatureRouting[]): Promise<ApiResponse> {
  const payload = features.map(({ feature, label, primary_provider, fallback_provider, active }) => ({
    feature,
    label,
    primary_provider,
    fallback_provider,
    active,
  }));
  const { data } = await api.put<ApiResponse>('/admin/ai-features', payload);
  return data;
}

export async function updateProvider(id: string, updates: Partial<AIProvider>): Promise<ApiResponse> {
  const { data } = await api.patch<ApiResponse>(`/admin/ai-providers/${id}`, updates);
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
