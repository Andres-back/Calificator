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
  update: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
  activate: vi.fn(),
  pause: vi.fn(),
  context: {
    materia: null as MateriaConEstudiantes | null,
    canManageMateria: true,
    isStudent: false,
  },
}));

vi.mock('@/modules/evaluaciones/api', () => ({
  listEvaluaciones: mocks.list,
  updateEvaluacion: mocks.update,
  publicarEvaluacion: mocks.publish,
  cerrarEvaluacion: mocks.close,
  activarRecepcionEvaluacion: mocks.activate,
  pausarRecepcionEvaluacion: mocks.pause,
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
  fecha_limite_entrega: null,
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
  useAuth.setState({
    user: {
      id: 'profesor-1',
      nombre: 'Docente',
      email: 'docente@example.com',
      rol: 'profesor',
      estado: 'activo',
      permissions: [
        'evaluations.read',
        'evaluations.create',
        'evaluations.update',
        'evaluations.publish',
        'evaluations.delete',
        'grading.read',
        'grading.grade',
      ],
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

    expect(screen.getAllByRole('button', { name: /Crear paso a paso/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Digitalizar de foto\/PDF/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Registrar prueba existente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva evaluación/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Crear paso a paso/i }));

    expect(
      screen.getByRole('dialog', { name: 'Asistente de evaluación' }),
    ).toHaveTextContent('Materia fijada: materia-1');
  });


  it('shows publishing but not grading actions for an online draft', async () => {
    mocks.list.mockResolvedValue([evaluation]);

    renderPage();

    expect(
      await screen.findByText('Evaluación de ciencias'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Publicar' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Calificar|Revisar notas/i }),
    ).not.toBeInTheDocument();
  });

  it('lets the teacher edit and control deliveries after assignment', async () => {
    mocks.list.mockResolvedValue([{
      ...evaluation,
      estado: 'publicada',
      recepcion_habilitada: true,
    }]);
    mocks.pause.mockResolvedValue({ ...evaluation, estado: 'publicada', recepcion_habilitada: false });
    const user = userEvent.setup();

    renderPage();

    expect(await screen.findByRole('button', { name: 'Editar preguntas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar entregas' }));
    await waitFor(() => expect(mocks.pause).toHaveBeenCalledWith('evaluation-1'));
  });

  it('offers reopening for a previously closed evaluation', async () => {
    mocks.list.mockResolvedValue([{
      ...evaluation,
      estado: 'cerrada',
      recepcion_habilitada: false,
    }]);
    mocks.activate.mockResolvedValue({ ...evaluation, estado: 'en_calificacion', recepcion_habilitada: true });
    const user = userEvent.setup();

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Abrir entregas' }));
    await waitFor(() => expect(mocks.activate).toHaveBeenCalledWith('evaluation-1'));
  });
});
