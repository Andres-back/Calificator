import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { EvidenceEditContext } from '../api';
import { EvidenceEditDraft } from './EvidenceEditDraft';
import { makeEvidenceDraft, type EvidenceDraftPage } from './evidenceEditModel';

vi.mock('../api', () => ({ readEvidenceEditSource: vi.fn() }));

const context: EvidenceEditContext = {
  version_esperada: '2026-11-24T00:00:00Z', fingerprint: 'a'.repeat(64),
  paginas: [1, 2, 3].map((n) => ({ referencia: `ref${n}`, numero: n, rotacion: 0 as const,
    preview_url: `/api/calificaciones/c1/evidencia/paginas/${n}`, fuente_url: `/api/calificaciones/c1/evidencia/edicion/ref${n}?fingerprint=${'a'.repeat(64)}` })),
  limites: { max_pages: 10, max_file_bytes: 1024 * 1024, max_total_bytes: 4 * 1024 * 1024 },
};

function setup(initial: EvidenceDraftPage[] = makeEvidenceDraft(context)) {
  let pages = initial;
  const onChange = vi.fn((next: EvidenceDraftPage[]) => { pages = next; view.rerender(draft()); });
  const draft = () => <EvidenceEditDraft gradeId="c1" context={context} pages={pages} disabled={false} onChange={onChange} />;
  const view = render(draft());
  return { onChange, current: () => pages };
}

describe('217 editar hojas, fácil para cualquier edad', () => {
  it('cada acción de una hoja dice con palabras qué hace', () => {
    setup();
    const sheet = screen.getAllByRole('listitem')[1];
    for (const [name, text] of [['Girar o recortar la hoja 2', 'Girar o recortar'], ['Subir hoja 2', 'Subir'], ['Bajar hoja 2', 'Bajar'], ['Quitar hoja 2', 'Quitar']]) {
      const button = within(sheet).getByRole('button', { name });
      expect(button).toHaveTextContent(text);
      expect(button).toHaveClass('min-h-11');
    }
  });

  it('una hoja sin tocar dice «Sin cambios» y una foto añadida, «Foto nueva»', () => {
    const file = new File(['x'], 'nueva.jpg', { type: 'image/jpeg' });
    setup([...makeEvidenceDraft(context), { key: 'new', file, rotation: 0 }]);
    expect(screen.getAllByText('Sin cambios')).toHaveLength(3);
    expect(screen.getByText('Foto nueva')).toBeInTheDocument();
    expect(screen.queryByText('Guardada')).not.toBeInTheDocument();
  });

  it('tocar la miniatura abre la hoja en grande y se cierra con un botón', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ver la hoja 2 en grande' }));
    const viewer = screen.getByRole('dialog', { name: 'Hoja 2' });
    expect(within(viewer).getByRole('img', { name: 'Hoja 2 de la entrega' })).toHaveAttribute('src', '/api/calificaciones/c1/evidencia/paginas/2');
    fireEvent.click(within(viewer).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Hoja 2' })).not.toBeInTheDocument();
  });

  it('«Quitar» se puede deshacer y la hoja vuelve a su lugar', () => {
    const { current } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar hoja 2' }));
    expect(current().map((page) => page.key)).toEqual(['ref1', 'ref3']);
    expect(screen.getByRole('status')).toHaveTextContent('Quitaste la hoja 2.');

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    expect(current().map((page) => page.key)).toEqual(['ref1', 'ref2', 'ref3']);
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });

  it('el aviso de deshacer desaparece al hacer otro cambio', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar hoja 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bajar hoja 1' }));
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });
});
