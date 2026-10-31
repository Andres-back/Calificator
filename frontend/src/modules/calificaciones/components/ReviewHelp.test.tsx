import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReviewHelp } from './ReviewHelp';

describe('138 ReviewHelp', () => {
  it('mantiene la ayuda general cerrada por defecto y disponible a voluntad', () => {
    render(<ReviewHelp />);
    const summary = screen.getByText('¿Cómo funciona esta revisión?');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(summary).toHaveClass('min-h-11');
    fireEvent.click(summary);
    expect(details).toHaveAttribute('open');
    expect(screen.getByText(/La IA propone una nota sugerida/)).toBeInTheDocument();
    expect(screen.getByText(/no garantizan que la respuesta o la calificación sean correctas/)).toBeInTheDocument();
    fireEvent.click(summary);
    expect(details).not.toHaveAttribute('open');
  });

  it('explica colores, nota final y preparada/original sin pedir acciones académicas', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    render(<ReviewHelp />);
    expect(screen.getByText('Sin avisos de revisión')).toBeInTheDocument();
    expect(screen.getByText('Conviene comprobar')).toBeInTheDocument();
    expect(screen.getByText('Revisión prioritaria')).toBeInTheDocument();
    expect(screen.getByText(/foto preparada/)).toHaveTextContent('foto original');
    expect(screen.getByText(/Historial conserva/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('¿Cómo funciona esta revisión?'));
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    fetch.mockRestore();
  });
});
