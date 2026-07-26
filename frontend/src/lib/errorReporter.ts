/**
 * Capa de observabilidad frontend desacoplada.
 *
 * En desarrollo: consola sanitizada.
 * En producción: interfaz para conectar Sentry u otra herramienta externa
 *                sin acoplar el resto de la aplicación.
 *
 * Regla fundamental: NUNCA loguear tokens, cookies, API keys, contraseñas,
 * respuestas completas de estudiantes, imágenes, prompts completos, datos
 * personales (nombres, emails, IDs de persona).
 */

/* ------------------------------------------------------------------ */
/*  Tipos públicos                                                     */
/* ------------------------------------------------------------------ */

/**
 * Contexto seguro asociado a un error.
 *
 * - `role`: solo valores anonimizados.
 * - `route`: ruta de la aplicación, sin query params sensibles.
 * - `httpStatus`: código HTTP si aplica.
 * - `correlationId`: id de correlación del backend (si existe).
 * - `frontendVersion`: hash del build o versión del frontend.
 */
export interface SafeErrorContext {
  route?: string;
  role?: 'admin' | 'profesor' | 'estudiante' | 'anonimo';
  httpStatus?: number;
  correlationId?: string;
  frontendVersion?: string;
}

/**
 * Interfaz desacoplada de reporte de errores.
 * La aplicación solo depende de esta interfaz; la implementación concreta
 * se intercambia sin tocar el resto del código.
 */
export interface FrontendErrorReporter {
  captureException(error: unknown, context?: SafeErrorContext): void;
  captureMessage(message: string, context?: SafeErrorContext): void;
}

/* ------------------------------------------------------------------ */
/*  PII — Patrones de datos personales / sensibles                     */
/* ------------------------------------------------------------------ */

