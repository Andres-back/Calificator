import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MateriaVistaGeneral } from './MateriaVistaGeneral';
import type { MateriaConEstudiantes } from '@/types/api';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  listEvaluaciones: vi.fn(),
  regenerateCode: vi.fn(),
  resetTemporaryPassword: vi.fn(),
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
vi.mock('./rosterImportApi', async (original) => ({ ...await original<typeof import('./rosterImportApi')>(), resetTemporaryPassword: mocks.resetTemporaryPassword }));
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
  useAuth.setState({ user: { id: 'profesor-1', permissions: ['subjects.update'] } as never, status: 'authenticated' });
});

describe('MateriaVistaGeneral teacher journey', () => {
  it('requires explicit confirmation to renew an account and cancel does not change a key', async () => {
    mocks.listEvaluaciones.mockResolvedValue([]);
    mocks.context.materia = { ...baseMateria, estudiantes: [{ id: 'student-1', nombre: 'Ana Pérez', email: 'ana@example.test', email_es_interno: true, rol: 'estudiante', estado: 'activo' }] };
    mocks.resetTemporaryPassword.mockResolvedValue({ estudiante_id: 'student-1', email: 'ana@example.test', password_temporal: 'Solo-Ficticia' });
    renderOverview();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Nueva clave' }));
    await waitFor(() => expect(screen.getByText(/todas sus materias/)).toBeVisible());
    expect(mocks.resetTemporaryPassword).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.resetTemporaryPassword).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Nueva clave' }));
    await user.click(screen.getByRole('button', { name: 'Renovar clave' }));
    expect(await screen.findByRole('button', { name: 'Imprimir seleccionados' })).toBeVisible();
    expect(mocks.resetTemporaryPassword).toHaveBeenCalledOnce();
  });
  it('hides registration and renewal without the effective permission', async () => {
    mocks.listEvaluaciones.mockResolvedValue([]);
    useAuth.setState({ user: { id: 'profesor-1', permissions: [] } as never });
    renderOverview();
    expect(screen.queryByRole('button', { name: 'Importar foto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar manualmente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entregar accesos' })).not.toBeInTheDocument();
  });
  it('keeps the students task visible and the guide and enrollment code closed', async () => {
    mocks.listEvaluaciones.mockResolvedValue([]);
    renderOverview();
    expect(screen.getByText('Guía opcional de la materia').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Código de inscripción').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Importar foto' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Entregar accesos' })).toBeVisible();
  });
  it('guides an empty class to invite students first', async () => {
    mocks.listEvaluaciones.mockResolvedValue([]);

    renderOverview();

    await userEvent.setup().click(screen.getByText('Guía opcional de la materia'));

    expect(
      await screen.findByRole('heading', { name: 'Invita a tus estudiantes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Ver código de inscripción/i }),
    ).toHaveAttribute('href', '#codigo-inscripcion');
    await userEvent.setup().click(screen.getByRole('link', { name: /Ver código de inscripción/i }));
    expect(screen.getByText('Código de inscripción').closest('details')).toHaveAttribute('open');
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

    await userEvent.setup().click(screen.getByText('Guía opcional de la materia'));

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

    await userEvent.setup().click(screen.getByText('Guía opcional de la materia'));

    expect(
      await screen.findByRole('heading', { name: 'Califica una evaluación' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Calificar y revisar/i })[0],
    ).toHaveAttribute('href', '/app/calificaciones?materia=materia-1');
    expect(
      screen.getByRole('link', { name: /Revisar seguimiento/i }),
    ).toHaveAttribute('href', '/app/materias/materia-1/boletin');
  });
});
