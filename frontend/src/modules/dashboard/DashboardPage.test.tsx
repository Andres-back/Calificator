import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  listMaterials: vi.fn(),
  listMaterias: vi.fn(),
}));

vi.mock('@/modules/herramientas/api', () => ({ listMaterials: mocks.listMaterials }));
vi.mock('@/modules/materias/api', () => ({ listMaterias: mocks.listMaterias }));

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><DashboardPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listMaterials.mockResolvedValue([]);
  mocks.listMaterias.mockResolvedValue([{ id: 'materia-1', nombre: 'Matemáticas' }]);
  useAuth.setState({
    user: { id: 'profesor-1', nombre: 'Profesor Demo', email: 'profesor@demo.com', rol: 'profesor', estado: 'activo' },
    status: 'authenticated',
  });
});

describe('DashboardPage docente', () => {
  it('prioritizes a clear greeting and the four frequent actions', async () => {
    renderDashboard();

    expect(screen.getByRole('heading', { name: 'Buen día, Profesor' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Calificar evidencia/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear evaluación/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '¿Qué quieres hacer?' })).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes materiales')).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument();
  });
});
