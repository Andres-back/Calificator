import { describe, expect, it, vi } from 'vitest';
import { focusReviewSection } from './reviewSectionFocus';

describe('136 foco diferido de entrada a una sección', () => {
  it('no roba el foco si el docente ya llegó a Compartir antes del siguiente frame', () => {
    const trigger = document.createElement('button');
    const section = document.createElement('section'); section.tabIndex = -1;
    const share = document.createElement('button'); section.append(share);
    document.body.append(trigger, section);
    trigger.focus(); const expected = document.activeElement;
    share.focus();
    const reveal = vi.fn();
    focusReviewSection(section, expected, reveal);
    expect(share).toHaveFocus();
    expect(reveal).not.toHaveBeenCalled();
    trigger.remove(); section.remove();
  });
  it('enfoca y revela solo una sección vigente si nadie reclamó otro foco', () => {
    const trigger = document.createElement('button');
    const section = document.createElement('section'); section.tabIndex = -1;
    document.body.append(trigger, section); trigger.focus();
    const reveal = vi.fn();
    focusReviewSection(section, trigger, reveal);
    expect(section).toHaveFocus(); expect(reveal).toHaveBeenCalledOnce();
    trigger.focus(); section.hidden = true;
    focusReviewSection(section, trigger, reveal);
    expect(trigger).toHaveFocus(); expect(reveal).toHaveBeenCalledOnce();
    trigger.remove(); section.remove();
  });
});
