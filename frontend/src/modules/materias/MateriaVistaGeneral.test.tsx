import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MateriaVistaGeneral } from './MateriaVistaGeneral';
import type { MateriaConEstudiantes } from '@/types/api';

const mocks = vi.hoisted(() => ({
  listEvaluaciones: vi.fn(),
  regenerateCode: vi.fn(),
  context: {
    materia: null as MateriaConEstudiantes | null,
    canManageMateria: true,
    isStudent: false,
  },
}));

vi.mock('@/modules/evaluaciones/api', () => ({
  listEvaluaciones: mocks.listEvaluaciones,
}));
vi.mock('./api', () => ({
  regenerateCode: mocks.regenerateCode,
}));
vi.mock('./MateriaContext', () => ({
  useMateriaContext: () => mocks.context,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const baseMateria: MateriaConEstudiantes = {
  id: 'materia-1',
  profesor_id: 'profesor-1',
  nombre: 'Ciencias',
  area: 'Ciencias Naturales',
  grado: '7',
  descripcion: 'Materia de prueba',
  codigo_matricula: 'ABC123',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  estudiantes: [],
};

function renderOverview() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MateriaVistaGeneral />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.canManageMateria = true;
  mocks.context.isStudent = false;
  mocks.context.materia = { ...baseMateria, estudiantes: [] };
});

describe('MateriaVistaGeneral teacher journey', () => {
  it('guides an empty class to invite students first', async () => {
    mocks.listEvaluaciones.mockResolvedValue([]);

    renderOverview();

    expect(
      await screen.findByRole('heading', { name: 'Invita a tus estudiantes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Ver código de inscripción/i }),
    ).toHaveAttribute('href', '#codigo-inscripcion');
    expect(
      screen.getByText(
        'Disponible cuando se inscriba al menos un estudiante.',
      ).closest('[aria-disabled="true"]'),
    ).toBeInTheDocument();
  });

  it('recommends creating an evaluation when students already joined', async () => {
    mocks.context.materia = {
      ...baseMateria,
      estudiantes: [
        {
          id: 'student-1',
          nombre: 'Ana Pérez',
          email: 'ana@example.test',
          rol: 'estudiante',
          estado: 'activo',
        },
      ],
    };
    mocks.listEvaluaciones.mockResolvedValue([]);

    renderOverview();

    expect(
      await screen.findByRole('heading', {
        name: 'Crea la primera evaluación',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Preparar evaluación/i }),
    ).toHaveAttribute('href', '/app/materias/materia-1/evaluaciones');
    expect(
      screen.getByRole('link', { name: /Tomar asistencia/i }),
    ).toHaveAttribute('href', '/app/materias/materia-1/asistencia');
  });

  it('enables grading and follow-up when prerequisites are ready', async () => {
    mocks.context.materia = {
      ...baseMateria,
      estudiantes: [
        {
          id: 'student-1',
          nombre: 'Ana Pérez',
          email: 'ana@example.test',
          rol: 'estudiante',
          estado: 'activo',
        },
      ],
    };
    mocks.listEvaluaciones.mockResolvedValue([{ id: 'evaluation-1' }]);

    renderOverview();

    expect(
      await screen.findByRole('heading', { name: 'Califica una evaluación' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Ir al flujo de calificación/i }),
    ).toHaveAttribute('href', '/app/materias/materia-1/calificar');
    expect(
      screen.getByRole('link', { name: /Revisar seguimiento/i }),
    ).toHaveAttribute('href', '/app/materias/materia-1/boletin');
  });
});
