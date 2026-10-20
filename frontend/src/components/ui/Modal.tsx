import { useEffect, useId, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { MobileFormViewport } from '@/hooks/useMobileFormViewport';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  const selector = container.hasAttribute('data-writing') ? `${FOCUSABLE_SELECTOR}, summary` : FOCUSABLE_SELECTOR;
  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter((element) => {
      if (element.getAttribute('aria-hidden') === 'true') return false;
      if (!container.hasAttribute('data-writing')) return true;
      // Opt-in forms retain folded controls in the DOM to preserve editing.
      // Their hidden controls must not become endpoints of the focus trap.
      for (let node: HTMLElement | null = element; node && node !== container; node = node.parentElement) {
        if (node.hidden || window.getComputedStyle(node).display === 'none') return false;
        if (node instanceof HTMLDetailsElement && !node.open && !node.querySelector('summary')?.contains(element)) return false;
      }
      return true;
    });
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  initialFocusRef,
  ariaLabel = 'Diálogo',
  mobileViewport,
  mobileWriting,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  ariaLabel?: string;
  mobileViewport?: MobileFormViewport;
  mobileWriting?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
  useBodyScrollLock(open, 'all');

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const frame = window.requestAnimationFrame(() => {
      // No interrumpir al usuario si ya empezó a escribir antes del autofocus.
      const dialog = dialogRef.current;
      if (dialog?.contains(document.activeElement) && document.activeElement !== dialog) return;
      const initialTarget = initialFocusRef?.current;
      const focusTarget = initialTarget && !initialTarget.hasAttribute('disabled')
        ? initialTarget
        : getFocusableElements(dialogRef.current)[0] ?? dialogRef.current;
      focusTarget?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      // A figure can open above an existing evaluation preview. Only the
      // topmost dialog traps focus or handles Escape; the underlying draft stays.
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs.item(dialogs.length - 1) !== dialogRef.current) return;
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialogRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      // Devolver el foco no debe desplazar la lista que queda detrás del diálogo.
      previouslyFocusedRef.current?.focus({ preventScroll: true });
      previouslyFocusedRef.current = null;
    };
  }, [closeOnEscape, initialFocusRef, open]);

  // Reduced-motion users must not wait for an exit frame before the overlay
  // releases the underlying form. A zero-duration transition still needs rAF.
  if (reduceMotion && !open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : undefined}
        >
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            aria-label={title ? undefined : ariaLabel}
            data-writing={mobileWriting === undefined ? undefined : String(mobileWriting)}
            tabIndex={-1}
            style={mobileViewport ? {
              position: 'fixed', top: mobileViewport.top, left: 0, right: 0, bottom: 'auto',
              height: mobileViewport.height, maxHeight: mobileViewport.height,
              '--mobile-form-height': `${mobileViewport.height}px`,
            } as CSSProperties : undefined}
            className={cn('safe-area-pb relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto card glass p-5 sm:p-6', className)}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 24, stiffness: 280 }}
          >
            {title && <h2 id={titleId} className="mb-4 pr-10 font-display text-xl font-bold">{title}</h2>}
            {description && <div id={descriptionId} className="mb-4 text-sm leading-6 text-secondary">{description}</div>}
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="focus-ring absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-fg"
                aria-label="Cerrar diálogo"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
