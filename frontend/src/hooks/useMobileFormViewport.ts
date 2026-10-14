import { useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from 'react';

export interface MobileFormViewport { height: number; top: number }
const MOBILE_QUERY = '(max-width: 639px), (max-width: 1023px) and (pointer: coarse)';

function editable(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement
    && !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'hidden', 'range', 'color'].includes(element.type));
}
function visibleBounds(): MobileFormViewport | undefined {
  const viewport = window.visualViewport;
  if (!viewport || viewport.scale > 1.05 || !Number.isFinite(viewport.height) || viewport.height <= 0) return undefined;
  return { height: Math.floor(viewport.height), top: Math.max(0, Math.floor(viewport.offsetTop || 0)) };
}

/** Opt-in presentation only. Never owns form values or submits them. */
export function useMobileFormViewport(open: boolean, scope: RefObject<HTMLElement>) {
  const media = useMemo(() => window.matchMedia(MOBILE_QUERY), []);
  const subscribe = useCallback((listener: () => void) => {
    if (!open) return () => undefined;
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [media, open]);
  const isMobile = useSyncExternalStore(subscribe, () => media.matches, () => false);
  const [writing, setWriting] = useState(false);
  const [bounds, setBounds] = useState(visibleBounds);
  const scrollFrame = useRef<number>();

  const ensureVisible = useCallback(() => {
    if (scrollFrame.current !== undefined) window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = window.requestAnimationFrame(() => {
      const target = document.activeElement;
      if (!editable(target) || !scope.current?.contains(target)) return;
      const scroller = target.closest<HTMLElement>('[data-mobile-scroll]');
      if (!scroller) return;
      const field = target.closest<HTMLElement>('[data-mobile-field]') ?? target.closest('label') ?? target.parentElement ?? target;
      const area = scroller.getBoundingClientRect();
      const rect = field.getBoundingClientRect();
      if (rect.top < area.top + 8 || rect.bottom > area.bottom - 8) {
        scroller.scrollTop += rect.top - area.top - 8;
      }
    });
  }, [scope]);

  useLayoutEffect(() => {
    setWriting(false);
    if (!open || !isMobile) return;
    const container = scope.current;
    const viewport = window.visualViewport;
    let originalHeight = visibleBounds()?.height;
    let originalWidth = window.innerWidth;
    let contracted = false;
    let updateFrame: number | undefined;
    let blurFrame: number | undefined;
    let focusFrame: number | undefined;
    const update = () => {
      if (updateFrame !== undefined) window.cancelAnimationFrame(updateFrame);
      updateFrame = window.requestAnimationFrame(() => {
        const next = visibleBounds();
        // Restore only after a substantial contraction returns, not browser-bar
        // motion, pinch zoom or orientation changes. Listo remains the fallback.
        if (Math.abs(window.innerWidth - originalWidth) > 80) {
          originalWidth = window.innerWidth;
          originalHeight = next?.height;
          contracted = false;
        } else if (next && originalHeight) {
          if (next.height < originalHeight - 120) contracted = true;
          else if (contracted && next.height >= originalHeight - 40) {
            contracted = false;
            const active = document.activeElement;
            if (editable(active) && container?.contains(active)) active.blur();
            setWriting(false);
          }
          if (!contracted) originalHeight = Math.max(originalHeight, next.height);
        }
        setBounds(current => current?.height === next?.height && current?.top === next?.top ? current : next);
      });
    };
    const focus = (event: FocusEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!editable(target)) return;
      if (focusFrame !== undefined) window.cancelAnimationFrame(focusFrame);
      // Let the native focus/input sequence finish before relaying out controlled
      // inputs. A synchronous render here can restore their previous value.
      focusFrame = window.requestAnimationFrame(() => {
        if (document.activeElement !== target) return;
        setWriting(true);
        ensureVisible();
      });
    };
    const blur = () => {
      if (blurFrame !== undefined) window.cancelAnimationFrame(blurFrame);
      blurFrame = window.requestAnimationFrame(() => {
        // Keep Listo mounted while it receives pointer or keyboard focus.
        if (!container?.contains(document.activeElement)) setWriting(false);
      });
    };
    setBounds(visibleBounds());
    container?.addEventListener('focusin', focus);
    container?.addEventListener('focusout', blur);
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      container?.removeEventListener('focusin', focus);
      container?.removeEventListener('focusout', blur);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      for (const frame of [updateFrame, blurFrame, focusFrame, scrollFrame.current]) {
        if (frame !== undefined) window.cancelAnimationFrame(frame);
      }
    };
  }, [ensureVisible, isMobile, open, scope]);

  useLayoutEffect(() => {
    if (open && isMobile && writing) ensureVisible();
  }, [bounds?.height, bounds?.top, ensureVisible, isMobile, open, writing]);

  const finishWriting = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && scope.current?.contains(active)) active.blur();
    setWriting(false);
    scope.current?.closest<HTMLElement>('[role="dialog"]')?.focus({ preventScroll: true });
  }, [scope]);

  return { isMobile, isWriting: open && isMobile && writing, viewport: open && isMobile ? bounds : undefined, finishWriting };
}
