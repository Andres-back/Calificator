import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Modal } from './Modal';

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...await importOriginal<typeof import('framer-motion')>(),
  useReducedMotion: () => motionPreference.reduced,
}));

it('a delayed background autofocus cannot steal focus from the active child dialog', () => {
  motionPreference.reduced = true;
  const callbacks: FrameRequestCallback[] = [];
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    callbacks.push(callback);
    return callbacks.length;
  });
  const view = render(<>
    <Modal open title="Evaluación" onClose={vi.fn()}>Borrador conservado</Modal>
    <Modal open title="Material" onClose={vi.fn()}><button type="button">Crear propuesta</button></Modal>
  </>);
  try {
    const action = screen.getByRole('button', { name: 'Crear propuesta' });
    action.focus();
    act(() => { for (const callback of [...callbacks]) callback(0); });
    expect(action).toHaveFocus();
  } finally {
    view.unmount(); frame.mockRestore(); motionPreference.reduced = false;
  }
});

it.each([false, true])('removes a closed dialog without animation frames (reduced motion: %s)', (reduced) => {
  motionPreference.reduced = reduced;
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  const opener = document.createElement('button');
  document.body.append(opener); opener.focus();
  const view = render(<Modal open title="Material" onClose={vi.fn()}>Propuesta</Modal>);
  try {
    expect(screen.getByRole('dialog', { name: 'Material' })).toBeInTheDocument();
    if (reduced) expect(screen.getByRole('dialog', { name: 'Material' })).toBeVisible();
    view.rerender(<Modal open={false} title="Material" onClose={vi.fn()}>Propuesta</Modal>);
    expect(screen.queryByRole('dialog', { name: 'Material' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  } finally {
    view.unmount(); opener.remove(); frame.mockRestore(); motionPreference.reduced = false;
  }
});

it('a closed child stops blocking Escape on the underlying draft even without animation frames', () => {
  motionPreference.reduced = false;
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  const parentClose = vi.fn(); const childClose = vi.fn();
  const content = (childOpen: boolean) => <>
    <Modal open title="Evaluación" onClose={parentClose}><input aria-label="Borrador" defaultValue="Texto conservado" /></Modal>
    <Modal open={childOpen} title="Figura" onClose={childClose}>Propuesta</Modal>
  </>;
  const view = render(content(true));
  try {
    view.rerender(content(false));
    expect(screen.queryByRole('dialog', { name: 'Figura' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Borrador')).toHaveValue('Texto conservado');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(parentClose).toHaveBeenCalledOnce();
    expect(childClose).not.toHaveBeenCalled();
  } finally {
    view.unmount(); frame.mockRestore();
  }
});

it('only closes the top dialog when a figure is enlarged above a preview', () => {
  const parentClose = vi.fn(); const childClose = vi.fn();
  render(<><Modal open title="Evaluación" onClose={parentClose}>Borrador conservado</Modal>
    <Modal open title="Figura" onClose={childClose}>Figura ampliada</Modal></>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(childClose).toHaveBeenCalledOnce();
  expect(parentClose).not.toHaveBeenCalled();
});

it('keeps focus within opt-in writing forms without focusing folded controls', () => {
  render(<Modal open title="Escribir" onClose={vi.fn()} mobileWriting>
    <details><summary>Opciones</summary><input aria-label="Oculto" /></details>
    <button type="button">Listo</button>
    <div style={{ display: 'none' }}><button type="button">Guardar</button></div>
  </Modal>);
  screen.getByRole('button', { name: 'Listo' }).focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Cerrar diálogo' })).toHaveFocus();
});

it('only applies visible-viewport positioning to explicitly opted-in dialogs', () => {
  const view = render(<Modal open title="Escribir" onClose={vi.fn()} mobileViewport={{ height: 340, top: 58 }}>Texto</Modal>);
  const dialog = screen.getByRole('dialog', { name: 'Escribir' });
  expect(dialog).toHaveStyle({ height: '340px', top: '58px', position: 'fixed' });
  view.rerender(<Modal open title="Escribir" onClose={vi.fn()}>Texto</Modal>);
  expect(dialog.style.height).toBe('');
  expect(dialog.style.position).toBe('');
});

it('fullscreen dialogs trap focus without folded or hidden controls', () => {
  render(<Modal open fullScreen title="Preparar hoja" onClose={vi.fn()}>
    <details><summary>Ajuste preciso</summary><button type="button">Oculto</button></details>
    <div style={{ display: 'none' }}><button type="button">Pestaña oculta</button></div>
    <button type="button">Usar original</button>
  </Modal>);
  expect(screen.getByRole('dialog')).toHaveAttribute('data-full-screen', 'true');
  screen.getByRole('button', { name: 'Usar original' }).focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Cerrar diálogo' })).toHaveFocus();
});

it('returns focus to the opener without scrolling the underlying list', () => {
  const opener = document.createElement('button');
  opener.textContent = 'Ver boletín';
  document.body.append(opener);
  opener.focus();
  const focus = vi.spyOn(opener, 'focus');
  const close = vi.fn();
  const view = render(<Modal open onClose={close} title="Boletín">Notas</Modal>);
  screen.getByRole('button', { name: 'Cerrar diálogo' }).focus();
  view.rerender(<Modal open={false} onClose={close} title="Boletín">Notas</Modal>);
  try {
    expect(opener).toHaveFocus();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
  } finally {
    view.unmount();
    focus.mockRestore();
    opener.remove();
  }
});
