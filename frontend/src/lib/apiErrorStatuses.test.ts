import { describe, expect, it } from 'vitest';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from './api';

function errorFor(status: number) {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  const response = {
    data: { detail: 'Request failed with status code and internal server exception' },
    status,
    statusText: 'Error',
    headers: {},
    config,
  } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, response);
}

describe('safe user-facing status handling', () => {
  const expected: Record<number, RegExp> = {
    401: /sesi[oó]n/i,
    403: /permiso/i,
    409: /informaci[oó]n cambi[oó]/i,
    413: /archivo es demasiado grande/i,
    422: /campos marcados/i,
    429: /demasiadas solicitudes/i,
    500: /servicio no est[aá] disponible/i,
  };

  Object.entries(expected).forEach(([statusText, pattern]) => {
    const status = Number(statusText);
    it(`maps HTTP ${status} to a safe actionable message`, () => {
      const result = toApiError(errorFor(status));
      expect(result.status).toBe(status);
      expect(result.detail).toMatch(pattern);
      expect(result.detail).not.toMatch(/request failed|exception|stack|axios/i);
    });
  });
});
