import { useEffect } from 'react';

const locks = new Set<symbol>();
let snapshot: {
  body: HTMLElement;
  scrollX: number;
  scrollY: number;
  styles: Pick<CSSStyleDeclaration, 'overflow' | 'overscrollBehavior' | 'position' | 'top' | 'width'>;
} | undefined;

function acquireScrollLock() {
  const token = Symbol('body-scroll-lock');
  if (locks.size === 0) {
    const body = document.body;
    snapshot = {
      body,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      styles: {
        overflow: body.style.overflow,
        overscrollBehavior: body.style.overscrollBehavior,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      },
    };
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${snapshot.scrollY}px`;
    body.style.width = '100%';
  }
  locks.add(token);

  return () => {
    if (!locks.delete(token) || locks.size > 0 || !snapshot) return;
    const previous = snapshot;
    snapshot = undefined;
    Object.assign(previous.body.style, previous.styles);
    window.scrollTo(previous.scrollX, previous.scrollY);
  };
}

/** Comparte el bloqueo entre paneles y diálogos; solo el último restaura el documento. */
export function useBodyScrollLock(active: boolean, mediaQuery = '(max-width: 1023px)') {
  useEffect(() => {
    if (!active) return;
    const query = mediaQuery === 'all' ? undefined : window.matchMedia(mediaQuery);
    let release: (() => void) | undefined;
    const synchronize = () => {
      if (!query || query.matches) {
        release ??= acquireScrollLock();
      } else {
        release?.();
        release = undefined;
      }
    };
    synchronize();
    query?.addEventListener?.('change', synchronize);
    return () => {
      query?.removeEventListener?.('change', synchronize);
      release?.();
    };
  }, [active, mediaQuery]);
}
