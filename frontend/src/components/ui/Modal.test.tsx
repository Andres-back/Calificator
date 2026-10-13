import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Modal } from './Modal';

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
