import { useEffect, useRef } from 'react';

const KEY = '__evidenceOverlay';
interface Entry { marker: string; release: number | null }
/** One shared history entry for the full-screen camera/preparation views. */
let entry: Entry | null = null;
/** history.back() is asynchronous: a push in the meantime would be undone by it. */
let backPending = false;
let pushAfterBack: (() => void) | null = null;

function onTop(marker: string) {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[KEY] === marker;
}

function push(marker: string) {
  const state: unknown = window.history.state;
  window.history.pushState({ ...(typeof state === 'object' && state !== null ? state : {}), [KEY]: marker }, '');
}

/**
 * Android's back gesture closes the open full-screen view instead of leaving the page (Spec 184).
 * The extra entry keeps the router's own state, so going back lands on the same address.
 * Closing by a button removes the entry; a view opened right after reuses it (camera → preparation,
 * StrictMode) or waits for the removal to finish.
 */
export function useCloseOnBack(open: boolean, onBack: () => void) {
  const latest = useRef(onBack);
  useEffect(() => { latest.current = onBack; });
  useEffect(() => {
    if (!open) return undefined;
    if (entry && entry.release !== null && onTop(entry.marker)) {
      window.clearTimeout(entry.release);
      entry.release = null;
    } else {
      const marker = crypto.randomUUID();
      try {
        if (backPending) pushAfterBack = () => push(marker);
        else push(marker);
      } catch { return undefined; }
      entry = { marker, release: null };
    }
    const own = entry;
    const pop = () => {
      if (onTop(own.marker)) return;
      window.removeEventListener('popstate', pop);
      if (entry === own) entry = null;
      latest.current();
    };
    window.addEventListener('popstate', pop);
    return () => {
      window.removeEventListener('popstate', pop);
      if (entry !== own) return;
      if (pushAfterBack) { pushAfterBack = null; entry = null; return; }
      own.release = window.setTimeout(() => {
        if (entry !== own) return;
        entry = null;
        if (!onTop(own.marker)) return;
        backPending = true;
        window.addEventListener('popstate', () => {
          backPending = false;
          const next = pushAfterBack;
          pushAfterBack = null;
          try { next?.(); } catch { /* The view still closes with its own buttons. */ }
        }, { once: true });
        window.history.back();
      }, 0);
    };
  }, [open]);
}
