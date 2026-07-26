/**
 * Web Vitals reporting — desacoplado y seguro.
 *
 * Reporta LCP, CLS, INP, FCP, TTFB usando la Performance API nativa.
 * - Solo se activa explícitamente (no por defecto en producción)
 * - Usa función de reporte desacoplada
 * - No bloquea el render
 * - No incluye datos personales
 */

import { getReporter } from '@/lib/errorReporter';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

export type WebVitalMetric =
  | 'LCP'  // Largest Contentful Paint
  | 'CLS'  // Cumulative Layout Shift
  | 'INP'  // Interaction to Next Paint
  | 'FCP'  // First Contentful Paint
  | 'TTFB' // Time to First Byte
  ;

export interface WebVitalEntry {
  metric: WebVitalMetric;
  value: number;         // valor en milisegundos (CLS es score unitario)
  unit: 'ms' | 'score';
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;     // Date.now() cuando se reportó
}

/**
 * Función de reporte desacoplada.
 * Por defecto reporta vía getReporter().captureMessage().
 * Se puede sobrescribir con `setWebVitalReporter()`.
 */
export type WebVitalReporter = (entry: WebVitalEntry) => void;

/* ------------------------------------------------------------------ */
/*  Thresholds (Google Chrome Core Web Vitals)                         */
/* ------------------------------------------------------------------ */

const THRESHOLDS: Record<WebVitalMetric, { good: number; poor: number }> = {
  LCP:  { good: 2500, poor: 4000 },
  CLS:  { good: 0.1,  poor: 0.25 },
  INP:  { good: 200,  poor: 500 },
  FCP:  { good: 1800, poor: 3000 },
  TTFB: { good: 800,  poor: 1800 },
};

function getRating(metric: WebVitalMetric, value: number): WebVitalEntry['rating'] {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

/* ------------------------------------------------------------------ */
/*  Reporter singleton                                                 */
/* ------------------------------------------------------------------ */

let _vitalReporter: WebVitalReporter | null = null;
let _activated = false;

/**
 * Sobrescribe la función de reporte por defecto.
 */
export function setWebVitalReporter(reporter: WebVitalReporter): void {
  _vitalReporter = reporter;
}

function report(entry: WebVitalEntry): void {
  if (_vitalReporter) {
    try {
      _vitalReporter(entry);
    } catch {
      // nunca fallar por un reporte
    }
  } else {
    // Por defecto: log via errorReporter (no PII)
    const reporter = getReporter();
    const msg = `[WebVital] ${entry.metric}=${entry.value}${entry.unit} (${entry.rating})`;
    reporter.captureMessage(msg);
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers internos                                                   */
/* ------------------------------------------------------------------ */

type PerfEntryType = 'element' | 'event' | 'first-input' | 'largest-contentful-paint' | 'layout-shift' | 'longtask' | 'mark' | 'measure' | 'navigation' | 'paint' | 'resource' | 'visibility-state';

function safeObserve(
  type: PerfEntryType,
  cb: (entry: PerformanceEntry) => void,
): PerformanceObserver | null {
  try {
    if (typeof PerformanceObserver === 'undefined') return null;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        cb(entry);
      }
    });

    observer.observe({ type } as PerformanceObserverInit);
    return observer;
  } catch {
    // Tipo no soportado por el navegador — silencio
    return null;
  }
}

function roundMs(ms: number): number {
  // Redondear a entero más cercano
  return Math.round(ms);
}

/* ------------------------------------------------------------------ */
/*  Métricas individuales                                              */
/* ------------------------------------------------------------------ */

function observeLCP(): void {
  // LCP se reporta cuando hay una interacción o el observer se detiene
  let lastValue = 0;

  const observer = safeObserve('largest-contentful-paint', (entry) => {
    lastValue = entry.startTime;
  });

  if (!observer) return;

  // El callback 'onreport' se dispara cuando el usuario interactúa
  // (indica que LCP ya no cambiará) o en pagehide/visibilitychange
  const reportLCP = () => {
    if (lastValue > 0) {
      report({
        metric: 'LCP',
        value: roundMs(lastValue),
        unit: 'ms',
        rating: getRating('LCP', lastValue),
        timestamp: Date.now(),
      });
    }
    observer.disconnect();
    document.removeEventListener('visibilitychange', reportLCP);
  };

  // El estándar recomienda escuchar pagehide/visibilitychange
  document.addEventListener('visibilitychange', reportLCP, { once: true });
  // Timeout de seguridad por si nunca se dispara visibilitychange
  setTimeout(reportLCP, 10_000);
}

