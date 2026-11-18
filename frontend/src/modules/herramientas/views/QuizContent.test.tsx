import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContenidoView, type ToolContent } from './ContenidoView';
import { QuizContent } from './QuizContent';
import { correctOptionIndex } from './resourceLabels';

const quiz = {
  instrucciones: 'Elige la opción correcta.',
  preguntas: [
    { numero: 1, enunciado: '¿Cuál es el centro del sistema solar?', opciones: ['A) La Tierra', 'B) El Sol', 'C) La Luna'], respuesta_correcta: 'B)' },
    { numero: 2, enunciado: '¿Cuántos planetas hay?', opciones: ['A) 6', 'B) 7', 'C) 8'], respuesta_correcta: 'C)' },
  ],
};

const group = (name: RegExp) => screen.getByRole('radiogroup', { name });

describe('197 clave de respuestas', () => {
  it('reconoce la opción correcta en las formas en que la escribe la IA', () => {
    const options = ['A) La Tierra', 'B) El Sol', 'C) La Luna'];
    expect(correctOptionIndex(options, 'B')).toBe(1);
    expect(correctOptionIndex(options, 'B)')).toBe(1);
    expect(correctOptionIndex(options, 'b.')).toBe(1);
    expect(correctOptionIndex(options, 'Opción B')).toBe(1);
    expect(correctOptionIndex(options, 'B) El Sol')).toBe(1);
    expect(correctOptionIndex(options, 'El Sol')).toBe(1);
    expect(correctOptionIndex(options, 'el sol.')).toBe(1);
    expect(correctOptionIndex(['Verdadero', 'Falso'], 'Falso')).toBe(1);
    // Fuera de rango o sin coincidencia: no se inventa una respuesta.
    expect(correctOptionIndex(['Verdadero', 'Falso'], 'D')).toBe(-1);
    expect(correctOptionIndex(options, 'Marte')).toBe(-1);
    expect(correctOptionIndex(options, '')).toBe(-1);
    expect(correctOptionIndex([], 'A')).toBe(-1);
  });

  it('«Ver respuestas» del examen marca la opción cuando la clave viene como «B)»', async () => {
    const user = userEvent.setup();
    const data = { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], ...quiz } as unknown as ToolContent;
    render(<ContenidoView tipo="examen" data={data} />);

    await user.click(screen.getByRole('button', { name: /Ver respuestas/ }));

    expect(screen.getByText('El Sol').closest('p')).toHaveClass('text-emerald-700');
    expect(screen.getByText('La Tierra').closest('p')).not.toHaveClass('text-emerald-700');
  });
});

describe('197 quiz rápido interactivo', () => {
  it('se responde en pantalla, se comprueba y muestra el resultado', async () => {
    const user = userEvent.setup();
    render(<QuizContent data={quiz} />);

    const check = screen.getByRole('button', { name: /Comprobar respuestas/ });
    expect(check).toBeDisabled();
    expect(screen.getByText('0 de 2')).toBeInTheDocument();

    await user.click(within(group(/centro del sistema solar/)).getByRole('radio', { name: /El Sol/ }));
    expect(within(group(/centro del sistema solar/)).getByRole('radio', { name: /El Sol/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Te faltan 1 por responder.')).toBeInTheDocument();
    await user.click(within(group(/Cuántos planetas/)).getByRole('radio', { name: /7/ }));
    expect(screen.getByText('2 de 2')).toBeInTheDocument();

    await user.click(check);

    expect(screen.getByRole('status')).toHaveTextContent('Acertaste 1 de 2.');
    expect(screen.getByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.getByText('La respuesta correcta es la C.')).toBeInTheDocument();
    expect(within(group(/Cuántos planetas/)).getByRole('radio', { name: /8/ })).toHaveAttribute('data-correct', 'true');
    // Tras comprobar no se puede cambiar la respuesta.
    expect(within(group(/Cuántos planetas/)).getByRole('radio', { name: /6/ })).toBeDisabled();
  });

  it('permite intentar de nuevo desde cero', async () => {
    const user = userEvent.setup();
    render(<QuizContent data={quiz} />);
    await user.click(within(group(/centro del sistema solar/)).getByRole('radio', { name: /La Luna/ }));
    await user.click(screen.getByRole('button', { name: /Comprobar respuestas/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Acertaste 0 de 2.');
    expect(screen.getByText('Sin responder. La respuesta correcta es la C.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Intentar de nuevo/ }));

    expect(screen.getByText('0 de 2')).toBeInTheDocument();
    expect(within(group(/centro del sistema solar/)).getByRole('radio', { name: /La Luna/ })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('button', { name: /Comprobar respuestas/ })).toBeDisabled();
  });

  it('«Ver respuestas» muestra la clave sin responder y celebra el acierto total', async () => {
    const user = userEvent.setup();
    render(<QuizContent data={quiz} />);

    await user.click(screen.getByRole('button', { name: /Ver respuestas/ }));
    expect(within(group(/centro del sistema solar/)).getByRole('radio', { name: /El Sol/ })).toHaveAttribute('data-correct', 'true');
    await user.click(screen.getByRole('button', { name: /Ocultar respuestas/ }));
    expect(within(group(/centro del sistema solar/)).getByRole('radio', { name: /El Sol/ })).not.toHaveAttribute('data-correct');

    await user.click(within(group(/centro del sistema solar/)).getByRole('radio', { name: /El Sol/ }));
    await user.click(within(group(/Cuántos planetas/)).getByRole('radio', { name: /8/ }));
    await user.click(screen.getByRole('button', { name: /Comprobar respuestas/ }));
    expect(screen.getByRole('status')).toHaveTextContent('¡Excelente! Acertaste 2 de 2.');
  });

  it('la vista de recursos usa el quiz interactivo y avisa si no hay preguntas', () => {
    const data = { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], ...quiz } as unknown as ToolContent;
    const { unmount } = render(<ContenidoView tipo="quiz_rapido" data={data} />);
    expect(screen.getByRole('button', { name: /Comprobar respuestas/ })).toBeInTheDocument();
    unmount();

    render(<QuizContent data={{ preguntas: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No se generaron preguntas');
  });
});
