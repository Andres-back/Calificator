import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CuentoForm } from './tools';

vi.mock('@/modules/materias/MateriaSelect', () => ({ useMaterias: () => ({ data: [], isLoading: false }) }));

describe('preferencias del cuento', () => {
  it('envía longitud y moraleja elegidas sin generar al editar', () => {
    const onSubmit = vi.fn();
    render(<QueryClientProvider client={new QueryClient()}><CuentoForm loading={false} onSubmit={onSubmit} /></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'La huerta' } });
    fireEvent.change(screen.getByLabelText(/^Tema/), { target: { value: 'Agua' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Largo' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Sin moraleja' }));
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Revisar antes de generar/ }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'La huerta', longitud: 'largo', moraleja: 'sin' }));
    expect(screen.getByText(/sin contar las preguntas/)).toBeVisible();
  });
});
