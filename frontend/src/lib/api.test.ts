import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { api, resetSessionExpiryState, setSessionExpiredHandler } from './api';

const originalAdapter = api.defaults.adapter;

function httpFailure(config: InternalAxiosRequestConfig, status: number) {
  const response = {
    data: { detail: `HTTP ${status}` },
    status,
    statusText: 'Error',
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response);
}

beforeEach(() => {
  resetSessionExpiryState();
  window.history.replaceState({}, '', '/login');
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
  setSessionExpiredHandler(() => undefined);
  resetSessionExpiryState();
});

describe('session interceptor', () => {
  it('clears application session state after a 401 and failed refresh', async () => {
    const onExpired = vi.fn();
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw httpFailure(config, 401);
    });
    api.defaults.adapter = adapter;
    setSessionExpiredHandler(onExpired);

    await expect(api.get('/protected-resource')).rejects.toBeInstanceOf(AxiosError);

    expect(adapter.mock.calls.map(([config]) => (config as InternalAxiosRequestConfig).url)).toEqual([
      '/protected-resource',
      '/auth/refresh',
    ]);
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('does not clear session or refresh a token for a 403 authorization error', async () => {
    const onExpired = vi.fn();
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => {
      throw httpFailure(config, 403);
    });
    api.defaults.adapter = adapter;
    setSessionExpiredHandler(onExpired);

    await expect(api.get('/forbidden-resource')).rejects.toBeInstanceOf(AxiosError);

    expect(adapter.mock.calls.map(([config]) => (config as InternalAxiosRequestConfig).url)).toEqual([
      '/forbidden-resource',
    ]);
    expect(onExpired).not.toHaveBeenCalled();
  });
});