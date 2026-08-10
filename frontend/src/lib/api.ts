import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { getReporter } from '@/lib/errorReporter';

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
const CSRF_COOKIE_NAME = 'xcalificator_csrf';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

function readCookie(name: string) {
  if (typeof document === 'undefined') return undefined;
  const prefix = encodeURIComponent(name) + '=';
  const item = document.cookie.split('; ').find((cookie) => cookie.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
}

export function setSessionExpiredHandler(handler: SessionExpiredHandler) {
  sessionExpiredHandler = handler;
}

export function resetSessionExpiryState() {
  sessionExpiryHandled = false;
}

/** Extrae el correlationId de las cabeceras de respuesta (si existe) */
function extractCorrelationId(error: AxiosError): string | undefined {
  return error.response?.headers?.['x-correlation-id'] as string | undefined;
}

/** Reporta un error HTTP a la capa de observabilidad (sanitizado automáticamente) */
function reportHttpError(error: AxiosError, config?: SessionRequestConfig) {
  const reporter = getReporter();
  const status = error.response?.status;
  const correlationId = extractCorrelationId(error);

  // No reportar errores de refresh (causarían loops)
  if (config?.url?.includes('/auth/refresh')) return;

  reporter.captureException(error, {
    route: typeof window !== 'undefined' ? window.location.pathname : undefined,
    httpStatus: status,
    correlationId,
  });
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
  const method = (sessionConfig.method ?? 'get').toLowerCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie(CSRF_COOKIE_NAME);
    if (csrfToken) sessionConfig.headers.set('X-CSRF-Token', csrfToken);
  }
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
      reportHttpError(error, config);
      return Promise.reject(error);
    }

    if (config._sessionRetried) {
      expireSession();
      reportHttpError(error, config);
      return Promise.reject(error);
    }

    config._sessionRetried = true;
    try {
      await refreshAccessToken();
      return api(config);
    } catch {
      expireSession();
      reportHttpError(error, config);
      return Promise.reject(error);
    }
  },
);

export interface ApiError {
  status: number;
  detail: string;
}

const TECHNICAL_DETAIL = /(request failed|status code|traceback|exception|stack trace|sql|axios|internal server|<html|undefined is not|cannot read propert|\{\s*"|\[object)/i;

function fallbackMessage(status: number) {
  if (status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
  if (status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return 'La información solicitada ya no está disponible.';
  if (status === 409) return 'No pudimos completar la acción porque la información cambió. Actualiza la página e intenta de nuevo.';
  if (status === 413) return 'El archivo es demasiado grande. Selecciona uno de menor tamaño e intenta nuevamente.';
  if (status === 422) return 'Revisa los campos marcados e intenta guardar nuevamente.';
  if (status === 429) return 'Has realizado demasiadas solicitudes. Espera unos segundos e intenta nuevamente.';
  if (status >= 500) return 'El servicio no está disponible en este momento. Intenta más tarde.';
  return 'No pudimos completar la acción. Revisa la información e intenta nuevamente.';
}

function safeUserDetail(detail: unknown, status: number) {
  if (typeof detail !== 'string') return fallbackMessage(status);
  const normalized = detail.trim();
  if (!normalized || normalized.length > 240 || TECHNICAL_DETAIL.test(normalized)) return fallbackMessage(status);
  return normalized;
}

/** Normaliza errores a mensajes accionables y evita exponer detalles internos. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as { detail?: unknown } | undefined;
    const detail = Array.isArray(data?.detail)
      ? fallbackMessage(status || 422)
      : safeUserDetail(data?.detail, status);
    return { status, detail };
  }
  if (error instanceof Error) return { status: 0, detail: safeUserDetail(error.message, 0) };
  return { status: 0, detail: fallbackMessage(0) };
}