function observeCLS(): void {
  let sessionValue = 0;

  const observer = safeObserve('layout-shift', (entry: PerformanceEntry) => {
    // Solo layout shifts sin interacción del usuario
    const shift = entry as unknown as { hadRecentInput?: boolean; value?: number };
    if (!shift.hadRecentInput && typeof shift.value === 'number') {
      sessionValue += shift.value;
    }
  });

  if (!observer) return;

  const reportCLS = () => {
    if (sessionValue > 0) {
      report({
        metric: 'CLS',
        value: Math.round(sessionValue * 1000) / 1000,
        unit: 'score',
        rating: getRating('CLS', sessionValue),
        timestamp: Date.now(),
      });
    }
    observer.disconnect();
    document.removeEventListener('visibilitychange', reportCLS);
  };

  document.addEventListener('visibilitychange', reportCLS, { once: true });
  // También reportar en pagehide
  window.addEventListener('pagehide', reportCLS, { once: true });
  // Timeout de seguridad
  setTimeout(reportCLS, 15_000);
}

function observeINP(): void {
  // INP mide la peor latencia de interacción
  let worstLatency = 0;

  const observer = safeObserve('first-input', (entry: PerformanceEntry) => {
    const fi = entry as unknown as { processingStart?: number; startTime?: number };
    if (typeof fi.processingStart === 'number' && typeof fi.startTime === 'number') {
      worstLatency = Math.max(worstLatency, fi.processingStart - fi.startTime);
    }
  });

  if (!observer) return;

  // INP también usa Event Timing API para todas las interacciones
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      const inpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const ei = entry as unknown as { processingStart?: number; startTime?: number };
          if (typeof ei.processingStart === 'number' && typeof ei.startTime === 'number') {
            worstLatency = Math.max(worstLatency, ei.processingStart - ei.startTime);
          }
        }
      });
      inpObserver.observe({ type: 'event' as PerfEntryType, buffered: true } as PerformanceObserverInit);

      const reportINP = () => {
        if (worstLatency > 0) {
          report({
            metric: 'INP',
            value: roundMs(worstLatency),
            unit: 'ms',
            rating: getRating('INP', worstLatency),
            timestamp: Date.now(),
          });
        }
        inpObserver.disconnect();
        document.removeEventListener('visibilitychange', reportINP);
      };

      document.addEventListener('visibilitychange', reportINP, { once: true });
      setTimeout(reportINP, 15_000);
    }
  } catch {
    // Event timing no soportado
  }
}

function observeFCP(): void {
  const observer = safeObserve('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      report({
        metric: 'FCP',
        value: roundMs(entry.startTime),
        unit: 'ms',
        rating: getRating('FCP', entry.startTime),
        timestamp: Date.now(),
      });
      observer?.disconnect();
    }
  });

  if (!observer) return;

  // Timeout de seguridad
  setTimeout(() => observer.disconnect(), 10_000);
}

function measureTTFB(): void {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;

    if (navEntry?.responseStart) {
      report({
        metric: 'TTFB',
        value: roundMs(navEntry.responseStart),
        unit: 'ms',
        rating: getRating('TTFB', navEntry.responseStart),
        timestamp: Date.now(),
      });
    }
  } catch {
    // Performance API no disponible
  }
}

/* ------------------------------------------------------------------ */
/*  Activación                                                         */
/* ------------------------------------------------------------------ */

/**
 * Activa el reporte de Web Vitals.
 *
 * Solo se activa explícitamente — no se ejecuta automáticamente en producción.
 * Es seguro llamarla múltiples veces; solo la primera surte efecto.
 *
 * @param metrics - Opcional: lista de métricas a observar (por defecto todas)
 *
 * @example
 * ```ts
 * // Activar todas las métricas
 * activateWebVitals();
 *
 * // Solo LCP y CLS
 * activateWebVitals(['LCP', 'CLS']);
 * ```
 */
export function activateWebVitals(metrics?: WebVitalMetric[]): void {
  if (_activated) return;
  _activated = true;
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;

  const enabled = metrics ?? ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'];

  // Reportar después del próximo frame para no bloquear el render
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (enabled.includes('TTFB')) measureTTFB();
      if (enabled.includes('FCP')) observeFCP();
      if (enabled.includes('LCP')) observeLCP();
      if (enabled.includes('CLS')) observeCLS();
      if (enabled.includes('INP')) observeINP();
    }, 0);
  });

  // Log de activación (solo en desarrollo)
  if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development') {
    console.info(`[WebVitals] Activado: ${enabled.join(', ')}`);
  }
}
