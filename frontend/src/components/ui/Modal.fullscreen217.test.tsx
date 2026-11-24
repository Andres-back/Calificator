import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('217 un diálogo a pantalla completa cubre toda la pantalla', () => {
  it('se dibuja fuera del diálogo que lo abrió, para que su desenfoque no lo encierre', () => {
    render(<Modal open onClose={vi.fn()} title="Editar hojas">
      <Modal open fullScreen onClose={vi.fn()} title="Preparar hoja 1"><button type="button">Usar esta hoja</button></Modal>
    </Modal>);

    const outer = screen.getByRole('dialog', { name: 'Editar hojas' });
    const inner = screen.getByRole('dialog', { name: 'Preparar hoja 1' });
    expect(outer.contains(inner)).toBe(false);
    // Capa a pantalla completa, hija directa del documento.
    expect(inner.parentElement?.parentElement).toBe(document.body);
    // Sigue siendo el diálogo de encima: queda después en el documento.
    const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
    expect(dialogs.item(dialogs.length - 1)).toBe(inner);
  });

  it('los diálogos normales no cambian de lugar', () => {
    const { container } = render(<Modal open onClose={vi.fn()} title="Normal"><p>Contenido</p></Modal>);
    expect(container.contains(screen.getByRole('dialog', { name: 'Normal' }))).toBe(true);
  });
});
