/** Embedded feedback grows inside the grade scroller; only a bounded dialog
 * owns an inner scroll area. Containing an unbounded child traps mobile swipes. */
export function feedbackScrollLayout(embedded?: boolean) {
  return {
    className: embedded ? 'overflow-visible' : 'min-h-0 flex-1 overflow-y-auto overscroll-contain',
    'data-mobile-scroll': embedded ? undefined : true,
    'data-feedback-scroll': embedded ? 'outer' : 'self',
  };
}
