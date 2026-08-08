import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RevisionGuide } from './RevisionGuide';

describe('RevisionGuide', () => {
  it('muestra preguntas, opciones y respuestas correctas con etiquetas claras', () => {
    render(
      <RevisionGuide
        items={[{
          numero: 1,
          enunciado: '¿Cuánto es 4 × 9?',
          tipo: 'seleccion_multiple',
          opciones: ['A) 32', 'B) 36'],
          respuesta_correcta: 'B) 36',
          puntaje: 1,
        }]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Guía de revisión' })).toBeInTheDocument();
    expect(screen.getByText('¿Cuánto es 4 × 9?')).toBeInTheDocument();
    expect(screen.getAllByText('B) 36')).toHaveLength(2);
    expect(screen.getByText('Respuesta correcta')).toBeInTheDocument();
  });

  it('explica cuando no existe una clave registrada', () => {
    render(<RevisionGuide items={[]} />);

    expect(screen.getByText('Esta evaluación no tiene una clave de respuestas registrada.')).toBeInTheDocument();
  });
});
