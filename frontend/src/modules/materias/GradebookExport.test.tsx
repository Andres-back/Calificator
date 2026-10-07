import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradebookExport } from './GradebookExport';
import { useAuth } from '@/stores/auth';
const mocks = vi.hoisted(() => ({ students: vi.fn(), list: vi.fn(), grades: vi.fn(), download: vi.fn() }));
vi.mock('./api', () => ({ getMateriaEstudiantes: mocks.students }));
vi.mock('@/modules/evaluaciones/api', () => ({ listEvaluaciones: mocks.list }));
vi.mock('@/modules/calificaciones/api', () => ({ listCalificaciones: mocks.grades }));
vi.mock('@/lib/csvExport', () => ({ downloadCsv: mocks.download }));
const evaluations = [{ id: 'e1', materia_id: 'm', nombre: 'Uno', nota_maxima: 5, estado: 'publicada' }, { id: 'e2', materia_id: 'm', nombre: 'Dos', nota_maxima: 10, estado: 'cerrada' }];
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', permissions: ['grading.read'] } as never, status: 'authenticated' });
  mocks.students.mockResolvedValue({ id: 'm', estudiantes: ['a', 'b', 'c', 'd'].map(id => ({ id, nombre: id, email: id + '@example.test' })) });
  mocks.list.mockResolvedValue(evaluations);
  mocks.grades.mockResolvedValue([
    { id: '1', estudiante_id: 'a', estado: 'confirmada', nota_confirmada: 0, updated_at: '2026-10-07' },
    { id: '2', estudiante_id: 'b', estado: 'sugerida', nota_sugerida: 5, updated_at: '2026-10-07' },
    { id: '3', estudiante_id: 'c', estado: 'procesando', resultado_json: { pipeline_status: 'running' }, updated_at: '2026-10-07' },
  ]);
});
function show() { return render(<GradebookExport materiaId="m" materiaName="Clase" evaluations={evaluations as never} initialEvaluationId="e1" studentCount={4} onClose={vi.fn()} />); }
it('exports only student name and evaluation grade, preserving real zero and empty pending grades', async () => {
  show();
  expect(screen.getByRole('checkbox', { name: 'Uno' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Dos' })).not.toBeChecked();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
  const rows = mocks.download.mock.calls[0][1] as string[][];
  expect(rows).toHaveLength(5);
  expect(rows[0]).toEqual(['Nombre del estudiante', 'Uno']);
  expect(rows.find(row => row[0] === 'a')).toEqual(['a', '0']);
  expect(rows.find(row => row[0] === 'b')).toEqual(['b', '']);
  expect(rows.find(row => row[0] === 'c')).toEqual(['c', '']);
  expect(rows.find(row => row[0] === 'd')).toEqual(['d', '']);
  expect(rows.every(row => row.length === 2)).toBe(true);
  expect(mocks.grades).toHaveBeenCalledWith('e1', { readOnly: true });
});
it('selects all but never downloads on partial failure', async () => {
  mocks.grades.mockRejectedValue(new Error('red')); show();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Todas' }));
  await user.click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se descargó');
  expect(mocks.download).not.toHaveBeenCalled();
});
it('supports several evaluations and disables an empty selection', async () => {
  show();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Ninguna' }));
  expect(screen.getByRole('button', { name: 'Descargar notas CSV' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Todas' }));
  await user.click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
  expect(mocks.grades).toHaveBeenCalledTimes(2);
  expect(mocks.download.mock.calls[0][1][0]).toEqual(['Nombre del estudiante', 'Uno', 'Dos']);
  expect(mocks.download.mock.calls[0][1]).toHaveLength(5);
});
it('keeps each evaluation grade in its column and distinguishes repeated headings and students', async () => {
  const repeated = [evaluations[0], { ...evaluations[1], nombre: 'Uno' }, { ...evaluations[1], id: 'e3', nombre: 'Uno (1)' }];
  mocks.list.mockResolvedValue(repeated);
  mocks.students.mockResolvedValue({ id: 'm', estudiantes: [{ id: 'a', nombre: 'Ana', email: 'a@example.test' }, { id: 'b', nombre: 'Ana', email: 'b@example.test' }] });
  mocks.grades.mockImplementation((id: string) => Promise.resolve([
    { id: id + '-a', estudiante_id: 'a', estado: 'confirmada', nota_confirmada: id === 'e1' ? 0 : id === 'e2' ? 7.5 : 4.3, updated_at: '2026-10-07' },
    { id: id + '-b', estudiante_id: 'b', estado: 'confirmada', nota_confirmada: id === 'e1' ? 3.7 : id === 'e2' ? 8 : 9.1, updated_at: '2026-10-07' },
  ]));
  render(<GradebookExport materiaId="m" materiaName="Clase" evaluations={repeated as never} initialEvaluationId="" studentCount={2} onClose={vi.fn()} />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
  const rows = mocks.download.mock.calls[0][1] as string[][];
  expect(rows[0]).toEqual(['Nombre del estudiante', 'Uno (2)', 'Uno (3)', 'Uno (1)']);
  expect(rows).toContainEqual(['Ana', '0', '7,5', '4,3']);
  expect(rows).toContainEqual(['Ana', '3,7', '8', '9,1']);
  expect(rows).toHaveLength(3);
});
it('rejects removed evaluation selections', async () => {
  mocks.list.mockResolvedValue([]); show();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ya no está disponible');
  expect(mocks.download).not.toHaveBeenCalled();
});
it('discards results after logout while reading', async () => {
  let finish!: (value: unknown[]) => void;
  mocks.grades.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  await waitFor(() => expect(mocks.grades).toHaveBeenCalled());
  useAuth.setState({ user: null, status: 'unauthenticated' });
  finish([]);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(mocks.download).not.toHaveBeenCalled();
});
it('hides export without grading permission', () => {
  useAuth.setState({ user: { id: 'teacher', permissions: [] } as never }); show();
  expect(screen.queryByRole('button', { name: 'Descargar notas CSV' })).not.toBeInTheDocument();
});
