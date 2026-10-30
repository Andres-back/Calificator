import { describe, expect, it } from 'vitest';
import { readFeedbackListPosition, restoreFeedbackListPosition } from './feedbackListPosition';

function fixture() {
  const list = document.createElement('div');
  list.scrollTop = 200;
  Object.defineProperties(list, { clientHeight: { value: 200, configurable: true }, scrollHeight: { value: 1000, configurable: true } });
  list.getBoundingClientRect = () => ({ top: 100, bottom: 300 } as DOMRect);
  const offsets = { first: 230, last: 330, outside: 700 };
  for (const id of Object.keys(offsets) as (keyof typeof offsets)[]) {
    const row = document.createElement('div');
    row.dataset.feedbackStudentId = id;
    row.textContent = 'Mismo nombre';
    row.getBoundingClientRect = () => ({ top: 100 + offsets[id] - list.scrollTop, bottom: 180 + offsets[id] - list.scrollTop } as DOMRect);
    list.append(row);
  }
  return { list, offsets };
}

describe('feedback list reading position', () => {
  it('captures the last visible identity and offset without moving the list', () => {
    const { list } = fixture();
    expect(readFeedbackListPosition(list)).toEqual({ scrollTop: 200, anchor: { studentId: 'last', offset: 130 } });
    expect(list.scrollTop).toBe(200);
  });

  it('keeps that student in place when a new link action increases an earlier row', () => {
    const { list, offsets } = fixture();
    const position = readFeedbackListPosition(list);
    offsets.last += 48;
    restoreFeedbackListPosition(list, position);
    expect(list.scrollTop).toBe(248);
    expect(readFeedbackListPosition(list).anchor).toEqual(position.anchor);
  });

  it('restores after remounting with a different scroll offset', () => {
    const { list, offsets } = fixture();
    const position = readFeedbackListPosition(list);
    list.scrollTop = 0;
    offsets.last += 48;
    restoreFeedbackListPosition(list, position);
    expect(list.scrollTop).toBe(248);
  });

  it('uses the saved offset if the anchored student is no longer present', () => {
    const { list } = fixture();
    const position = readFeedbackListPosition(list);
    list.querySelector('[data-feedback-student-id="last"]')!.remove();
    list.scrollTop = 0;
    restoreFeedbackListPosition(list, position);
    expect(list.scrollTop).toBe(200);
  });

  it('clamps only to the available scroll range when the viewport grows', () => {
    const { list } = fixture();
    Object.defineProperty(list, 'scrollHeight', { value: 250 });
    restoreFeedbackListPosition(list, { scrollTop: 200 });
    expect(list.scrollTop).toBe(50);
    restoreFeedbackListPosition(list, { scrollTop: -10 });
    expect(list.scrollTop).toBe(0);
  });

  it('does not overwrite a hidden list position', () => {
    const { list } = fixture();
    Object.defineProperty(list, 'clientHeight', { value: 0 });
    restoreFeedbackListPosition(list, { scrollTop: 0 });
    expect(list.scrollTop).toBe(200);
  });

  it('135 keeps the anchored student header above the action bar after a shorter viewport', () => {
    const { list } = fixture();
    list.scrollTop = 0;
    restoreFeedbackListPosition(list, { scrollTop: 200, anchor: { studentId: 'last', offset: 190 } });
    const row = list.querySelector<HTMLElement>('[data-feedback-student-id="last"]')!;
    expect(row.getBoundingClientRect().top - list.getBoundingClientRect().top).toBeLessThanOrEqual(list.clientHeight - 64);
    expect(list.scrollTop).toBe(194);
  });
});
