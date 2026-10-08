import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudentResultCard } from './StudentResultCard';
const result = { evaluacion_id: 'eval-1', evaluacion_nombre: 'Lectura de Ciencias', nota_confirmada: 4.2, nota_maxima: 5, estado: 'publicada', feedback: 'Explica tu procedimiento con un ejemplo.', fecha: '2026-10-07' };

describe('resultado estudiantil compartido', () => {
  it('links directly to its explanation, with progressive feedback and no staff controls', async () => {
    render(<MemoryRouter><StudentResultCard item={result} /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: result.evaluacion_nombre })).toBeVisible();
    const link = screen.getByRole('link', { name: 'Ver explicación de mi nota' });
    expect(link).toHaveAttribute('href', '/app/evaluaciones/eval-1/resolver#mi-resultado');
    expect(link.querySelector('button')).toBeNull();
    expect(screen.getByText('4.2')).toBeVisible();
    expect(screen.getByText(result.feedback)).not.toBeVisible();
    await userEvent.click(screen.getByText('Retroalimentación del docente'));
    expect(screen.getByText(result.feedback)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Calificar|Editar|Publicar/ })).not.toBeInTheDocument();
  });
  it('preserves a confirmed zero and its explanation', () => {
    render(<MemoryRouter><StudentResultCard item={{ ...result, nota_confirmada: 0 }} /></MemoryRouter>);
    expect(screen.getByText('0.0')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ver explicación de mi nota' })).toBeVisible();
  });
  it('does not turn a pending result into a zero or expose premature feedback', () => {
    render(<MemoryRouter><StudentResultCard item={{ ...result, nota_confirmada: null, estado: 'en_calificacion' }} /></MemoryRouter>);
    expect(screen.getByText('Calificando')).toBeVisible();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver explicación de mi nota' })).not.toBeInTheDocument();
    expect(screen.queryByText(result.feedback)).not.toBeInTheDocument();
  });
});
