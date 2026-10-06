import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, CanceledError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { getReporter } from './errorReporter';
import { api, resetSessionExpiryState, setSessionExpiredHandler, toApiError } from './api';

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
  it('does not report intentional query cancellation or refresh the session', async () => {
    const report = vi.spyOn(getReporter(), 'captureException');
    const expired = vi.fn();
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => { throw new CanceledError('canceled', config); });
    api.defaults.adapter = adapter;
    setSessionExpiredHandler(expired);
    try {
      await expect(api.get('/materias/test/asistencia')).rejects.toBeInstanceOf(CanceledError);
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(expired).not.toHaveBeenCalled();
      expect(report).not.toHaveBeenCalled();
    } finally { report.mockRestore(); }
  });
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
describe('user-facing API errors', () => {
  it('does not expose technical transport details', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const response = {
      data: { detail: 'Request failed with status code 503: internal server exception' },
      status: 503,
      statusText: 'Error',
      headers: {},
      config,
    } as AxiosResponse;
    const error = new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response);

    expect(toApiError(error)).toEqual({
      status: 503,
      detail: 'El servicio no está disponible en este momento. Intenta más tarde.',
    });
  });
});
