export interface FeedbackListPosition {
  scrollTop: number;
  anchor?: { studentId: string; offset: number };
}

const rowsIn = (element: HTMLElement) => Array.from(element.querySelectorAll<HTMLElement>('[data-feedback-student-id]'));

/** Keep a visible identity rather than a pixel offset across changing row heights. */
export function readFeedbackListPosition(element: HTMLElement): FeedbackListPosition {
  const viewport = element.getBoundingClientRect();
  const visible = rowsIn(element).filter(row => {
    const bounds = row.getBoundingClientRect();
    return bounds.bottom > viewport.top && bounds.top < viewport.bottom;
  });
  const anchor = visible[visible.length - 1];
  return {
    scrollTop: element.scrollTop,
    ...(anchor ? { anchor: { studentId: anchor.dataset.feedbackStudentId!, offset: anchor.getBoundingClientRect().top - viewport.top } } : {}),
  };
}

export function restoreFeedbackListPosition(element: HTMLElement, position: FeedbackListPosition): void {
  if (!element.clientHeight) return;
  const anchor = position.anchor && rowsIn(element).find(row => row.dataset.feedbackStudentId === position.anchor!.studentId);
  // A shorter viewport or a taller action bar must still leave the student's
  // leading selection control visible (44px touch target plus row padding).
  // Preserve negative/normal reading offsets; only pull a clipped header up.
  const offset = Math.min(position.anchor?.offset ?? 0, Math.max(0, element.clientHeight - 64));
  const desired = anchor && position.anchor
    ? element.scrollTop + anchor.getBoundingClientRect().top - element.getBoundingClientRect().top - offset
    : position.scrollTop;
  element.scrollTop = Math.max(0, Math.min(desired, element.scrollHeight - element.clientHeight));
}
