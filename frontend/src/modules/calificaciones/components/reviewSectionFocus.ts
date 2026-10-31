/** A section-entry frame must not steal focus from a newer user interaction. */
export function focusReviewSection(target: HTMLElement | null, expectedFocus: Element | null, reveal: () => void) {
  if (!target?.isConnected || target.closest('[hidden]') || document.activeElement !== expectedFocus || target.contains(document.activeElement)) return;
  target.focus({ preventScroll: true });
  reveal();
}

/** Reveal content only in the owning review scroller. Native scrollIntoView
 * also moves overflow-hidden ancestors and can hide the identity/roster. */
export function revealWithinReview(target: HTMLElement | null, block: 'start' | 'nearest' = 'start') {
  if (!target) return;
  const scroller = target.closest<HTMLElement>('[data-testid="grade-review-scroll"]');
  if (!scroller || !['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY)) {
    target.scrollIntoView({ block });
    return;
  }
  const area = scroller.getBoundingClientRect();
  const content = target.getBoundingClientRect();
  const top = area.top + 12;
  const bottom = area.bottom - 12;
  if (block === 'start' || content.top < top || content.height > bottom - top) {
    scroller.scrollTop = Math.max(0, scroller.scrollTop + content.top - top);
  } else if (content.bottom > bottom) {
    scroller.scrollTop += content.bottom - bottom;
  }
}
