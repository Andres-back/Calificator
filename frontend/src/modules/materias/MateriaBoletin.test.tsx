import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
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

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={client}><MemoryRouter><MateriaBoletin /></MemoryRouter></QueryClientProvider>);
  return { ...result, client };
}

beforeEach(() => {
  vi.clearAllMocks();
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
  it('shows every student and only the selected evaluation, preserving states and combined filters', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await screen.findByLabelText('Filtrar por evaluación'), 'eval-1');
    const list = await screen.findByRole('list', { name: 'Notas de Primera evaluación' });
    expect(screen.getByRole('button', { name: 'Exportar notas' })).toBeVisible();
    expect(within(list).getAllByRole('listitem')).toHaveLength(30);
    expect(screen.queryByRole('option', { name: 'Borrador oculto' })).not.toBeInTheDocument();
    expect(within(list).getByText('0.0 / 5.0')).toBeInTheDocument();
    expect(within(list).queryByText('4.2 / 5.0')).not.toBeInTheDocument();
    expect(within(list).getByText('Calificando')).toBeInTheDocument();
    expect(within(list).getByText('Sugerencia · no definitiva')).toBeInTheDocument();
    expect(within(list).getByRole('link', { name: 'Ver nota de Alumno 0' })).toHaveAttribute('href', expect.stringContaining('evaluacion=eval-1'));
    await user.type(screen.getByLabelText('Buscar estudiante'), 'Alumno 0');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Por decidir/ }));
    expect(screen.getByText('No encontramos estudiantes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar todo el grupo' }));
    expect(within(await screen.findByRole('list', { name: 'Notas de Primera evaluación' })).getAllByRole('listitem')).toHaveLength(30);
    await user.selectOptions(screen.getByLabelText('Filtrar por evaluación'), '');
    expect(screen.queryByRole('list', { name: 'Notas de Primera evaluación' })).not.toBeInTheDocument();
    expect(screen.getAllByText('Promedio comparable')).toHaveLength(30);
  });

  it('recovers a removed evaluation without mixing grade queries', async () => {
    const user = userEvent.setup();
    const { client } = renderPage();
    await user.selectOptions(await screen.findByLabelText('Filtrar por evaluación'), 'eval-1');
    await screen.findByRole('list', { name: 'Notas de Primera evaluación' });
    client.setQueryData(['evaluaciones', 'materia-1'], [evaluations[1]]);
    await waitFor(() => expect(screen.getByLabelText('Filtrar por evaluación')).toHaveValue(''));
    expect(screen.getByRole('status')).toHaveTextContent('ya no está disponible');
  });
});
