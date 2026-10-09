import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MateriaBoletin } from './MateriaBoletin';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({ list: vi.fn(), grades: vi.fn(), boletin: vi.fn(), context: { canManageMateria: true, materia: { id: 'materia-1', nombre: 'Ciencias', estudiantes: Array.from({ length: 30 }, (_, index) => ({ id: `student-${index}`, nombre: `Alumno ${index}`, email: `${index}@example.test` })) } } }));
vi.mock('./MateriaContext', () => ({ useMateriaContext: () => mocks.context }));
vi.mock('@/modules/evaluaciones/api', () => ({ listEvaluaciones: mocks.list }));
vi.mock('@/modules/calificaciones/api', () => ({ listCalificaciones: mocks.grades, getBoletin: mocks.boletin }));

const evaluations = [
  { id: 'eval-1', nombre: 'Primera evaluación', nota_maxima: 5, estado: 'publicada' },
  { id: 'eval-2', nombre: 'Segunda evaluación', nota_maxima: 5, estado: 'cerrada' },
  { id: 'draft', nombre: 'Borrador oculto', nota_maxima: 5, estado: 'borrador' },
];

function renderPage(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => <QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><MateriaBoletin /></MemoryRouter></QueryClientProvider>;
  const result = render(view());
  return { ...result, client, rerenderPage: () => result.rerender(view()) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.context.materia = { id: 'materia-1', nombre: 'Ciencias', estudiantes: Array.from({ length: 30 }, (_, index) => ({ id: `student-${index}`, nombre: `Alumno ${index}`, email: `${index}@example.test` })) };
  mocks.context.canManageMateria = true;
  mocks.list.mockResolvedValue(evaluations);
  mocks.grades.mockImplementation(async (id: string) => id === 'eval-1' ? [
    { id: 'grade-1', estudiante_id: 'student-0', evaluacion_id: id, estado: 'confirmada', nota_confirmada: 0, updated_at: '2026-01-01' },
    { id: 'grade-2', estudiante_id: 'student-1', evaluacion_id: id, estado: 'procesando', nota_sugerida: 0, resultado_json: { pipeline_status: 'running' }, updated_at: '2026-01-01' },
    { id: 'grade-3', estudiante_id: 'student-2', evaluacion_id: id, estado: 'sugerida', nota_sugerida: 2.5, updated_at: '2026-01-01' },
  ] : [{ id: 'grade-other', estudiante_id: 'student-0', evaluacion_id: id, estado: 'confirmada', nota_confirmada: 4.2, updated_at: '2026-01-01' }]);
  useAuth.setState({ user: { id: 'teacher', nombre: 'Docente', email: 'teacher@example.test', rol: 'profesor', estado: 'activo', permissions: ['grading.read', 'grading.grade'] }, status: 'authenticated' });
});

