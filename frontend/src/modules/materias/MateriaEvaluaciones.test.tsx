import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
    initialEvaluation,
    onPublished,
  }: {
    open: boolean;
    initialMateriaId: string;
    initialEvaluation?: Evaluacion | null;
    onPublished?: (evaluation: Evaluacion) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Asistente de evaluación">
        Materia fijada: {initialMateriaId}
        {initialEvaluation && <p>Editando: {initialEvaluation.nombre}</p>}
        {initialEvaluation && onPublished && <button type="button" onClick={() => onPublished({ ...initialEvaluation, estado: 'publicada' })}>Simular publicación</button>}
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

function LocationProbe() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname + location.search}</p>;
}

function renderPage(initialEntry = '/app/materias/materia-1/evaluaciones') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MateriaEvaluaciones />
        <LocationProbe />
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
    await user.click(within(screen.getByRole('dialog', { name: 'Cerrar entregas' })).getByRole('button', { name: 'Cerrar entregas' }));
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

describe('146 estado legible, carga por tarjeta y confirmación', () => {
  it('muestra el estado en español con su tono y nunca el valor técnico', async () => {
    mocks.list.mockResolvedValue([
      { ...evaluation, id: 'draft', nombre: 'Uno' },
      { ...evaluation, id: 'grading', nombre: 'Dos', estado: 'en_calificacion' },
      { ...evaluation, id: 'review', nombre: 'Tres', estado: 'pendiente_revision' },
    ]);
    renderPage();
    const draft = await screen.findByText('Borrador', { selector: 'span' });
    expect(draft.className).not.toMatch(/emerald/);
    expect(screen.getByText('En calificación')).toBeInTheDocument();
    expect(screen.getByText('Por revisar')).toBeInTheDocument();
    expect(screen.queryByText(/en_calificacion|pendiente_revision/)).not.toBeInTheDocument();
  });

  it('pide confirmar antes de publicar y solo marca carga en la tarjeta publicada', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([
      { ...evaluation, id: 'a', nombre: 'Taller A' },
      { ...evaluation, id: 'b', nombre: 'Taller B' },
    ]);
    mocks.publish.mockReturnValue(new Promise(() => {}));
    renderPage();
    const cardA = await screen.findByRole('group', { name: 'Acciones principales de Taller A' });
    const cardB = screen.getByRole('group', { name: 'Acciones principales de Taller B' });

    await user.click(within(cardA).getByRole('button', { name: 'Publicar' }));
    const dialog = screen.getByRole('dialog', { name: 'Publicar evaluación' });
    expect(dialog).toHaveTextContent('Taller A');
    expect(mocks.publish).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(mocks.publish).not.toHaveBeenCalled();

    await user.click(within(cardA).getByRole('button', { name: 'Publicar' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Publicar evaluación' })).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(mocks.publish).toHaveBeenCalledWith('a'));
    expect(within(cardA).getByRole('button', { name: 'Publicar' })).toHaveAttribute('aria-busy', 'true');
    expect(within(cardB).getByRole('button', { name: 'Publicar' })).not.toHaveAttribute('aria-busy');
    expect(within(cardB).getByRole('button', { name: 'Publicar' })).toBeEnabled();
  });

  it('pide confirmar antes de cerrar entregas y no cierra al cancelar', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([{ ...evaluation, estado: 'publicada', recepcion_habilitada: true }]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cerrar entregas' }));
    const dialog = screen.getByRole('dialog', { name: 'Cerrar entregas' });
    expect(dialog).toHaveTextContent('Evaluación de ciencias');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(mocks.pause).not.toHaveBeenCalled();
  });

  it('156 "Revisar" del monitor abre el borrador digitalizado y limpia el enlace', async () => {
    const digitalized = { ...evaluation, id: 'digital-1', nombre: 'Taller digitalizado', tipo_origen: 'externa_digitalizada', modalidad: 'fisica' as const };
    mocks.list.mockResolvedValue([evaluation, digitalized]);
    renderPage('/app/materias/materia-1/evaluaciones?revisar=digital-1');
    const wizard = await screen.findByRole('dialog', { name: 'Asistente de evaluación' });
    expect(wizard).toHaveTextContent('Editando: Taller digitalizado');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/materias\/materia-1\/evaluaciones$/));
  });

  it('156 un borrador que no está en la materia deja la lista como antes', async () => {
    mocks.list.mockResolvedValue([evaluation]);
    renderPage('/app/materias/materia-1/evaluaciones?revisar=otra-materia');
    expect(await screen.findByRole('group', { name: 'Acciones principales de Evaluación de ciencias' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/app\/materias\/materia-1\/evaluaciones$/));
    expect(screen.queryByRole('dialog', { name: 'Asistente de evaluación' })).not.toBeInTheDocument();
  });

  it('156 al publicar desde el borrador lleva a calificar por foto', async () => {
    const user = userEvent.setup();
    const digitalized = { ...evaluation, id: 'digital-1', nombre: 'Taller digitalizado', tipo_origen: 'externa_digitalizada', modalidad: 'fisica' as const };
    mocks.list.mockResolvedValue([digitalized]);
    renderPage('/app/materias/materia-1/evaluaciones?revisar=digital-1');
    const wizard = await screen.findByRole('dialog', { name: 'Asistente de evaluación' });
    await user.click(within(wizard).getByRole('button', { name: 'Simular publicación' }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('evaluacion=digital-1'));
    expect(screen.getByTestId('location')).toHaveTextContent('modo=carga');
    expect(screen.queryByRole('dialog', { name: 'Asistente de evaluación' })).not.toBeInTheDocument();
  });
});

describe('166 «Editar datos» envía la versión que el docente abrió', () => {
  const versioned = { ...evaluation, contenido_version_id: 'version-1', updated_at: '2026-11-10T05:17:46.263063' };

  async function openEditData() {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Editar datos' }));
    return { user, dialog: screen.getByRole('dialog', { name: 'Editar datos de la evaluación' }) };
  }

  it('incluye la fecha y la versión de contenido de una evaluación con reparto, impresión o copia', async () => {
    mocks.list.mockResolvedValue([versioned]);
    mocks.update.mockResolvedValue(versioned);
    const { user, dialog } = await openEditData();

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('evaluation-1', expect.objectContaining({
      nombre: 'Evaluación de ciencias',
      expected_updated_at: '2026-11-10T05:17:46.263063',
      expected_content_version_id: 'version-1',
    })));
  });

  it('sin versión de contenido envía solo la fecha de actualización', async () => {
    mocks.list.mockResolvedValue([evaluation]);
    mocks.update.mockResolvedValue(evaluation);
    const { user, dialog } = await openEditData();

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    const payload = mocks.update.mock.calls[0][1];
    expect(payload.expected_updated_at).toBe('2026-01-01T00:00:00Z');
    expect(payload).not.toHaveProperty('expected_content_version_id');
  });

  it('un rechazo deja el formulario abierto con lo escrito', async () => {
    mocks.list.mockResolvedValue([versioned]);
    mocks.update.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { detail: 'La evaluación cambió.' } } });
    const { user, dialog } = await openEditData();
    const name = within(dialog).getByDisplayValue('Evaluación de ciencias');
    await user.clear(name);
    await user.type(name, 'Evaluación corregida');

    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog', { name: 'Editar datos de la evaluación' })).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('Evaluación corregida')).toBeInTheDocument();
  });
});
