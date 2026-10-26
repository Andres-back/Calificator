import { beforeEach, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import type { Evaluacion } from '@/types/api';
import { useAuth } from '@/stores/auth';
import { EvaluationCopyDialog } from './EvaluationCopyDialog';

const mocks = vi.hoisted(() => ({ subjects: vi.fn(), latest: vi.fn(), read: vi.fn(), copy: vi.fn() }));
vi.mock('@/modules/materias/api', () => ({ listMaterias: mocks.subjects }));
vi.mock('./api', () => ({ getEvaluationCopy: mocks.read, getLatestEvaluationCopy: mocks.latest, requestEvaluationCopy: mocks.copy }));
const evaluation = { id: 'e1', materia_id: 'm1', profesor_id: 'p1', nombre: 'Lectura', updated_at: '2026-10-25T00:00:00', contenido_version_id: 'v1' } as Evaluacion;
const request = { materia_destino_id: 'm2', request_key: 'saved-key', expected_updated_at: evaluation.updated_at, expected_content_version_id: 'v1', nombre: 'Lectura' };
const ready = { job_id: 'saved-key', materia_destino_id: 'm2', estado: 'success', progreso: 100, evaluacion_id: 'copy', error: null, solicitud: request };
function show() { return render(<MemoryRouter><EvaluationCopyDialog evaluation={evaluation} onClose={vi.fn()} /></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  useAuth.setState({ user: { id: 'p1', rol: 'profesor', permissions: ['evaluations.read', 'evaluations.create'] } as never });
  mocks.subjects.mockResolvedValue([{ id: 'm1', profesor_id: 'p1', nombre: 'Origen', estado: 'activa' }, { id: 'm2', profesor_id: 'p1', nombre: 'Destino', estado: 'activa' }, { id: 'archived', profesor_id: 'p1', nombre: 'Archivada', estado: 'archivada' }, { id: 'other', profesor_id: 'p2', nombre: 'Otro docente', estado: 'activa' }]);
  mocks.latest.mockResolvedValue(null); mocks.copy.mockResolvedValue({ ...ready, estado: 'queued', evaluacion_id: null }); mocks.read.mockResolvedValue(ready);
});
it('offers only another active subject of the same teacher and submits one stable request', async () => {
  show(); const user = userEvent.setup();
  await screen.findByRole('option', { name: 'Destino' });
  expect(screen.queryByRole('option', { name: 'Archivada' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Otro docente' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Origen' })).not.toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Materia destino'), 'm2');
  await user.dblClick(screen.getByRole('button', { name: 'Crear copia como borrador' }));
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledOnce());
  const payload = mocks.copy.mock.calls[0][1];
  expect(payload).toEqual({ ...request, request_key: expect.any(String) });
  expect(JSON.parse(sessionStorage.getItem('xc-copy:p1:e1')!)).toEqual(payload);
});
it('recovers a finished copy from the server without browser storage or posting again', async () => {
  mocks.latest.mockResolvedValue(ready); show();
  expect(await screen.findByText(/Copia lista como borrador/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ver materia destino' })).toHaveAttribute('href', '/app/materias/m2/evaluaciones');
  expect(mocks.copy).not.toHaveBeenCalled();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Crear otra copia' }));
  expect(screen.getByLabelText('Materia destino')).toBeInTheDocument();
});
it('retries an uncertain submission using exactly the saved version and request key', async () => {
  sessionStorage.setItem('xc-copy:p1:e1', JSON.stringify(request));
  mocks.read.mockRejectedValue(Object.assign(new AxiosError('Not found'), { response: { status: 404, data: { detail: 'No encontrado' } } }));
  show(); await screen.findByText(/no tiene confirmación/);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar la misma copia' }));
  await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('e1', request));
});
it('permission withdrawal discards late results and never starts another request', async () => {
  let finish!: (value: unknown) => void;
  mocks.copy.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  show(); await screen.findByRole('option', { name: 'Destino' });
  await userEvent.setup().selectOptions(screen.getByLabelText('Materia destino'), 'm2');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Crear copia como borrador' }));
  act(() => useAuth.setState({ user: { id: 'p1', permissions: [] } as never }));
  await act(async () => finish(ready));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(mocks.copy).toHaveBeenCalledOnce();
});
