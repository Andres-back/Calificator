import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StoryContent } from './StoryContent';

describe('StoryContent', () => {
  it('108 presenta título, ilustración completa y narración en ese orden', () => {
    render(<StoryContent data={{ titulo: 'Lectura vertical', imagen: { b64_data: 'synthetic' }, parrafos: ['Narración después de la imagen.'] }} />);
    const title = screen.getByRole('heading', { name: 'Lectura vertical' });
    const image = screen.getByRole('img', { name: 'Lectura vertical' });
    const narrative = screen.getByLabelText('Narración del cuento');
    expect(title.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(image.compareDocumentPosition(narrative) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(image).toHaveClass('object-contain');
    expect(image.closest('[class*="lg:grid-cols-"]')).toBeNull();
  });
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
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('La ilustración todavía no está disponible.')).toBeVisible();
  });

  it('no duplica el prefijo numérico de preguntas generadas', () => {
    render(<StoryContent data={{ parrafos: ['Lina cuidó la huerta.'], preguntas_comprension: ['1. ¿Qué pasó?'] }} />);
    expect(screen.getByText('¿Qué pasó?')).toBeVisible();
    expect(screen.queryByText('1. ¿Qué pasó?')).not.toBeInTheDocument();
  });
});
