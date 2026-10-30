/** A section-entry frame must not steal focus from a newer user interaction. */
export function focusReviewSection(target: HTMLElement | null, expectedFocus: Element | null, reveal: () => void) {
  if (!target?.isConnected || target.closest('[hidden]') || document.activeElement !== expectedFocus || target.contains(document.activeElement)) return;
  target.focus({ preventScroll: true });
  reveal();
}
