import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardEstudiante } from './DashboardEstudiante';
import { useAuth } from '@/stores/auth';

const calificacionesApi = vi.hoisted(() => ({
  getResumenAcademico: vi.fn(),
}));
const materiasApi = vi.hoisted(() => ({
  listMaterias: vi.fn(),
}));

vi.mock('@/modules/calificaciones/api', () => calificacionesApi);
vi.mock('@/modules/materias/api', () => materiasApi);
vi.mock('@/modules/xali/components/XaliAvatar', () => ({
  XaliAvatar: () => <span>Xali</span>,
}));

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardEstudiante />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: {
      id: 'estudiante-1',
      nombre: 'Estudiante Uno',
      email: 'estudiante@example.test',
      rol: 'estudiante',
      estado: 'activo',
    },
    status: 'authenticated',
  });
  calificacionesApi.getResumenAcademico.mockResolvedValue({
    mejor: { materia_id: 'materia-1', materia_nombre: 'Ciencias', promedio: 4.2, total_notas: 2 },
    por_mejorar: null,
    promedio_general: 4.2,
    total_materias: 1,
    total_notas: 2,
  });
});

describe('DashboardEstudiante', () => {
  it('loads one aggregated summary instead of one report-card request per subject', async () => {
    renderDashboard();

    expect(await screen.findByText('Ciencias')).toBeInTheDocument();
    expect(calificacionesApi.getResumenAcademico).toHaveBeenCalledWith('estudiante-1');
    expect(calificacionesApi.getResumenAcademico).toHaveBeenCalledTimes(1);
    expect(materiasApi.listMaterias).not.toHaveBeenCalled();
    expect(screen.getAllByRole('link', { name: /Pedir ayuda a Xali/i })).toHaveLength(1);
  });
});

describe('189 el inicio no felicita una nota que no aprueba', () => {
  it('con 1.8 / 5.0 pide repasar y no dice «Excelente» ni «Vas muy bien»', async () => {
    calificacionesApi.getResumenAcademico.mockResolvedValue({
      mejor: { materia_id: 'materia-1', materia_nombre: 'Ciencias', promedio: 1.8, total_notas: 1 },
      por_mejorar: null, promedio_general: 1.8, total_materias: 1, total_notas: 1,
    });
    renderDashboard();
    expect(await screen.findByText(/Aún no llega a 3.0/)).toBeInTheDocument();
    expect(screen.getByText('Tu materia')).toBeInTheDocument();
    expect(screen.getByText('Hay que repasar')).toBeInTheDocument();
    expect(screen.queryByText(/¡Excelente!/)).not.toBeInTheDocument();
    expect(screen.queryByText('¡Vas muy bien!')).not.toBeInTheDocument();
    expect(screen.getAllByText('/ 5.0').length).toBeGreaterThan(0);
  });
  it('con 4.2 felicita', async () => {
    renderDashboard();
    expect(await screen.findByText('¡Excelente! Mantén ese ritmo.')).toBeInTheDocument();
  });
});
