import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, Check, SkipForward } from 'lucide-react';
import { Button } from './Button';

export interface TourStep {
  /** Selector CSS del elemento a resaltar, p. ej. `[data-tour="calificaciones-confirmar"]`. Opcional: si falta o no existe, el paso se muestra centrado. */
  target?: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Pos {
  top: number;
  left: number;
  centered: boolean;
}

const CARD_W = 340;
const GAP = 14;

/**
 * Guía interactiva propia (sin dependencias externas). Resalta elementos por
 * selector y muestra una tarjeta explicativa paso a paso. Solo explica: no
 * dispara acciones ni modifica datos. Si un target no existe (p. ej. no hay
 * calificaciones cargadas) el paso se muestra centrado sin romperse.
 */
export function GuidedTour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0, centered: true });
  const cardRef = useRef<HTMLDivElement | null>(null);

  const step = steps[index];
  const total = steps.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Reiniciar al abrir.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Localizar y resaltar el target del paso actual.
  const measureTarget = useCallback(() => {
    if (!open || !step) return;
    const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [open, step]);

  useEffect(() => {
    measureTarget();
    // Re-medir tras el posible scroll suave.
    const t = window.setTimeout(measureTarget, 320);
    return () => window.clearTimeout(t);
  }, [measureTarget, index]);

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

  // Calcular la posición de la tarjeta a partir del rect resaltado.
  useLayoutEffect(() => {
    if (!open) return;
    const cardH = cardRef.current?.offsetHeight ?? 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!rect) {
      setPos({ top: Math.max(GAP, vh / 2 - cardH / 2), left: Math.max(GAP, vw / 2 - CARD_W / 2), centered: true });
      return;
    }
    const placement = step?.placement ?? 'bottom';
    let top: number;
    let left: number;
    if (placement === 'top') {
      top = rect.top - cardH - GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
    } else if (placement === 'left') {
      top = rect.top;
      left = rect.left - CARD_W - GAP;
    } else if (placement === 'right') {
      top = rect.top;
      left = rect.right + GAP;
    } else {
      top = rect.bottom + GAP;
      left = rect.left + rect.width / 2 - CARD_W / 2;
    }
    // Si no cabe debajo, colocar encima.
    if ((placement === 'bottom' || !step?.placement) && top + cardH + GAP > vh) {
      top = rect.top - cardH - GAP;
    }
    left = Math.max(GAP, Math.min(left, vw - CARD_W - GAP));
    top = Math.max(GAP, Math.min(top, vh - cardH - GAP));
    setPos({ top, left, centered: false });
  }, [rect, step, index, open]);

  const close = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  const next = useCallback(() => {
    if (isLast) close();
    else setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, close, total]);

  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Cerrar con Escape; foco al abrir/cambiar de paso.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => cardRef.current?.focus(), 60);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open, index, close]);

  if (!open || !step) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="tour"
        className="fixed inset-0 z-[60]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Spotlight: dim de toda la pantalla salvo el elemento resaltado. */}
        {rect ? (
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-brand-400 transition-all duration-200"
            style={{
              top: rect.top - 6,
              left: rect.left - 6,
              width: rect.width + 12,
              height: rect.height + 12,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
            }}
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-slate-900/55" />
        )}

        {/* Tarjeta explicativa */}
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="false"
          aria-label={`Guía: ${step.title}`}
          tabIndex={-1}
          className="card glass fixed p-5 shadow-xl outline-none"
          style={{ top: pos.top, left: pos.left, width: CARD_W, maxWidth: 'calc(100vw - 28px)' }}
          initial={{ opacity: 0, scale: 0.97, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        >
          <button
            onClick={close}
            aria-label="Cerrar guía"
            className="absolute right-3 top-3 rounded-lg p-1 text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            Paso {index + 1} de {total}
          </p>
          <h3 className="mt-1 pr-6 font-display text-lg font-bold">{step.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.description}</p>

          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={close}
              className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-fg"
            >
              <SkipForward className="h-3.5 w-3.5" /> Saltar
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <Button size="sm" variant="outline" onClick={prev}>
                  <ArrowLeft className="h-4 w-4" /> Anterior
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? (
                  <>
                    <Check className="h-4 w-4" /> Finalizar
                  </>
                ) : (
                  <>
                    Siguiente <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
