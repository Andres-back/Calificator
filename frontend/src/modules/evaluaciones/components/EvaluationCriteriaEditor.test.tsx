import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Evaluacion } from '@/types/api';
import { useAuth } from '@/stores/auth';
import { EvaluationCriteriaEditor } from './EvaluationCriteriaEditor';

const mocks = vi.hoisted(() => ({ update: vi.fn(), list: vi.fn(), create: vi.fn(), get: vi.fn() }));
vi.mock('../api', () => ({ updateEvaluacion: mocks.update, getEvaluacion: mocks.get }));
vi.mock('@/modules/materias/dbaApi', () => ({ listDbaCombinado: mocks.list, createDbaPersonalizado: mocks.create }));
const evaluation = {
  id: 'evaluation', materia_id: 'subject', profesor_id: 'teacher', nombre: 'Digitalizada',
  nota_maxima: 5, updated_at: '2026-10-05T12:00:00', estado: 'publicada',
  criterios: [], dba_ids: [], dba_personalizado_ids: [],
  preguntas: [{ numero: 17, tipo: 'especial', metadata: { keep: true } }],
  respuestas_esperadas: [{ numero: 17, respuesta: { complex: true } }],
} as unknown as Evaluacion;
function setup(source = evaluation) {
  const done = vi.fn(), close = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <EvaluationCriteriaEditor evaluation={source} onCompleted={done} onClose={close} />
  </QueryClientProvider>);
  return { done, close, user: userEvent.setup() };
}
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', rol: 'profesor', permissions: ['evaluations.update', 'dba.manage'] } as never });
  mocks.list.mockResolvedValue([{ id: 'official', fuente: 'oficial', descripcion: 'Comprende la lectura', area: 'Lenguaje', grado: '3' }]);
  mocks.update.mockImplementation((_id, payload) => Promise.resolve({ ...evaluation, ...payload }));
  mocks.create.mockResolvedValue({ id: 'own', enunciado: 'Identifica protagonistas', area: 'Lenguaje', grado: '3' });
});
it('creates a rubric after digitalization and sends only criteria with a version, never questions', async () => {
  const { user, done } = setup();
  await user.click(await screen.findByRole('button', { name: /Comprende la lectura/ }));
  await user.click(screen.getByRole('button', { name: 'Agregar criterio' }));
  await user.clear(screen.getByLabelText('Nombre del criterio 1'));
  await user.type(screen.getByLabelText('Nombre del criterio 1'), 'Comprensión');
  await user.click(screen.getByRole('button', { name: 'Distribuir pesos' }));
  await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  const payload = mocks.update.mock.calls[0][1];
  expect(Object.keys(payload).sort()).toEqual(['criterios', 'dba_ids', 'expected_updated_at']);
  expect(payload.expected_updated_at).toBe(evaluation.updated_at);
  expect(payload.criterios[0]).toMatchObject({ nombre: 'Comprensión', peso_porcentaje: 100, puntaje_maximo: 5 });
  expect(payload.dba_ids).toEqual(['official']);
});
it('keeps the draft and does not close on a version conflict', async () => {
  mocks.update.mockRejectedValue(new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, { status: 409, data: { detail: 'La evaluación cambió' } } as never));
  const { user, done, close } = setup();
  await user.click(await screen.findByRole('button', { name: /Comprende la lectura/ }));
  await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));
  expect(await screen.findByText('La evaluación cambió')).toHaveAttribute('role', 'alert');
  expect(screen.getByRole('button', { name: /Comprende la lectura/ })).toHaveAttribute('aria-pressed', 'true');
  expect(done).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
it('creates and selects a subject criterion without resetting the rubric draft', async () => {
  const { user } = setup();
  await user.click(screen.getByRole('button', { name: 'Agregar criterio' }));
  await user.click(screen.getByText('Crear criterio de aprendizaje'));
  await user.type(screen.getByLabelText('Qué aprenderá el estudiante'), 'Identifica protagonistas');
  await user.click(screen.getByRole('button', { name: 'Crear y seleccionar' }));
  await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('subject', { enunciado: 'Identifica protagonistas' }));
  expect(screen.getByLabelText('Nombre del criterio 1')).toHaveValue('Criterio 1');
  expect(await screen.findByRole('button', { name: /Identifica protagonistas/ })).toHaveAttribute('aria-pressed', 'true');
});
it('leaves an untouched historical rubric out of a reference-only patch', async () => {
  const original = { ...evaluation, criterios: [{ nombre: 'Legado', puntaje_maximo: 5, metadata: { keep: true } }] } as unknown as Evaluacion;
  const { user, done } = setup(original);
  await user.click(await screen.findByRole('button', { name: /Comprende la lectura/ }));
  await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));
  await waitFor(() => expect(done).toHaveBeenCalledOnce());
  expect(mocks.update.mock.calls[0][1]).toEqual({ dba_ids: ['official'], expected_updated_at: evaluation.updated_at });
});
it('reloads a conflicting version only after explicit consent', async () => {
  mocks.update.mockRejectedValueOnce(new AxiosError('Conflict', undefined, undefined, undefined, { status: 409, data: { detail: 'La evaluación cambió' } } as never));
  mocks.get.mockResolvedValue({ ...evaluation, updated_at: '2026-10-05T15:00:00' });
  const { user } = setup();
  await user.click(await screen.findByRole('button', { name: /Comprende la lectura/ }));
  await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));
  await user.click(await screen.findByRole('button', { name: 'Cargar versión actual' }));
  expect(mocks.get).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Recargar y descartar' }));
  await waitFor(() => expect(mocks.get).toHaveBeenCalledOnce());
  await waitFor(() => expect(screen.getByRole('button', { name: /Comprende la lectura/ })).toHaveAttribute('aria-pressed', 'false'));
  await user.click(screen.getByRole('button', { name: /Comprende la lectura/ }));
  await user.click(screen.getByRole('button', { name: 'Guardar criterios' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
  expect(mocks.update.mock.calls[1][1].expected_updated_at).toBe('2026-10-05T15:00:00');
});
