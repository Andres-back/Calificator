import { describe, expect, it } from 'vitest';
import type { AIModel, AIProvider, FeatureRouting } from '../../api';
import { routePreparationIssues } from './routePreparation';

const providers = [{ id: 'api', model: 'new' }, { id: 'ollama', model: 'native' }] as AIProvider[];
const models = [
  { provider_id: 'api', model_id: 'new', runtime_profile: { protocol: 'responses' }, verification_id: 'proof' },
  { provider_id: 'api', model_id: 'backup', runtime_profile: { protocol: 'chat_completions' }, verification_id: 'proof2' },
  { provider_id: 'ollama', model_id: 'native', label: 'Respaldo anterior' },
] as AIModel[];
const previous = { feature: 'calificacion.extraccion', capability: 'vision', primary_provider: 'api', primary_model: 'old', fallback_provider: 'ollama', fallback_model: 'native' } as FeatureRouting;

describe('route preparation guidance', () => {
  it('identifies only the legacy fallback after choosing a proven primary', () => {
    expect(routePreparationIssues({ ...previous, primary_model: 'new' }, previous, providers, models)).toEqual([
      expect.objectContaining({ slot: 'fallback', modelId: 'native', providerId: 'ollama' }),
    ]);
  });
  it('does not silently change the fallback and accepts an explicit proven replacement', () => {
    const next = { ...previous, primary_model: 'new', fallback_provider: 'api', fallback_model: 'backup' };
    expect(routePreparationIssues(next, previous, providers, models)).toEqual([]);
    expect(previous.fallback_provider).toBe('ollama');
  });
  it('accepts explicit removal and does not block untouched legacy routes', () => {
    expect(routePreparationIssues(previous, previous, providers, models)).toEqual([]);
    expect(routePreparationIssues({ ...previous, primary_model: 'new', fallback_provider: null, fallback_model: null }, previous, providers, models)).toEqual([]);
  });
  it('requires a proof for an unprepared new API model, not by name', () => {
    const issues = routePreparationIssues({ ...previous, primary_model: 'future', fallback_provider: null }, previous, providers, models);
    expect(issues).toEqual([expect.objectContaining({ slot: 'primary', modelId: 'future' })]);
  });
});
