import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Modal } from './Modal';

const motionPreference = vi.hoisted(() => ({ reduced: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...await importOriginal<typeof import('framer-motion')>(),
  useReducedMotion: () => motionPreference.reduced,
}));

it('removes a closed reduced-motion dialog without waiting for animation frames', () => {
  motionPreference.reduced = true;
  const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  const opener = document.createElement('button');
  document.body.append(opener); opener.focus();
  const view = render(<Modal open title="Material" onClose={vi.fn()}>Propuesta</Modal>);
  try {
    expect(screen.getByRole('dialog', { name: 'Material' })).toBeVisible();
    view.rerender(<Modal open={false} title="Material" onClose={vi.fn()}>Propuesta</Modal>);
    expect(screen.queryByRole('dialog', { name: 'Material' })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  } finally {
    view.unmount(); opener.remove(); frame.mockRestore(); motionPreference.reduced = false;
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
