import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

/**
 * Cliente HTTP autenticado por cookies HttpOnly. Nunca persiste ni expone tokens
 * en JavaScript; Vite proxea /api al backend durante el desarrollo.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

interface SessionRequestConfig extends InternalAxiosRequestConfig {
  _sessionRetried?: boolean;
  skipSessionRefresh?: boolean;
  _sessionAbortController?: AbortController;
}

type SessionExpiredHandler = () => void;

const AUTH_PATHS_WITHOUT_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];
const pendingRequestControllers = new Set<AbortController>();
let refreshPromise: Promise<void> | null = null;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
let sessionExpiryHandled = false;

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  sessionExpiredHandler = handler;
}

export function resetSessionExpiryState() {
  sessionExpiryHandled = false;
}

function isAuthPathWithoutRefresh(config: SessionRequestConfig) {
  const url = config.url ?? '';
  return config.skipSessionRefresh || AUTH_PATHS_WITHOUT_REFRESH.some((path) => url.includes(path));
}

function releaseRequest(config?: SessionRequestConfig) {
  if (config?._sessionAbortController) {
    pendingRequestControllers.delete(config._sessionAbortController);
  }
}

function expireSession() {
  if (sessionExpiryHandled) return;
  sessionExpiryHandled = true;

  pendingRequestControllers.forEach((controller) => controller.abort());
  pendingRequestControllers.clear();
  sessionExpiredHandler?.();

  if (typeof window === 'undefined' || window.location.pathname === '/login') return;

  toast.error('Tu sesión expiró. Inicia sesión nuevamente.', { id: 'session-expired' });
  window.location.assign('/login?reason=session-expired');
}

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh', undefined, { skipSessionRefresh: true } as SessionRequestConfig)
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const sessionConfig = config as SessionRequestConfig;
  if (!sessionConfig.signal) {
    const controller = new AbortController();
    sessionConfig.signal = controller.signal;
    sessionConfig._sessionAbortController = controller;
    pendingRequestControllers.add(controller);
  }
  return sessionConfig;
});

api.interceptors.response.use(
  (response) => {
    releaseRequest(response.config as SessionRequestConfig);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as SessionRequestConfig | undefined;
    releaseRequest(config);

    if (error.response?.status !== 401 || !config || isAuthPathWithoutRefresh(config)) {
      return Promise.reject(error);
    }

    if (config._sessionRetried) {
      expireSession();
      return Promise.reject(error);
    }

    config._sessionRetried = true;
    try {
      await refreshAccessToken();
      return api(config);
    } catch {
      expireSession();
      return Promise.reject(error);
    }
  },
);

export interface ApiError {
  status: number;
  detail: string;
}

/** Normaliza errores de Axios a un mensaje legible para la interfaz. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as { detail?: unknown } | undefined;
    let detail = 'Ocurrió un error inesperado.';
    if (typeof data?.detail === 'string') detail = data.detail;
    else if (Array.isArray(data?.detail)) {
      detail = data.detail.map((item: { msg?: unknown }) => item?.msg).filter(Boolean).join(' · ') || detail;
    } else if (status === 0) {
      detail = 'No se pudo conectar con el servidor.';
    }
    return { status, detail };
  }
  if (error instanceof Error) return { status: 0, detail: error.message };
  return { status: 0, detail: 'Ocurrió un error inesperado.' };
}