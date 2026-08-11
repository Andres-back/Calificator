import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  listMaterials: vi.fn(),
  listMaterias: vi.fn(),
  getBandejaDocente: vi.fn(),
}));

vi.mock('@/modules/herramientas/api', () => ({ listMaterials: mocks.listMaterials }));
vi.mock('@/modules/materias/api', () => ({ listMaterias: mocks.listMaterias }));
vi.mock('@/modules/calificaciones/api', () => ({ getBandejaDocente: mocks.getBandejaDocente }));

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
  mocks.getBandejaDocente.mockResolvedValue({
    reclamos_abiertos: 0,
    pendientes_revision: 0,
    reclamos: [],
    pendientes: [],
  });
  useAuth.setState({
    user: { id: 'profesor-1', nombre: 'Profesor Demo', email: 'profesor@demo.com', rol: 'profesor', estado: 'activo' },
    status: 'authenticated',
  });
});

describe('DashboardPage docente', () => {
  it('shows claims and pending reviews in the teacher inbox', async () => {
    mocks.getBandejaDocente.mockResolvedValue({
      reclamos_abiertos: 1,
      pendientes_revision: 1,
      reclamos: [{
        id: 'claim-1',
        tipo: 'solicitud_revision',
        calificacion_id: 'grade-1',
        evaluacion_id: 'evaluation-1',
        evaluacion_nombre: 'Evaluación de fracciones',
        materia_id: 'materia-1',
        materia_nombre: 'Matemáticas',
        estudiante_id: 'student-1',
        estudiante_nombre: 'Ana Pérez',
        estado: 'abierta',
        motivo: 'nota',
        descripcion: 'Considero que mi procedimiento es correcto.',
        created_at: '2026-08-11T10:00:00Z',
      }],
      pendientes: [{
        id: 'grade-2',
        tipo: 'calificacion_pendiente',
        calificacion_id: 'grade-2',
        evaluacion_id: 'evaluation-2',
        evaluacion_nombre: 'Taller de decimales',
        materia_id: 'materia-1',
        materia_nombre: 'Matemáticas',
        estudiante_id: 'student-2',
        estudiante_nombre: 'Luis Díaz',
        estado: 'sugerida',
        motivo: null,
        descripcion: null,
        created_at: '2026-08-11T09:00:00Z',
      }],
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Bandeja de revisión' })).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('Luis Díaz')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Revisar Ana Pérez/i })).toHaveAttribute(
      'href',
      '/app/calificaciones/workspace/evaluation-1?calificacion=grade-1',
    );
  });

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
