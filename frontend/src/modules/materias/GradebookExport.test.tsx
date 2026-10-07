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
it('exports every student, real zero and pending states using read-only queries', async () => {
  show();
  expect(screen.getByRole('checkbox', { name: 'Uno' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Dos' })).not.toBeChecked();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar notas CSV' }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
  const rows = mocks.download.mock.calls[0][1] as string[][];
  expect(rows).toHaveLength(5);
  expect(rows.find(row => row[0] === 'a')).toEqual(['a', 'a@example.test', '0', '5', 'Decisión guardada']);
  expect(rows.find(row => row[0] === 'b')).toEqual(['b', 'b@example.test', '', '5', 'Por revisar']);
  expect(rows.find(row => row[0] === 'c')).toEqual(['c', 'c@example.test', '', '5', 'Calificando']);
  expect(rows.find(row => row[0] === 'd')).toEqual(['d', 'd@example.test', '', '5', 'Sin calificación']);
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
  expect(mocks.download.mock.calls[0][1][0]).toHaveLength(8);
  expect(mocks.download.mock.calls[0][1]).toHaveLength(5);
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
