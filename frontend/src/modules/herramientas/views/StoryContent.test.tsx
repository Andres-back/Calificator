import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoryContent } from './StoryContent';

describe('StoryContent', () => {
  it('organiza portada, personajes, narración, enseñanza y preguntas con jerarquía legible', () => {
    render(
      <StoryContent
        data={{
          titulo: 'El secreto de Xali',
          personajes: ['Lina', 'Xali'],
          parrafos: ['Lina encontró una respuesta sorprendente.', 'Xali le enseñó a verificarla.'],
          moraleja: 'La tecnología ayuda más cuando pensamos antes de confiar.',
          preguntas_comprension: ['¿Qué encontró Lina?', { enunciado: '¿Qué aprendió con Xali?' }],
        }}
      />,
    );

    expect(screen.getByTestId('story-view')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'El secreto de Xali' })).toBeVisible();
    expect(screen.getByText('Conoce a los personajes')).toBeVisible();
    expect(screen.getByLabelText('Narración del cuento')).toHaveTextContent('2 escenas para leer');
    expect(screen.getByRole('heading', { name: 'La enseñanza que nos deja' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Piensa y conversa' })).toBeVisible();
    expect(screen.getByText('¿Qué aprendió con Xali?')).toBeVisible();
  });

  it('mantiene una salida útil cuando la ilustración no está disponible', () => {
    render(<StoryContent data={{ parrafos: ['La historia continúa.'], imagen: { is_placeholder: true } }} />);

    expect(screen.getByText('Historia lista para leer')).toBeVisible();
    expect(screen.getByText('La historia continúa.')).toBeInTheDocument();
  });
});
