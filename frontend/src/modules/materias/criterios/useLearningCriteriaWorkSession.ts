import { useCallback, useEffect, useRef, useState } from 'react';

import { trackEvent, type AnalyticsEventPayloads } from '@/lib/analytics';

type Measurement = AnalyticsEventPayloads['learning_criteria_work_measured']['metadata_json'];
type Outcome = Measurement['resultado'];
const IDLE_MS = 45_000;

/** Opt-in, monotonic intervals; never records input, sources or student data. */
export function useLearningCriteriaWorkSession({
  materiaId, open, phase, busy, assisted,
}: {
  materiaId: string;
  open: boolean;
  phase: 'preparacion' | 'revision';
  busy: boolean;
  assisted: boolean;
}) {
  const [measuring, setMeasuring] = useState(false);
  const ledger = useRef<Measurement | null>(null);
  const clock = useRef({ at: 0, lastActivity: 0, phase, busy, assisted, visible: true });

  const settle = useCallback(() => {
    const current = ledger.current;
    if (!current) return;
    const now = performance.now();
    const state = clock.current;
    if (state.visible) {
      const end = state.busy ? now : Math.min(now, state.lastActivity + IDLE_MS);
      const elapsed = Math.max(0, Math.round(end - state.at));
      if (state.busy) current.espera_solicitud_ms += elapsed;
      else if (state.phase === 'revision') current.revision_ms += elapsed;
      else current.preparacion_ms += elapsed;
    }
    state.at = now;
    if (state.assisted) current.condicion = 'asistida';
  }, []);

  const flush = useCallback((resultado: Outcome) => {
    settle();
    const current = ledger.current;
    if (!current) return;
    trackEvent('learning_criteria_work_measured', { metadata_json: { ...current, resultado } });
    current.preparacion_ms = 0;
    current.revision_ms = 0;
    current.espera_solicitud_ms = 0;
    if (resultado !== 'intervalo') ledger.current = null;
  }, [settle]);

  const start = useCallback(() => {
    if (ledger.current || !open) return;
    const now = performance.now();
    ledger.current = {
      materia_id: materiaId, session_id: crypto.randomUUID(),
      preparacion_ms: 0, revision_ms: 0, espera_solicitud_ms: 0,
      condicion: assisted ? 'asistida' : 'manual', resultado: 'intervalo',
    };
    clock.current = { at: now, lastActivity: now, phase, busy, assisted, visible: !document.hidden };
    setMeasuring(true);
  }, [materiaId, open, phase, busy, assisted]);

  const activity = useCallback(() => {
    settle();
    clock.current.lastActivity = performance.now();
  }, [settle]);

  const finish = useCallback((resultado: Exclude<Outcome, 'intervalo'> = 'cerrada') => {
    flush(resultado);
    setMeasuring(false);
  }, [flush]);

  useEffect(() => {
    settle();
    Object.assign(clock.current, { phase, busy, assisted });
    if (!open) finish();
  }, [phase, busy, assisted, open, settle, finish]);

  useEffect(() => {
    if (!measuring) return;
    const visibility = () => {
      settle();
      clock.current.visible = !document.hidden;
      clock.current.lastActivity = performance.now();
    };
    const pageHide = () => flush('cerrada');
    // Incremental recording limits loss if the tab or browser closes abruptly.
    const timer = window.setInterval(() => flush('intervalo'), 30_000);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pageHide);
    };
  }, [measuring, settle, flush]);

  useEffect(() => () => flush('cerrada'), [flush]);

  return { measuring, start, activity, finish };
}
