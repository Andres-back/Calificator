import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react';
import { Button } from './Button';
import { markTourCompleted } from './tourState';

export interface TourStep {
  target?: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Pos {
  top: number;
  left: number;
}

const CARD_W = 340;
const GAP = 14;

export function GuidedTour({
  steps,
  open,
  onClose,
  tourId,
  role,
  version = 1,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  tourId?: string;
  role?: string;
  version?: number;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [availableSteps, setAvailableSteps] = useState<TourStep[]>([]);
  const [stepsResolved, setStepsResolved] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setAvailableSteps([]);
      setStepsResolved(false);
      return;
    }
    setIndex(0);
    setAvailableSteps(steps.filter((candidate) => !candidate.target || document.querySelector(candidate.target)));
    setStepsResolved(true);
  }, [open, steps]);

  const step = availableSteps[index];
  const total = availableSteps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIndex(0);
    return () => {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (open && stepsResolved && total === 0) onClose();
  }, [onClose, open, stepsResolved, total]);

  const measureTarget = useCallback(() => {
    if (!open || !step) return;
    const element = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    if (!element) {
      setRect(null);
      return;
    }
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
    setRect(element.getBoundingClientRect());
  }, [open, reduceMotion, step]);

  useEffect(() => {
    measureTarget();
    const timer = window.setTimeout(measureTarget, reduceMotion ? 0 : 320);
    return () => window.clearTimeout(timer);
  }, [measureTarget, index, reduceMotion]);

  useEffect(() => {
    if (!open) return;
    const handler = () => measureTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, measureTarget]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const cardHeight = cardRef.current?.offsetHeight ?? 190;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (!rect) {
      setPos({ top: Math.max(GAP, viewportHeight / 2 - cardHeight / 2), left: Math.max(GAP, viewportWidth / 2 - CARD_W / 2) });
      return;
    }
    const placement = step.placement ?? 'bottom';
    let top = rect.bottom + GAP;
    let left = rect.left + rect.width / 2 - CARD_W / 2;
    if (placement === 'top') top = rect.top - cardHeight - GAP;
    if (placement === 'left') {
      top = rect.top;
      left = rect.left - CARD_W - GAP;
    }
    if (placement === 'right') {
      top = rect.top;
      left = rect.right + GAP;
    }
    if (placement === 'bottom' && top + cardHeight + GAP > viewportHeight) top = rect.top - cardHeight - GAP;
    left = Math.max(GAP, Math.min(left, viewportWidth - CARD_W - GAP));
    top = Math.max(GAP, Math.min(top, viewportHeight - cardHeight - GAP));
    setPos({ top, left });
  }, [rect, step, index, open]);

  const close = useCallback((completed = false) => {
    if (completed && tourId && role) markTourCompleted({ tourId, role, version });
    setIndex(0);
    onClose();
  }, [onClose, role, tourId, version]);

  const next = useCallback(() => {
    if (isLast) close(true);
    else setIndex((current) => Math.min(current + 1, total - 1));
  }, [close, isLast, total]);
  const previous = useCallback(() => setIndex((current) => Math.max(current - 1, 0)), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => cardRef.current?.focus(), reduceMotion ? 0 : 60);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [close, index, open, reduceMotion]);

  if (!open || !step) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour"
        className="pointer-events-none fixed inset-0 z-[60]"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {rect ? (
          <div
            className="absolute rounded-xl ring-2 ring-focus"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.58)',
            }}
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />
        )}

        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="false"
          aria-label={`Guía: ${step.title}`}
          tabIndex={-1}
          className="card glass pointer-events-auto fixed p-5 shadow-xl outline-none"
          style={{ top: pos.top, left: pos.left, width: CARD_W, maxWidth: 'calc(100vw - 28px)' }}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 300 }}
        >
          <button type="button" onClick={() => close(false)} aria-label="Cerrar guía" className="focus-ring absolute right-2 top-2 grid min-h-10 min-w-10 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Paso {index + 1} de {total}</p>
          <h2 className="mt-1 pr-8 font-display text-lg font-bold">{step.title}</h2>
          <p className="mt-1.5 text-sm leading-6 text-secondary">{step.description}</p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => close(false)} className="focus-ring inline-flex min-h-10 items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-secondary hover:bg-surface-2 hover:text-fg">
              <SkipForward className="h-3.5 w-3.5" aria-hidden="true" /> Saltar
            </button>
            <div className="flex gap-2">
              {!isFirst && <Button size="sm" variant="outline" onClick={previous}><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Anterior</Button>}
              <Button size="sm" onClick={next}>
                {isLast ? <><Check className="h-4 w-4" aria-hidden="true" /> Finalizar</> : <>Siguiente <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}