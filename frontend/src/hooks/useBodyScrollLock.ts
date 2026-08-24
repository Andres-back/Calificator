import { useEffect } from 'react';

/** Bloquea el documento sin perder la posición y siempre restaura estilos al desmontar. */
export function useBodyScrollLock(active: boolean, mediaQuery = '(max-width: 1023px)') {
  useEffect(() => {
    if (!active || !window.matchMedia(mediaQuery).matches) return;

    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = previous.overflow;
      body.style.overscrollBehavior = previous.overscrollBehavior;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [active, mediaQuery]);
}