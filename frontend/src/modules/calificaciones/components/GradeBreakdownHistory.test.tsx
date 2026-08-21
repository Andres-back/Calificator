import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GradeBreakdownHistory } from './GradeBreakdownHistory';
import { getGradeBreakdownHistory } from '../api';

vi.mock('../api', () => ({ getGradeBreakdownHistory: vi.fn() }));

describe('GradeBreakdownHistory', () => {
  beforeEach(() => vi.mocked(getGradeBreakdownHistory).mockResolvedValue([{ id: 'd2', version: 2, origen: 'docente', nota_final: 4.25, activo: true, actor_nombre: 'Profesora Ana', created_at: '2026-08-21T12:00:00Z' }]));

  it('consulta al abrir y muestra la versión vigente', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><GradeBreakdownHistory calificacionId="c1" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Historial del cálculo' }));
    expect(await screen.findByText(/Versión 2 · vigente/)).toBeInTheDocument();
    expect(screen.getByText(/Por Profesora Ana/)).toBeInTheDocument();
    expect(getGradeBreakdownHistory).toHaveBeenCalledWith('c1');
  });
});