describe('libro docente contextual', () => {
  it('reads grades without academic reconciliation and isolates the cache by reader', async () => {
    const { client } = renderPage();
    await screen.findByLabelText('Filtrar por evaluación');
    await waitFor(() => expect(mocks.grades).toHaveBeenCalledTimes(2));
    expect(mocks.grades).toHaveBeenCalledWith('eval-1', { readOnly: true });
    expect(mocks.grades).toHaveBeenCalledWith('eval-2', { readOnly: true });
    expect(client.getQueryData(['calificaciones', 'eval-1'])).toBeUndefined();
    expect(client.getQueryData(['calificaciones', 'eval-1', 'solo-lectura', 'materia-1', 'teacher'])).toBeDefined();
  });

  it('does not query grades or infer missing results without reading permission', async () => {
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['subjects.update'] } });
    renderPage();
    expect(await screen.findByText('No tienes permiso para consultar las notas.')).toBeVisible();
    expect(mocks.grades).not.toHaveBeenCalled();
    expect(screen.queryByText('Sin calificación')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar notas' })).not.toBeInTheDocument();
  });
  it('shows student results with explanation links, no export, and no teacher queries', async () => {
    mocks.context.canManageMateria = false;
    useAuth.setState({ user: { id: 'student', nombre: 'Alumno', email: 'student@example.test', rol: 'estudiante', estado: 'activo' }, status: 'authenticated' });
    mocks.boletin.mockResolvedValue([
      { evaluacion_id: 'eval-1', evaluacion_nombre: 'Primera evaluación', nota_confirmada: 0, nota_maxima: 5, feedback: 'Revisa el procedimiento.', estado: 'confirmada' },
      { evaluacion_id: 'eval-2', evaluacion_nombre: 'Segunda evaluación', nota_confirmada: null, nota_maxima: 5, estado: 'procesando' },
    ]);
    renderPage();
    expect(await screen.findByRole('link', { name: 'Ver explicación de mi nota' })).toHaveAttribute('href', '/app/evaluaciones/eval-1/resolver#mi-resultado');
    expect(screen.getByText('0.0')).toBeInTheDocument();
    expect(screen.getByText('Calificando')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Exportar notas' })).not.toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.grades).not.toHaveBeenCalled();
  });

  it('shows every student and only the selected evaluation, preserving states and combined filters', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await screen.findByLabelText('Filtrar por evaluación'), 'eval-1');
    const list = await screen.findByRole('list', { name: 'Estudiantes del boletín' });
    expect(screen.getByRole('button', { name: 'Exportar notas' })).toBeVisible();
    expect(within(list).getAllByRole('listitem')).toHaveLength(30);
    expect(screen.queryByRole('option', { name: 'Borrador oculto' })).not.toBeInTheDocument();
    expect(within(list).getByText('0.0 / 5.0')).toBeInTheDocument();
    expect(within(list).queryByText('4.2 / 5.0')).not.toBeInTheDocument();
    expect(within(list).getByText('Calificando')).toBeInTheDocument();
    expect(within(list).getByText('Sugerencia IA · pendiente de revisión')).toBeInTheDocument();
    const tile = within(list).getByRole('button', { name: 'Ver boletín de Alumno 0' });
    await user.click(tile);
    const preview = screen.getByRole('dialog', { name: 'Boletín de Alumno 0' });
    await waitFor(() => expect(within(preview).getByText('Primera evaluación')).toBeVisible());
    await waitFor(() => expect(within(preview).getByText('Segunda evaluación')).toBeVisible());
    expect(within(preview).getByRole('link', { name: 'Ver explicación de Primera evaluación' })).toHaveAttribute('href', expect.stringContaining('evaluacion=eval-1'));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(tile).toHaveFocus());
    await user.type(screen.getByLabelText('Buscar estudiante'), 'Alumno 0');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Por decidir/ }));
    expect(screen.getByText('No encontramos estudiantes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar todo el grupo' }));
    expect(within(await screen.findByRole('list', { name: 'Estudiantes del boletín' })).getAllByRole('listitem')).toHaveLength(30);
    await user.selectOptions(screen.getByLabelText('Filtrar por evaluación'), '');
    expect(screen.queryByRole('list', { name: 'Notas de Primera evaluación' })).not.toBeInTheDocument();
    expect(screen.queryByText('Promedio comparable')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Estudiantes del boletín' })).getAllByRole('button')).toHaveLength(30);
  });

  it('recovers a removed evaluation without mixing grade queries', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();
    await user.selectOptions(await screen.findByLabelText('Filtrar por evaluación'), 'eval-1');
    await screen.findByRole('list', { name: 'Estudiantes del boletín' });
    act(() => { client.setQueryData(['evaluaciones', 'materia-1'], [evaluations[1]]); });
    await waitFor(() => expect(screen.getByLabelText('Filtrar por evaluación')).toHaveValue(''));
    expect(screen.getByRole('status')).toHaveTextContent('ya no está disponible');
  });

  it('preserves cents, scales and published states without displaying absent grades as zero', async () => {
    mocks.grades.mockImplementation(async (id: string) => id === 'eval-1' ? [{ id: 'g1', estudiante_id: 'student-0', estado: 'publicada', nota_confirmada: 4.67, updated_at: '2026-01-01' }] : []);
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 0' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('4.67 / 5.0')).toBeVisible());
    await waitFor(() => expect(within(dialog).getByText('Publicada')).toBeVisible());
    await waitFor(() => expect(within(dialog).getByText('Sin calificación')).toBeVisible());
    expect(within(dialog).queryByText('0.0 / 5.0')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Borrador oculto')).not.toBeInTheDocument();
  });

  it('shows processing and explicitly provisional suggestions in the preview', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 1' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Calificando')).toBeVisible());
    expect(within(screen.getByRole('dialog')).queryByText('0.0 / 5.0')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar boletín' }));
    await user.click(screen.getByRole('button', { name: 'Ver boletín de Alumno 2' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Sugerencia IA · pendiente de revisión')).toBeVisible());
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('2.5 / 5.0')).toBeVisible());
  });

  it('keeps students available without evaluations and distinguishes an empty roster', async () => {
    mocks.list.mockResolvedValue([]);
    const user = userEvent.setup();
    const { rerenderPage } = renderPage();
    expect((await screen.findAllByRole('button', { name: /^Ver boletín de/ })).length).toBe(30);
    await user.click(screen.getByRole('button', { name: 'Ver boletín de Alumno 0' }));
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Todavía no hay notas')).toBeVisible());
    await user.keyboard('{Escape}');
    mocks.context.materia = { ...mocks.context.materia, estudiantes: [] };
    rerenderPage();
    expect(screen.getByText('No hay estudiantes')).toBeVisible();
  });

  it('keeps full names and distinguishes namesakes by existing email', async () => {
    const name = 'María Alejandra Rodríguez Fernández';
    mocks.context.materia.estudiantes[0].nombre = name;
    mocks.context.materia.estudiantes[1].nombre = name;
    const user = userEvent.setup();
    renderPage();
    const tiles = await screen.findAllByRole('button', { name: `Ver boletín de ${name}` });
    expect(tiles).toHaveLength(2);
    expect(within(tiles[0]).getByText('0@example.test')).toBeVisible();
    expect(within(tiles[1]).getByText('1@example.test')).toBeVisible();
    await user.click(tiles[1]);
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByText('Calificando')).toBeVisible());
  });

  it('opens cached grades without refetching and keeps search and evaluation on close', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(await screen.findByLabelText('Buscar estudiante'), 'Alumno 0');
    await user.selectOptions(screen.getByLabelText('Filtrar por evaluación'), 'eval-1');
    const count = mocks.grades.mock.calls.length;
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 0' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar boletín' }));
    expect(screen.getByLabelText('Buscar estudiante')).toHaveValue('Alumno 0');
    expect(screen.getByLabelText('Filtrar por evaluación')).toHaveValue('eval-1');
    expect(mocks.grades).toHaveBeenCalledTimes(count);
    await user.click(screen.getByRole('button', { name: 'Exportar notas' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Exportar notas' })).toBeVisible());
    expect(screen.queryByRole('dialog', { name: 'Boletín de Alumno 0' })).not.toBeInTheDocument();
  });

  it('does not replace the mosaic or claim completeness while another evaluation loads or fails', async () => {
    let rejectRead: (error: Error) => void = () => undefined;
    mocks.grades.mockImplementation((id: string) => id === 'eval-1' ? Promise.resolve([]) : new Promise((_, reject) => { rejectRead = reject; }));
    const user = userEvent.setup();
    renderPage('/?evaluacion=eval-1');
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 0' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(within(dialog).getByText('Cargando notas…')).toBeVisible());
    expect(screen.getByRole('list', { name: 'Estudiantes del boletín' })).toBeInTheDocument();
    expect(within(dialog).queryByText('Sin calificación')).not.toBeInTheDocument();
    act(() => rejectRead(new Error('offline')));
    expect(await within(dialog).findByText('No pudimos cargar todas las notas.')).toBeVisible();
    mocks.grades.mockResolvedValue([]);
    await user.click(within(dialog).getByRole('button', { name: 'Reintentar notas' }));
    expect(await within(dialog).findByText('Segunda evaluación')).toBeVisible();
  });

  it('updates the selected student from live query data rather than a row snapshot', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 0' }));
    act(() => client.setQueryData(['calificaciones', 'eval-1', 'solo-lectura', 'materia-1', 'teacher'], [{ id: 'g1', estudiante_id: 'student-0', nota_confirmada: 4.67, estado: 'publicada', updated_at: '2026-01-02' }]));
    expect(await within(screen.getByRole('dialog')).findByText('4.67 / 5.0')).toBeVisible();
  });

  it.each(['materia', 'usuario', 'permiso', 'matricula'])('discards a private preview after changing %s', async (kind) => {
    const user = userEvent.setup();
    const { rerenderPage } = renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ver boletín de Alumno 0' }));
    if (kind === 'materia') mocks.context.materia = { ...mocks.context.materia, id: 'other' };
    if (kind === 'matricula') mocks.context.materia = { ...mocks.context.materia, estudiantes: mocks.context.materia.estudiantes.slice(1) };
    act(() => {
      if (kind === 'usuario') useAuth.setState({ user: { ...useAuth.getState().user!, id: 'another' } });
      if (kind === 'permiso') useAuth.setState({ user: { ...useAuth.getState().user!, permissions: [] } });
    });
    rerenderPage();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
