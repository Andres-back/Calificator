import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PresentacionesPage } from './PresentacionesPage';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('./api', () => ({
  listPresentaciones: mocks.list,
  createPresentacion: mocks.create,
  deletePresentacion: mocks.remove,
}));
vi.mock('@/modules/materias/MateriaSelect', () => ({
  useMaterias: () => ({ data: [] }),
}));
vi.mock('@/lib/hooks', () => ({
  useDeleteConfirm: () => ({
    target: null,
    setTarget: vi.fn(),
    mutation: { mutate: vi.fn(), isPending: false },
  }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PresentacionesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
});

describe('PresentacionesPage access variants', () => {
  it('uses assigned-content language and no editorial actions for a standard student', async () => {
    useAuth.setState({
      user: {
        id: 'student-1',
        nombre: 'Estudiante',
        email: 'student@example.test',
        rol: 'estudiante',
        estado: 'activo',
        permissions: ['presentations.read'],
      },
      status: 'authenticated',
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Presentaciones de clase' })).toBeInTheDocument();
    expect(screen.getByText('Consulta las presentaciones que tus docentes compartieron contigo.')).toBeInTheDocument();
    expect(await screen.findByText('Sin presentaciones asignadas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva presentación/i })).not.toBeInTheDocument();
    expect(screen.queryByText('En proceso')).not.toBeInTheDocument();
  });

  it('keeps the editorial experience for a teacher with authoring permissions', async () => {
    useAuth.setState({
      user: {
        id: 'teacher-1',
        nombre: 'Docente',
        email: 'teacher@example.test',
        rol: 'profesor',
        estado: 'activo',
        permissions: ['presentations.read', 'presentations.create'],
      },
      status: 'authenticated',
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Presentaciones' })).toBeInTheDocument();
    expect(screen.getByText('Genera, revisa y exporta material de clase sin perder el control editorial.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Nueva presentación/i }).length).toBeGreaterThan(0);
  });
});
