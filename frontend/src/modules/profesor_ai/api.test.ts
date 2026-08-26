import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteTeacherCredential,
  getTeacherAIConfig,
  saveTeacherAIConfig,
  saveTeacherCredential,
  testTeacherProvider,
} from './api';

const transport = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: transport }));

afterEach(() => vi.clearAllMocks());

describe('teacher AI API', () => {
  it('uses owner-scoped endpoints and never receives a credential in config reads', async () => {
    transport.get.mockResolvedValue({ data: { credentials: [{ provider_id: 'open_code', configured: true, last_four: '1234' }] } });

    const result = await getTeacherAIConfig();

    expect(transport.get).toHaveBeenCalledWith('/profesor/ai-config');
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('api_key');
  });

  it('sends a key only to the dedicated credential endpoint', async () => {
    transport.put.mockResolvedValue({ data: { status: 'updated' } });

    await saveTeacherCredential('open_code', 'teacher-secret');

    expect(transport.put).toHaveBeenCalledWith('/profesor/ai-credentials/open_code', { api_key: 'teacher-secret' });
  });

  it('keeps preferences, test and deletion on their dedicated endpoints', async () => {
    transport.put.mockResolvedValue({ data: { version: 2 } });
    transport.post.mockResolvedValue({ data: { status: 'ok' } });
    transport.delete.mockResolvedValue({ data: undefined });

    await saveTeacherAIConfig({ expected_version: 1, mode: 'automatic', allow_institutional_fallback: true, active: true, preferences: [] });
    await testTeacherProvider('open_code', { capability: 'vision', model: 'qwen3.7-plus' });
    await deleteTeacherCredential('open_code');

    expect(transport.put).toHaveBeenCalledWith('/profesor/ai-config', expect.objectContaining({ expected_version: 1, mode: 'automatic' }));
    expect(transport.post).toHaveBeenCalledWith('/profesor/ai-providers/open_code/test', { capability: 'vision', model: 'qwen3.7-plus' });
    expect(transport.delete).toHaveBeenCalledWith('/profesor/ai-credentials/open_code');
  });
});