/** Regex de reemplazo para datos personales y sensibles */
const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Emails
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // Tokens JWT (Bearer eyJ...)
  { pattern: /Bearer\s+eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, replacement: 'Bearer [JWT]' },
  // Tokens genéricos en cabeceras / cookies
  { pattern: /(token|jwt|session|auth|access_token|refresh_token)[=:]["']?[a-zA-Z0-9_.-]{8,}/gi, replacement: '$1=[REDACTED]' },
  // API keys
  { pattern: /(api[_-]?key|apikey|secret|password|passwd|contraseña)[=:]["']?[a-zA-Z0-9_.-]{8,}/gi, replacement: '$1=[REDACTED]' },
  // Números de documento / identificación (8+ dígitos consecutivos)
  { pattern: /\b\d{8,}\b/g, replacement: '[ID-NUMBER]' },
  // URLs con query params que puedan contener datos (tokens, codes)
  { pattern: /(\?|&)(token|code|access_token|state|session)=[^&\s]+/gi, replacement: '$1$2=[REDACTED]' },
  // Cookies serializadas
  { pattern: /(cookie|cookies?)[=:]["']?[^"'\s]{4,}/gi, replacement: '$1=[REDACTED]' },
  // Nombres de persona (2+ palabras con mayúscula inicial — catch básico)
  // Se aplica solo en ciertos contextos para evitar falsos positivos
];

/** Roles permitidos */
const VALID_ROLES = new Set(['admin', 'profesor', 'estudiante', 'anonimo']);

/* ------------------------------------------------------------------ */
/*  Helpers de sanitización                                            */
/* ------------------------------------------------------------------ */

/** Sanitiza un string eliminando o enmascarando PII */
export function sanitize(input: string): string {
  let result = input;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Intenta convertir cualquier error a un string sanitizado */
function errorToString(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Extrae contexto sanitizado de un error (para log adicional) */
function extractSafeDetails(error: unknown): Record<string, string> {
  const details: Record<string, string> = {};
  if (error instanceof Error && error.stack) {
    // Solo primeras 3 líneas del stack — suficiente para depurar sin exponer
    // datos de la app que puedan contener inputs de usuario
    const lines = error.stack.split('\n').slice(0, 4);
    details.stack = lines.map((l) => sanitize(l.trim())).join(' | ');
  }
  return details;
}

/** Anonimiza un mensaje de error: extrae PII y acorta si es necesario */
function sanitizeError(error: unknown): { message: string; details: Record<string, string> } {
  const raw = errorToString(error);
  const message = sanitize(raw).slice(0, 2000);
  const details = extractSafeDetails(error);
  return { message, details };
}

/** Construye un tag para el contexto (previene inyección de datos en el tag) */
function safeContextTag(context?: SafeErrorContext): string {
  if (!context) return '';
  const parts: string[] = [];
  if (context.route) parts.push(`route=${context.route}`);
  if (context.role && VALID_ROLES.has(context.role)) parts.push(`role=${context.role}`);
  if (context.httpStatus) parts.push(`http=${context.httpStatus}`);
  if (context.correlationId) parts.push(`cid=${sanitize(context.correlationId).slice(0, 36)}`);
  if (context.frontendVersion) parts.push(`v=${sanitize(context.frontendVersion).slice(0, 20)}`);
  return parts.length > 0 ? `[${parts.join(' ')}]` : '';
}

/* ------------------------------------------------------------------ */
/*  Implementación por defecto: consola sanitizada                     */
/* ------------------------------------------------------------------ */

/** Versión del frontend (inyectada por Vite o fallback) */
const APP_VERSION: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production'
    ? 'production'
    : 'development');

/**
 * Implementación concreta que logea a la consola con sanitización.
 * - En desarrollo: más verboso (incluye stack detallado)
 * - En producción: mínimo, sin datos sensibles
 */
function createConsoleReporter(): FrontendErrorReporter {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

  function captureException(error: unknown, context?: SafeErrorContext): void {
    const { message, details } = sanitizeError(error);
    const tag = safeContextTag(context);

    if (isDev) {
      console.group(`%c[ErrorReporter]${tag ? ' ' + tag : ''}`, 'color:#ef4444;font-weight:bold');
      console.error('Error:', message);
      if (Object.keys(details).length > 0) {
        console.warn('Details:', details);
      }
      if (context) {
        console.info('Context:', JSON.stringify(context, null, 2));
      }
      console.groupEnd();
    } else {
      console.warn(`[ErrorReporter]${tag ? ' ' + tag : ''}`, message);
    }
  }

  function captureMessage(message: string, context?: SafeErrorContext): void {
    const sanitized = sanitize(message).slice(0, 2000);
    const tag = safeContextTag(context);

    if (isDev) {
      console.info(`%c[ErrorReporter]${tag ? ' ' + tag : ''}`, 'color:#3b82f6', sanitized);
    } else {
      console.info(`[ErrorReporter]${tag ? ' ' + tag : ''}`, sanitized);
    }
  }

  return { captureException, captureMessage };
}

/* ------------------------------------------------------------------ */
/*  Singleton — punto único de acceso                                  */
/* ------------------------------------------------------------------ */

let _reporter: FrontendErrorReporter | null = null;

/**
 * Obtiene el reporter activo.
 * Por defecto: consola sanitizada.
 * En producción: puede ser reemplazado por `setReporter()` para conectar
 * una herramienta externa (Sentry, Datadog, etc.) sin modificar la app.
 */
export function getReporter(): FrontendErrorReporter {
  if (!_reporter) {
    _reporter = createConsoleReporter();
  }
  return _reporter;
}

/**
 * Reemplaza el reporter activo.
 * Útil para conectar herramientas externas en producción.
 *
 * Ejemplo:
 * ```ts
 * import { setReporter, type FrontendErrorReporter } from '@/lib/errorReporter';
 * import * as Sentry from '@sentry/react';
 *
 * const sentryReporter: FrontendErrorReporter = {
 *   captureException(error, ctx) {
 *     Sentry.captureException(error, { tags: ctx });
 *   },
 *   captureMessage(message, ctx) {
 *     Sentry.captureMessage(message, { tags: ctx });
 *   },
 * };
 *
 * setReporter(sentryReporter);
 * ```
 */
export function setReporter(reporter: FrontendErrorReporter): void {
  _reporter = reporter;
}

/**
 * Reinicia el reporter al valor por defecto (consola sanitizada).
 */
export function resetReporter(): void {
  _reporter = null;
}

// En desarrollo exponemos el helper global para depuración
if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__errorReporter = {
      captureException: (...args: unknown[]) => getReporter().captureException(args[0], args[1] as SafeErrorContext | undefined),
      captureMessage: (...args: unknown[]) => getReporter().captureMessage(args[0] as string, args[1] as SafeErrorContext | undefined),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers globales de inicialización                                 */
/* ------------------------------------------------------------------ */

/**
 * Instala los handlers globales de errores no capturados.
 * Llama una vez desde `main.tsx`.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  const reporter = getReporter();
  const version = APP_VERSION;

  window.addEventListener('error', (event) => {
    reporter.captureException(event.error ?? event.message, {
      route: window.location.pathname,
      frontendVersion: version,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reporter.captureException(event.reason, {
      route: window.location.pathname,
      frontendVersion: version,
    });
  });
}
