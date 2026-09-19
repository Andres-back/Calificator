import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import type { GradeBreakdownData } from '@/types/api';
import { XaliMascot } from '@/components/xali/XaliMascot';
import { cn } from '@/lib/cn';
import { trackEvent } from '@/lib/analytics';
import { buildFeedbackStory } from './buildFeedbackStory';

type XaliFeedbackStoryProps = {
  evaluationId: string;
  breakdown: GradeBreakdownData;
  onOpenDetail?: (componentId?: string) => void;
};

const MOTION_PREFERENCE_KEY = 'xcalificator.feedback-motion';

function readMotionPreference(): 'system' | 'reduced' {
  if (typeof window === 'undefined') return 'system';
  return window.localStorage.getItem(MOTION_PREFERENCE_KEY) === 'reduced' ? 'reduced' : 'system';
}

export function XaliFeedbackStory({ evaluationId, breakdown, onOpenDetail }: XaliFeedbackStoryProps) {
  const scenes = useMemo(() => buildFeedbackStory(breakdown), [breakdown]);
  const systemReducedMotion = useReducedMotion();
  const [motionPreference, setMotionPreference] = useState<'system' | 'reduced'>(readMotionPreference);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const startedForRef = useRef<string | null>(null);
  const completedForRef = useRef<string | null>(null);

  const reducedMotion = Boolean(systemReducedMotion) || motionPreference === 'reduced';
  const analyticsMode = reducedMotion ? 'static' : 'animated';
  const storyKey = `${evaluationId}:${breakdown.calificacion_id}`;
  const scene = scenes[currentIndex];

  useEffect(() => {
    if (currentIndex >= scenes.length) setCurrentIndex(Math.max(0, scenes.length - 1));
  }, [currentIndex, scenes.length]);

  useEffect(() => {
    if (scenes.length === 0 || startedForRef.current === storyKey) return;
    startedForRef.current = storyKey;
    trackEvent('feedback_story_started', {
      evaluacion_id: evaluationId,
      calificacion_id: breakdown.calificacion_id,
      metadata_json: { mode: analyticsMode },
    });
  }, [analyticsMode, breakdown.calificacion_id, evaluationId, scenes.length, storyKey]);

  useEffect(() => {
    if (scenes.length === 0 || (!reducedMotion && currentIndex !== scenes.length - 1) || completedForRef.current === storyKey) return;
    completedForRef.current = storyKey;
    trackEvent('feedback_story_completed', {
      evaluacion_id: evaluationId,
      calificacion_id: breakdown.calificacion_id,
      metadata_json: { mode: analyticsMode },
    });
  }, [analyticsMode, breakdown.calificacion_id, currentIndex, evaluationId, reducedMotion, scenes.length, storyKey]);

  if (!scene || scenes.length === 0) return null;

  const setReduced = (reduced: boolean) => {
    const preference = reduced ? 'reduced' : 'system';
    setMotionPreference(preference);
    window.localStorage.setItem(MOTION_PREFERENCE_KEY, preference);
  };

  const trackControl = (action: 'pause' | 'resume' | 'skip' | 'replay' | 'next' | 'previous') => {
    trackEvent('feedback_story_controlled', {
      evaluacion_id: evaluationId,
      calificacion_id: breakdown.calificacion_id,
      metadata_json: { mode: analyticsMode, action, step: currentIndex + 1 },
    });
  };

  const openSceneDetail = (componentId: string | undefined, step: number) => {
    trackEvent('feedback_story_detail_opened', {
      evaluacion_id: evaluationId,
      calificacion_id: breakdown.calificacion_id,
      metadata_json: { mode: analyticsMode, step },
    });
    onOpenDetail?.(componentId);
  };

  if (skipped) {
    return (
      <section aria-label="Historia de tu retroalimentación" className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-fg">La explicación completa sigue disponible abajo.</p>
          <button type="button" onClick={() => { trackControl('replay'); setSkipped(false); setCurrentIndex(0); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-300 bg-surface px-4 text-sm font-bold text-brand-700 dark:text-brand-200">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Ver historia con Xali
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="xali-feedback-title" className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-white via-brand-50 to-sky-50 p-4 shadow-sm dark:border-brand-500/25 dark:from-slate-950 dark:via-indigo-950/60 dark:to-slate-900 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-200"><Sparkles className="h-4 w-4" aria-hidden="true" /> Xali te acompaña</p>
          <h2 id="xali-feedback-title" className="mt-1 font-display text-xl font-extrabold text-fg sm:text-2xl">Tu retroalimentación, paso a paso</h2>
        </div>
        <button type="button" onClick={() => { trackControl('skip'); setSkipped(true); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface/70 hover:text-fg">
          <X className="h-4 w-4" aria-hidden="true" /> Omitir historia
        </button>
      </div>

      {reducedMotion ? (
        <div className="relative mt-5 grid gap-4" aria-label="Todas las escenas en formato estático">
          {scenes.map((staticScene, index) => (
            <article key={staticScene.id} className="grid items-center gap-4 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 sm:grid-cols-[96px_minmax(0,1fr)]">
              <div className="mx-auto grid place-items-center">
                <XaliMascot state={staticScene.mascotState} size="static" animate={false} label={`Xali: ${staticScene.title}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-200">Paso {index + 1} de {scenes.length}</p>
                <h3 className="mt-1 text-lg font-extrabold text-fg">{staticScene.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-fg">{staticScene.message}</p>
                {staticScene.detailLabel && (
                  <button type="button" onClick={() => openSceneDetail(staticScene.componentId, index + 1)} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-800 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-100">
                    <Eye className="h-4 w-4" aria-hidden="true" /> {staticScene.detailLabel}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="relative mt-5 grid items-center gap-5 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="mx-auto grid min-h-44 place-items-center" aria-hidden="false">
            <XaliMascot state={scene.mascotState} animate={!paused} label={`Xali: ${scene.title}`} />
          </div>
          <div className="min-w-0 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70" aria-live="polite" aria-atomic="true">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-200">Paso {currentIndex + 1} de {scenes.length}</p>
            <h3 className="mt-2 text-xl font-extrabold text-fg">{scene.title}</h3>
            <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-fg">{scene.message}</p>
            {scene.detailLabel && (
              <button type="button" onClick={() => openSceneDetail(scene.componentId, currentIndex + 1)} className="focus-ring mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-800 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-100">
                <Eye className="h-4 w-4" aria-hidden="true" /> {scene.detailLabel}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative mt-5 flex flex-col gap-4 border-t border-brand-200/70 pt-4 dark:border-brand-500/20 sm:flex-row sm:items-center sm:justify-between">
        {!reducedMotion && <div className="flex items-center gap-2" role="group" aria-label="Navegar la historia">
          <button type="button" onClick={() => { trackControl('previous'); setCurrentIndex((value) => Math.max(0, value - 1)); }} disabled={currentIndex === 0} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-bold text-fg disabled:cursor-not-allowed disabled:opacity-45">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
          </button>
          <button type="button" onClick={() => { trackControl('next'); setCurrentIndex((value) => Math.min(scenes.length - 1, value + 1)); }} disabled={currentIndex === scenes.length - 1} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45">
            Siguiente <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>}
        <div className="flex flex-wrap items-center gap-2">
          {!reducedMotion && (
            <button type="button" onClick={() => { trackControl(paused ? 'resume' : 'pause'); setPaused((value) => !value); }} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface/70 hover:text-fg" aria-pressed={paused}>
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}{paused ? 'Reanudar movimiento' : 'Pausar movimiento'}
            </button>
          )}
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm font-semibold text-muted">
            <input type="checkbox" checked={motionPreference === 'reduced'} onChange={(event) => setReduced(event.target.checked)} className="h-4 w-4 accent-brand-600" />
            Vista sin movimiento
          </label>
        </div>
      </div>
      <div className="relative mt-3 flex gap-1" aria-hidden="true">
        {scenes.map((item, index) => <span key={item.id} className={cn('h-1.5 flex-1 rounded-full', reducedMotion || index <= currentIndex ? 'bg-brand-600' : 'bg-brand-200 dark:bg-brand-500/25')} />)}
      </div>
    </section>
  );
}
