import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ExtraInstructions } from './base';

const mocks = vi.hoisted(() => ({ captureText: vi.fn() }));
vi.mock('@/components/capture/textCapture', async (original) => ({
  ...(await original<typeof import('@/components/capture/textCapture')>()),
  captureText: mocks.captureText,
}));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ExtraInstructions value={value} onChange={setValue} />;
}

beforeEach(() => vi.clearAllMocks());

describe('203 instrucciones de un recurso desde foto o archivo', () => {
  it('ofrece tomar foto o subir archivo junto al campo', () => {
    render(<Harness />);

    expect(screen.getByLabelText('Tomar una foto de las instrucciones')).toBeInTheDocument();
    expect(screen.getByLabelText('Subir un archivo con las instrucciones')).toBeInTheDocument();
    expect(screen.getByText(/traer el texto de una foto o un archivo/)).toBeInTheDocument();
  });

  it('añade el texto leído debajo de lo que el docente ya escribió', async () => {
    mocks.captureText.mockResolvedValue({ texto: 'Página 12 del libro: el ciclo del agua.', origen: 'foto', advertencias: [], paginas: 1 });
    render(<Harness initial="Usa lenguaje sencillo." />);

    await userEvent.upload(screen.getByLabelText('Subir un archivo con las instrucciones'), new File(['x'], 'pagina.jpg', { type: 'image/jpeg' }));

    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('Usa lenguaje sencillo.\n\nPágina 12 del libro: el ciclo del agua.'));
  });

  it('no deja pasar más de 6000 caracteres al generador', async () => {
    mocks.captureText.mockResolvedValue({ texto: 'a'.repeat(7000), origen: 'PDF', advertencias: [], paginas: 3 });
    render(<Harness />);

    await userEvent.upload(screen.getByLabelText('Subir un archivo con las instrucciones'), new File(['x'], 'libro.pdf', { type: 'application/pdf' }));

    await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toHaveLength(6000));
    expect(screen.getByRole('textbox')).toHaveAttribute('maxlength', '6000');
  });
});
