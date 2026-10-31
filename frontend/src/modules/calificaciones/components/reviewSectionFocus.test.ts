import { describe, expect, it, vi } from 'vitest';
import { focusReviewSection, revealWithinReview } from './reviewSectionFocus';

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

describe('138 revelado limitado al panel de revisión', () => {
  function fixture(overflowY: string, top = 260, bottom = 300) {
    const outer = document.createElement('main'); outer.scrollTop = 55;
    const scroller = document.createElement('div'); scroller.dataset.testid = 'grade-review-scroll';
    scroller.style.overflowY = overflowY; scroller.scrollTop = 40;
    const target = document.createElement('section'); scroller.append(target); outer.append(scroller); document.body.append(outer);
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 400, 400));
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 400, bottom - top));
    const fallback = vi.spyOn(target, 'scrollIntoView');
    return { outer, scroller, target, fallback };
  }
  it('mueve solo el scroll interno al entrar en una pregunta', () => {
    const { outer, scroller, target, fallback } = fixture('auto');
    revealWithinReview(target);
    expect(scroller.scrollTop).toBe(188);
    expect(outer.scrollTop).toBe(55);
    expect(fallback).not.toHaveBeenCalled();
    outer.remove();
  });
  it('no desplaza una edición que ya está visible con nearest', () => {
    const { outer, scroller, target, fallback } = fixture('scroll');
    revealWithinReview(target, 'nearest');
    expect(scroller.scrollTop).toBe(40);
    expect(fallback).not.toHaveBeenCalled();
    outer.remove();
  });
  it('revela una edición inferior sin mover contenedores externos', () => {
    const { outer, scroller, target, fallback } = fixture('auto', 480, 540);
    revealWithinReview(target, 'nearest');
    expect(scroller.scrollTop).toBe(92);
    expect(outer.scrollTop).toBe(55);
    expect(fallback).not.toHaveBeenCalled();
    outer.remove();
  });
  it('conserva el scroll nativo cuando el layout usa flujo visible', () => {
    const { outer, target, fallback } = fixture('visible');
    revealWithinReview(target);
    expect(fallback).toHaveBeenCalledWith({ block: 'start' });
    outer.remove();
  });
});
