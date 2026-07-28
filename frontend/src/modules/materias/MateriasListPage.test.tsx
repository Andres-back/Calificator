import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MateriasListPage } from './MateriasListPage';
import { useAuth } from '@/stores/auth';
import type { Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock('./api', () => ({
  listMaterias: mocks.list,
  createMateria: mocks.create,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const createdMateria: Materia = {
  id: 'materia-1',
  profesor_id: 'profesor-1',
  nombre: 'Matemáticas',
  area: 'Matemáticas',
  grado: '7°',
  descripcion: null,
  codigo_matricula: 'ABC123',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage(initialEntry = '/app/materias') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/materias" element={<MateriasListPage />} />
          <Route
            path="/app/materias/:id"
            element={<h1>Vista guiada de la materia</h1>}
          />
          <Route
            path="/app/materias/:id/evaluaciones"
            element={<h1>Preparar evaluación contextual</h1>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText(/Nombre de la materia/i),
    'Matemáticas',
  );
  await user.type(screen.getByLabelText(/^Área/i), 'Matemáticas');
  await user.type(screen.getByLabelText(/^Grado/i), '7°');
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue(createdMateria);
  useAuth.setState({
    user: {
      id: 'profesor-1',
      nombre: 'Docente',
      email: 'docente@example.com',
      rol: 'profesor',
      estado: 'activo',
    },
    status: 'authenticated',
  });
});

describe('MateriasListPage guided creation', () => {
  it('requires pedagogical context and continues to the guided overview', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Aún no tienes materias' });
    await user.click(
      screen.getByRole('button', { name: 'Crear mi primera materia' }),
    );

    const submit = screen.getByRole('button', {
      name: /Crear y continuar/i,
    });
    expect(submit).toBeDisabled();
    expect(
      screen.getByText('Completa nombre, área y grado para continuar.'),
    ).toBeInTheDocument();

    await fillRequiredFields(user);
    expect(submit).toBeEnabled();
    expect(
      screen.getByText(
        /Todo listo. Crearemos la materia y continuaremos con invitar a tus estudiantes/i,
      ),
    ).toBeInTheDocument();

    await user.click(submit);

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        nombre: 'Matemáticas',
        area: 'Matemáticas',
        grado: '7°',
        descripcion: undefined,
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Vista guiada de la materia',
      }),
    ).toBeInTheDocument();
  });

  it('preserves the evaluation intention after creating the first subject', async () => {
    const user = userEvent.setup();
    renderPage('/app/materias?accion=evaluar');

    expect(
      await screen.findByRole('heading', {
        name: 'Elige la materia para preparar la evaluación',
      }),
    ).toBeInTheDocument();
    await screen.findByRole('heading', { name: 'Aún no tienes materias' });
    await user.click(
      screen.getByRole('button', { name: 'Nueva materia' }),
    );
    expect(
      screen.getByText(/Después te llevaremos a preparar la evaluación/i),
    ).toBeInTheDocument();

    await fillRequiredFields(user);
    await user.click(
      screen.getByRole('button', { name: /Crear y continuar/i }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Preparar evaluación contextual',
      }),
    ).toBeInTheDocument();
  });
});
