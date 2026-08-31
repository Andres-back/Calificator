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

export interface OllamaModelEntry {
  provider_id: 'ollama' | 'ollama_local';
  model_id: string;
  label: string;
  capabilities: string[];
  origin: 'cloud_personal' | 'local_connector';
  connector_id?: string | null;
  connector_name?: string | null;
  available: boolean;
}

export interface OllamaConnector {
  id: string;
  name: string;
  platform: 'windows';
  version?: string | null;
  status: string;
  active: boolean;
  last_seen_at?: string | null;
  models: Array<{ model_id: string; capabilities: string[] }>;
}

export interface OllamaPairingCode {
  code: string;
  expires_at: string;
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

export async function refreshTeacherOllamaModels(): Promise<OllamaModelEntry[]> {
  const { data } = await api.post<OllamaModelEntry[]>('/profesor/ai-providers/ollama/models/refresh');
  return data;
}

export async function getTeacherOllamaModels(): Promise<OllamaModelEntry[]> {
  const { data } = await api.get<OllamaModelEntry[]>('/profesor/ai-providers/ollama/models');
  return data;
}

export async function getOllamaConnectors(): Promise<OllamaConnector[]> {
  const { data } = await api.get<OllamaConnector[]>('/profesor/ollama-connectors');
  return data;
}

export async function createOllamaPairingCode(): Promise<OllamaPairingCode> {
  const { data } = await api.post<OllamaPairingCode>('/profesor/ollama-connectors/pairing');
  return data;
}

export async function revokeOllamaConnector(connectorId: string): Promise<void> {
  await api.delete(`/profesor/ollama-connectors/${connectorId}`);
}
