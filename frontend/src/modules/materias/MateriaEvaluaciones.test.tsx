import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MateriaEvaluaciones } from './MateriaEvaluaciones';
import { useAuth } from '@/stores/auth';
import type { Evaluacion, MateriaConEstudiantes } from '@/types/api';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
  context: {
    materia: null as MateriaConEstudiantes | null,
    canManageMateria: true,
    isStudent: false,
  },
}));

vi.mock('@/modules/evaluaciones/api', () => ({
  listEvaluaciones: mocks.list,
  createEvaluacion: mocks.create,
  updateEvaluacion: mocks.update,
  publicarEvaluacion: mocks.publish,
  cerrarEvaluacion: mocks.close,
}));
vi.mock('@/modules/evaluaciones/components/GenerationWizard', () => ({
  GenerationWizard: ({
    open,
    initialMateriaId,
  }: {
    open: boolean;
    initialMateriaId: string;
  }) =>
    open ? (
      <div role="dialog" aria-label="Asistente de evaluación">
        Materia fijada: {initialMateriaId}
      </div>
    ) : null,
}));
vi.mock('./MateriaContext', () => ({
  useMateriaContext: () => mocks.context,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const materia: MateriaConEstudiantes = {
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

const evaluation: Evaluacion = {
  id: 'evaluation-1',
  materia_id: materia.id,
  profesor_id: 'profesor-1',
  nombre: 'Evaluación de ciencias',
  descripcion: null,
  tipo_origen: 'nativa',
  modalidad: 'online',
  nota_maxima: 5,
  estado: 'borrador',
  tiempo_limite_minutos: null,
  fecha_publicacion: null,
  dba_ids: [],
  dba_personalizado_ids: [],
  metas_profesor: [],
  criterios: [],
  preguntas: [{ enunciado: 'Pregunta uno' }],
  respuestas_esperadas: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MateriaEvaluaciones />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.materia = materia;
  mocks.context.canManageMateria = true;
  mocks.context.isStudent = false;
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue({
    ...evaluation,
    modalidad: 'fisica',
  });
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

describe('MateriaEvaluaciones teacher creation flow', () => {
  it('offers the guided assistant as the recommended path and fixes the subject', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: '¿Cómo quieres empezar?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Recomendado: crear paso a paso. La IA nunca publica sin tu revisión.',
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getAllByRole('button', { name: /Crear paso a paso/i })[0],
    );

    expect(
      screen.getByRole('dialog', { name: 'Asistente de evaluación' }),
    ).toHaveTextContent('Materia fijada: materia-1');
  });

  it('registers an existing paper test with a simple focused form', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: '¿Cómo quieres empezar?' });
    await user.click(
      screen.getAllByRole('button', {
        name: /Registrar prueba existente/i,
      })[0],
    );

    expect(
      screen.getByText('evaluación en papel'),
    ).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/Nombre de la evaluación/i),
      'Prueba impresa',
    );
    await user.click(
      screen.getByRole('button', { name: 'Registrar evaluación' }),
    );

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        materia_id: 'materia-1',
        nombre: 'Prueba impresa',
        modalidad: 'fisica',
      }),
    );
  });

  it('shows publishing and grading actions for an online draft', async () => {
    mocks.list.mockResolvedValue([evaluation]);

    renderPage();

    expect(
      await screen.findByText('Evaluación de ciencias'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Publicar' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Calificar/i }),
    ).toHaveAttribute(
      'href',
      '/app/materias/materia-1/calificar?evaluacion=evaluation-1',
    );
  });
});
