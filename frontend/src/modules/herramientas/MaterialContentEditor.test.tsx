import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MaterialContentEditor } from './MaterialContentEditor';

function EditorHarness() {
  const [value, setValue] = useState<Record<string, unknown>>({
    titulo: 'Título administrado por separado',
    instrucciones: 'Resuelve cada punto.',
    preguntas: [
      {
        numero: 1,
        enunciado: '¿Cuánto es 4 × 5?',
        opciones: ['15', '20'],
        respuesta_correcta: '20',
      },
    ],
    _xcalificator: { generated: true },
  });
  return (
    <>
      <MaterialContentEditor value={value} onChange={setValue} />
      <output data-testid="state">{JSON.stringify(value)}</output>
    </>
  );
}

describe('MaterialContentEditor', () => {
  it('shows criterion evidence and scoring rule without exposing internal references', () => {
    render(<MaterialContentEditor value={{ criterios: [{ nombre: 'Identificación', descripcion: 'Identifica el concepto.', evidencia: 'Palabra escrita.', regla_puntuacion: 'Puntaje por acierto.', preguntas_numeros: [1] }] }} onChange={() => {}} />);
    expect(screen.getByLabelText('Evidencia que se valorará')).toHaveValue('Palabra escrita.');
    expect(screen.getByLabelText('Cómo se otorgan los puntos')).toHaveValue('Puntaje por acierto.');
    expect(screen.queryByText('preguntas numeros')).not.toBeInTheDocument();
  });
  it('edita preguntas y respuestas sin mostrar metadatos técnicos', async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);

    expect(screen.queryByText('_xcalificator')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Título administrado por separado')).not.toBeInTheDocument();

    const question = screen.getByDisplayValue('¿Cuánto es 4 × 5?');
    await user.clear(question);
    await user.type(question, '¿Cuánto es 6 × 7?');

    expect(screen.getByTestId('state')).toHaveTextContent('¿Cuánto es 6 × 7?');
  });

  it('permite agregar y eliminar elementos conservando la numeración', async () => {
    const user = userEvent.setup();
    render(<EditorHarness />);

    const questions = screen.getByRole('heading', { name: 'Preguntas' }).closest('section');
    expect(questions).not.toBeNull();
    await user.click(within(questions as HTMLElement).getAllByRole('button', { name: 'Añadir' })[0]);
    expect(screen.getAllByText(/Preguntas ·/)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Eliminar elemento 2' }));
    expect(screen.getAllByText(/Preguntas ·/)).toHaveLength(1);
  });
});
