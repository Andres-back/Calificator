import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MultiPageEvidencePicker } from './MultiPageEvidencePicker';
import type { EvidencePage } from './evidencePayload';

function Harness({ onError = vi.fn() }: { onError?: (message: string) => void }) {
  const [pages, setPages] = useState<EvidencePage[]>([]);
  return <MultiPageEvidencePicker pages={pages} onChange={setPages} onError={onError} />;
}

function filesInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"][multiple]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No se encontro el selector de archivos');
  return input;
}

function cameraInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"][capture]');
  if (!(input instanceof HTMLInputElement)) throw new Error('No se encontro el selector de camara');
  return input;
}

describe('MultiPageEvidencePicker', () => {
  it('adds, orders, rotates and removes several photos', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const first = new File(['uno'], 'primera.png', { type: 'image/png', lastModified: 1 });
    const second = new File(['dos'], 'segunda.png', { type: 'image/png', lastModified: 2 });

    await user.upload(filesInput(), [first, second]);
    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
    expect(screen.getByLabelText('Rotar hoja 1')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Bajar hoja 1'));
    const cards = screen.getAllByRole('listitem');
    expect(within(cards[0]).getByText('segunda.png')).toBeInTheDocument();
    expect(within(cards[1]).getByText('primera.png')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Rotar hoja 1'));
    await user.click(screen.getByLabelText('Quitar hoja 2'));
    expect(screen.getByText('1 hoja seleccionada')).toBeInTheDocument();
    expect(screen.queryByText('primera.png')).not.toBeInTheDocument();
  });

  it('taking another photo appends instead of replacing the first one', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(cameraInput(), new File(['uno'], 'captura-1.jpg', { type: 'image/jpeg', lastModified: 1 }));
    await user.upload(cameraInput(), new File(['dos'], 'captura-2.jpg', { type: 'image/jpeg', lastModified: 2 }));

    expect(screen.getByText('2 hojas seleccionadas')).toBeInTheDocument();
    expect(screen.getByText('captura-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('captura-2.jpg')).toBeInTheDocument();
  });

  it('rejects a PDF mixed with photos and more than ten photos', async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const { unmount } = render(<Harness onError={onError} />);
    await user.upload(filesInput(), [
      new File(['pdf'], 'guia.pdf', { type: 'application/pdf' }),
      new File(['foto'], 'foto.png', { type: 'image/png' }),
    ]);
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/no los mezcles/i));
    unmount();

    const secondError = vi.fn();
    render(<Harness onError={secondError} />);
    const eleven = Array.from({ length: 11 }, (_, index) => new File(
      [`hoja-${index}`],
      `hoja-${index}.png`,
      { type: 'image/png', lastModified: index + 1 },
    ));
    await user.upload(filesInput(), eleven);
    expect(secondError).toHaveBeenCalledWith(expect.stringMatching(/10 fotograf/i));
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});