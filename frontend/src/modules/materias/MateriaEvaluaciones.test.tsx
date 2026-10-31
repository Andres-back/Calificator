import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MateriaEvaluaciones } from './MateriaEvaluaciones';
import { useAuth } from '@/stores/auth';
import type { Evaluacion, MateriaConEstudiantes } from '@/types/api';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
  publish: vi.fn(),
  close: vi.fn(),
  activate: vi.fn(),
  pause: vi.fn(),
  remove: vi.fn(),
  context: {
    materia: null as MateriaConEstudiantes | null,
    canManageMateria: true,
    isStudent: false,
  },
}));

vi.mock('@/modules/evaluaciones/api', () => ({
  listEvaluaciones: mocks.list,
  updateEvaluacion: mocks.update,
  createEvaluacion: mocks.create,
  publicarEvaluacion: mocks.publish,
  cerrarEvaluacion: mocks.close,
  activarRecepcionEvaluacion: mocks.activate,
  pausarRecepcionEvaluacion: mocks.pause,
  deleteEvaluacion: mocks.remove,
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
vi.mock('@/modules/evaluaciones/components/EvaluationPreviewModal', () => ({
  EvaluationPreviewModal: ({ evaluation }: { evaluation: Evaluacion }) => <div role="dialog" aria-label="Vista final">{evaluation.nombre}</div>,
}));
vi.mock('@/modules/evaluaciones/components/EvaluationCriteriaEditor', () => ({
  EvaluationCriteriaEditor: ({ evaluation }: { evaluation: Evaluacion }) => <div role="dialog" aria-label="Criterios y rúbrica">{evaluation.nombre}</div>,
}));
vi.mock('./MateriaContext', () => ({
  useMateriaContext: () => mocks.context,
}));
vi.mock('@/modules/materias/dbaApi', () => ({ listDbaCombinado: vi.fn().mockResolvedValue([]) }));
vi.mock('@/modules/evaluaciones/visualApi', () => ({
  getVisualCapabilities: vi.fn().mockResolvedValue({ documento: false }),
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
  mocks.create.mockResolvedValue(evaluation);
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
  it('097 preserves manual pending text through Listo and personalization without creating records', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query.includes('max-width'), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList));
    try {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));
      await user.click(screen.getByRole('button', { name: 'Crear manualmente' }));
      const dialog = screen.getByRole('dialog', { name: 'Crear manualmente · Ciencias' });
      const pending = within(dialog).getByPlaceholderText('Escribe una pregunta para la evaluación');
      expect(pending.tagName).toBe('TEXTAREA');
      expect(pending).not.toHaveFocus();
      await user.type(pending, '¿Por qué cambia el agua de estado?');
      await user.click(within(dialog).getByRole('button', { name: 'Listo' }));
      await user.click(within(dialog).getByText('Personalizar', { exact: true }));
      const scale = within(dialog).getByLabelText(/^Nota maxima/);
      await user.clear(scale);
      await user.type(scale, '10');
      await user.click(within(dialog).getByRole('button', { name: 'Listo' }));
      expect(scale).toHaveValue(10);
      await user.click(within(dialog).getByText('Personalizar', { exact: true }));
      expect(scale).toHaveValue(10);
      expect(pending).toHaveValue('¿Por qué cambia el agua de estado?');
      await user.click(within(dialog).getByRole('button', { name: 'Crear manualmente' }));
      await waitFor(() => expect(within(dialog).getByLabelText(/^Nombre/)).toHaveFocus());
      expect(pending).toHaveValue('¿Por qué cambia el agua de estado?');
      expect(mocks.create).not.toHaveBeenCalled();
      expect(mocks.publish).not.toHaveBeenCalled();
    } finally { media.mockRestore(); }
  });
  it('096 creates manually in the same subject through the existing form without publishing', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));
    await user.click(screen.getByRole('button', { name: 'Crear manualmente' }));
    const dialog = screen.getByRole('dialog', { name: 'Crear manualmente · Ciencias' });
    expect(within(dialog).getByLabelText(/^Materia/)).toHaveValue(materia.id);
    expect(within(dialog).getByLabelText(/^Materia/)).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText(/^Nombre/), 'Evaluación preparada');
    await user.click(within(dialog).getByRole('button', { name: 'Crear manualmente' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ materia_id: materia.id, nombre: 'Evaluación preparada' })));
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('estado');
  });
  it('095 limita acciones principales y conserva ajustes con elección explícita', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([{ ...evaluation, estado: 'publicada', modalidad: 'fisica' }]);
    renderPage();
    const primary = await screen.findByRole('group', { name: 'Acciones principales de Evaluación de ciencias' });
    expect(within(primary).getAllByRole('button')).toHaveLength(1);
    expect(within(primary).getAllByRole('link')).toHaveLength(2);
    expect(within(primary).getByRole('link', { name: 'Ver notas' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar preguntas' })).not.toBeVisible();
    await user.click(screen.getByText('Más opciones', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Criterios y rúbrica' }));
    expect(screen.getByRole('dialog', { name: 'Criterios y rúbrica' })).toHaveTextContent(evaluation.nombre);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('opens criteria directly from the saved evaluation, never for a read-only teacher', async () => {
    mocks.list.mockResolvedValue([evaluation]);
    const view = renderPage();
    await userEvent.setup().click(await screen.findByText('Más opciones', { exact: true }));
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Criterios y rúbrica' }));
    expect(screen.getByRole('dialog', { name: 'Criterios y rúbrica' })).toHaveTextContent(evaluation.nombre);
    view.unmount();
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['evaluations.read'] } });
    renderPage();
    await screen.findByText(evaluation.nombre);
    expect(screen.queryByRole('button', { name: 'Criterios y rúbrica' })).not.toBeInTheDocument();
  });
  it('allows preview with read permission only without opening the editor or changing records', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([evaluation]);
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['evaluations.read'] } });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Visualizar' }));
    expect(screen.getByRole('dialog', { name: 'Vista final' })).toHaveTextContent(evaluation.nombre);
    expect(screen.queryByRole('button', { name: 'Editar preguntas' })).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('offers direct capture for paper/mixed only, preserving review and context', async () => {
    mocks.list.mockResolvedValue([
      { ...evaluation, estado: 'publicada', modalidad: 'fisica' },
      { ...evaluation, id: 'mixed', estado: 'cerrada', modalidad: 'mixta' },
      { ...evaluation, id: 'online', estado: 'publicada', modalidad: 'online' },
      { ...evaluation, id: 'draft', modalidad: 'fisica' },
    ]);
    renderPage();
    const capture = await screen.findAllByRole('link', { name: 'Calificar por foto' });
    expect(capture).toHaveLength(2);
    expect(capture[0]).toHaveAttribute('href', '/app/calificaciones?materia=materia-1&evaluacion=evaluation-1&modo=carga');
    expect(capture[1]).toHaveAttribute('href', '/app/calificaciones?materia=materia-1&evaluacion=mixed&modo=carga');
    expect(screen.getAllByRole('link', { name: 'Ver notas' })).toHaveLength(3);
  });

  it('does not grant capture to a read-only teacher', async () => {
    mocks.list.mockResolvedValue([{ ...evaluation, estado: 'publicada', modalidad: 'fisica' }]);
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['evaluations.read', 'grading.read'] } });
    renderPage();
    expect(await screen.findByText('Evaluación de ciencias')).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Calificar por foto' })).not.toBeInTheDocument();
  });
  it('abre Calificar con evaluación y materia y no lo ofrece en borradores', async () => {
    mocks.list.mockResolvedValue([{ ...evaluation, estado: 'publicada' }, { ...evaluation, id: 'draft-1', nombre: 'Borrador' }]);
    renderPage();
    const action = await screen.findByRole('link', { name: 'Ver notas' });
    expect(action).toHaveAttribute('href', '/app/calificaciones?materia=materia-1&evaluacion=evaluation-1');
    expect(screen.getAllByRole('link', { name: 'Ver notas' })).toHaveLength(1);
  });
  it('138 abre la revisión contextual con subjects.read sin perder materia/evaluación', async () => {
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: [...useAuth.getState().user!.permissions!, 'subjects.read'] } });
    mocks.list.mockResolvedValue([{ ...evaluation, estado: 'publicada' }]);
    renderPage();
    expect(await screen.findByRole('link', { name: 'Ver notas' })).toHaveAttribute('href', '/app/materias/materia-1/evaluaciones/evaluation-1/revision?materia=materia-1&evaluacion=evaluation-1');
  });
  it('shows only learner actions with the real shared read permissions', async () => {
    mocks.context.canManageMateria = false;
    mocks.context.isStudent = true;
    mocks.list.mockResolvedValue([{
      ...evaluation,
      estado: 'publicada',
      recepcion_habilitada: true,
    }]);
    useAuth.setState({
      user: {
        id: 'estudiante-1',
        nombre: 'Estudiante',
        email: 'estudiante@example.test',
        rol: 'estudiante',
        estado: 'activo',
        permissions: ['evaluations.read', 'evaluations.submit', 'grading.read'],
      },
      status: 'authenticated',
    });

    renderPage();

    expect(await screen.findByText('Evaluación de ciencias')).toBeInTheDocument();
    expect(screen.queryByText('Preparar una evaluación')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar|Publicar|Cerrar entregas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Calificar y revisar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/app/evaluaciones/evaluation-1/resolver');
  });

  it('offers one creation entry and fixes the subject for the assistant', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Evaluaciones' }),
    ).toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: 'Crear evaluación' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));
    expect(screen.getByRole('button', { name: 'Usar foto o PDF' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar prueba existente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Nueva evaluación/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Crear con IA' }));

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
      screen.queryByRole('link', { name: /Calificar|Ver notas/i }),
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
