export type EnqueueRender = (draw: () => Promise<void>) => () => void;

/** Serialize rendering across pages, including pending cancellations. */
export function createRenderQueue(): EnqueueRender {
  let tail = Promise.resolve();
  return (draw) => {
    let cancelled = false;
    tail = tail.then(async () => { if (!cancelled) await draw(); }).catch(() => {});
    return () => { cancelled = true; };
  };
}
