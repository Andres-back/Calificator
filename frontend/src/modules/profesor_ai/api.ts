import { api } from '@/lib/api';
import type { AIModel, AIProvider, FeatureRouting, ProviderTestResult } from '@/modules/admin/api';

export type TeacherAIMode = 'institutional' | 'automatic' | 'advanced';

export interface TeacherAICredential {
  provider_id: string;
  configured: boolean;
  last_four?: string | null;
  last_test_status?: string | null;
  last_test_latency_ms?: number | null;
  last_test_at?: string | null;
}

export interface TeacherAIPreference {
  feature: string;
  provider: string | null;
  model: string | null;
  active: boolean;
}

export interface TeacherAIConfig {
  mode: TeacherAIMode;
  allow_institutional_fallback: boolean;
  active: boolean;
  version: number;
  providers: AIProvider[];
  models: AIModel[];
  features: FeatureRouting[];
  credentials: TeacherAICredential[];
  preferences: TeacherAIPreference[];
}

export interface TeacherAIConfigUpdate {
  expected_version: number;
  mode: TeacherAIMode;
  allow_institutional_fallback: boolean;
  active: boolean;
  preferences: TeacherAIPreference[];
}

export async function getTeacherAIConfig(): Promise<TeacherAIConfig> {
  const { data } = await api.get<TeacherAIConfig>('/profesor/ai-config');
  return data;
}

export async function saveTeacherAIConfig(payload: TeacherAIConfigUpdate): Promise<TeacherAIConfig> {
  const { data } = await api.put<TeacherAIConfig>('/profesor/ai-config', payload);
  return data;
}

export async function saveTeacherCredential(provider: string, apiKey: string): Promise<void> {
  await api.put(`/profesor/ai-credentials/${provider}`, { api_key: apiKey });
}

export async function deleteTeacherCredential(provider: string): Promise<void> {
  await api.delete(`/profesor/ai-credentials/${provider}`);
}

export async function testTeacherProvider(
  provider: string,
  options: { api_key?: string; model?: string | null; capability?: string } = {},
): Promise<ProviderTestResult> {
  const { data } = await api.post<ProviderTestResult>(`/profesor/ai-providers/${provider}/test`, options);
  return data;
}
