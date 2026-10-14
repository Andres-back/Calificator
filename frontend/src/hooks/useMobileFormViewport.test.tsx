import { useRef } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMobileFormViewport } from './useMobileFormViewport';

let media: MediaQueryList;
let viewport: EventTarget & { height: number; offsetTop: number; scale: number };
function Probe({ open = true, submit = vi.fn() }) {
  const scope = useRef<HTMLDivElement>(null);
  const mobile = useMobileFormViewport(open, scope);
  return <><div ref={scope}><form onSubmit={submit}><label>Tema<textarea aria-label="Tema" defaultValue="Texto conservado" /></label><input type="checkbox" aria-label="Criterios" /><button type="button" onClick={mobile.finishWriting}>Listo</button></form></div><output data-testid="state">{JSON.stringify({ mobile: mobile.isMobile, writing: mobile.isWriting, viewport: mobile.viewport })}</output></>;
}
const state = () => JSON.parse(screen.getByTestId('state').textContent!) as { mobile: boolean; writing: boolean; viewport?: { height: number; top: number } };
beforeEach(() => {
  media = Object.assign(new EventTarget(), { matches: true, media: '', onchange: null }) as unknown as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(media);
  viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, scale: 1 });
  vi.stubGlobal('visualViewport', viewport);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('mobile form viewport', () => {
  it('reads visible bounds without focusing a field automatically', async () => {
    render(<Probe />);
    expect(screen.getByLabelText('Tema')).not.toHaveFocus();
    expect(state()).toMatchObject({ mobile: true, writing: false, viewport: { height: 844, top: 0 } });
    act(() => { viewport.height = 340; viewport.offsetTop = 58; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport).toEqual({ height: 340, top: 58 }));
  });
  it('keeps the node, text and selection across resizing and finishes without submitting', async () => {
    const submit = vi.fn();
    render(<Probe submit={submit} />);
    const field = screen.getByLabelText('Tema') as HTMLTextAreaElement;
    act(() => field.focus());
    field.setSelectionRange(2, 7);
    expect(state().writing).toBe(true);
    act(() => { viewport.height = 320; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport?.height).toBe(320));
    expect(screen.getByLabelText('Tema')).toBe(field);
    expect(field.selectionStart).toBe(2);
    expect(field.selectionEnd).toBe(7);
    act(() => screen.getByRole('button', { name: 'Listo' }).focus());
    expect(state().writing).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }));
    expect(state().writing).toBe(false);
    expect(field).toHaveValue('Texto conservado');
    expect(submit).not.toHaveBeenCalled();
  });
  it('does not compact desktop forms or treat a checkbox as writing', () => {
    render(<Probe />);
    act(() => screen.getByLabelText('Criterios').focus());
    expect(state().writing).toBe(false);
    act(() => { Object.assign(media, { matches: false }); media.dispatchEvent(new Event('change')); });
    act(() => screen.getByLabelText('Tema').focus());
    expect(state()).toMatchObject({ mobile: false, writing: false });
    expect(state().viewport).toBeUndefined();
  });
  it('keeps normal layout when zoomed and degrades without visualViewport', async () => {
    render(<Probe />);
    act(() => { viewport.scale = 2; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport).toBeUndefined());
  });
  it('supports focus-only writing without the viewport API', () => {
    vi.stubGlobal('visualViewport', undefined);
    render(<Probe />);
    act(() => screen.getByLabelText('Tema').focus());
    expect(state()).toMatchObject({ mobile: true, writing: true });
    expect(state().viewport).toBeUndefined();
  });
  it('removes scoped viewport/media listeners when closing', () => {
    const added = vi.spyOn(viewport, 'addEventListener');
    const removed = vi.spyOn(viewport, 'removeEventListener');
    const view = render(<Probe />);
    view.rerender(<Probe open={false} />);
    for (const [event, listener] of added.mock.calls) expect(removed).toHaveBeenCalledWith(event, listener);
    expect(state().viewport).toBeUndefined();
  });
  it('restores options when a contracted visible area returns to its original height', async () => {
    const submit = vi.fn();
    render(<Probe submit={submit} />);
    const field = screen.getByLabelText('Tema');
    act(() => field.focus());
    act(() => { viewport.height = 320; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport?.height).toBe(320));
    act(() => { viewport.height = 844; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().writing).toBe(false));
    expect(field).toHaveValue('Texto conservado');
    expect(submit).not.toHaveBeenCalled();
  });
  it('does not end writing on an orientation-width change or lose selection', async () => {
    render(<Probe />);
    const field = screen.getByLabelText('Tema') as HTMLTextAreaElement;
    act(() => field.focus());
    field.setSelectionRange(2, 7);
    act(() => { viewport.height = 320; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport?.height).toBe(320));
    act(() => { vi.stubGlobal('innerWidth', 800); viewport.height = 844; viewport.dispatchEvent(new Event('resize')); });
    await waitFor(() => expect(state().viewport?.height).toBe(844));
    expect(state().writing).toBe(true);
    expect(field).toHaveFocus();
    expect(field.selectionStart).toBe(2);
    expect(field.selectionEnd).toBe(7);
  });
});
