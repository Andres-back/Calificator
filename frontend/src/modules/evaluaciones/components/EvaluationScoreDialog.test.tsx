import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import { useAuth } from '@/stores/auth';
import type { Evaluacion } from '@/types/api';
import { EvaluationScoreDialog } from './EvaluationScoreDialog';

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn(), preview: vi.fn(), apply: vi.fn(), receipt: vi.fn() }));
vi.mock('../scoreApi', () => ({ readScoreDefinition: mocks.read, saveScoreDefinition: mocks.save, previewScoreNotes: mocks.preview, applyScoreNotes: mocks.apply, readScoreReceipt: mocks.receipt }));
const permissions = ['evaluations.read', 'evaluations.update', 'grading.read', 'grading.grade'];
const evaluation = { id: 'e1', profesor_id: 'p1', materia_id: 'm1', nombre: 'Sintética' } as Evaluacion;
const definition = { plan: { schema_version: 1, modo: 'total', grupos: [{ id: 'total', titulo: 'Todas', claves: ['p1', 'p2'], presupuesto: '5', fijados: {} }] }, nota_maxima: '5', updated_at: '2026-10-30T00:00:00', contenido_version_id: null, definition_fingerprint: 'a'.repeat(64), preguntas: [1, 2].map(i => ({ clave: `p${i}`, numero: String(i), titulo: `Pregunta ${i}`, tipo: 'abierta', puntaje: '2.5' })) };
const row = { calificacion_id: 'g1', nombre: 'Estudiante sintético', elegible: true, nota_actual: '3.00', nota_propuesta: '3.50', fingerprint: 'b'.repeat(64), motivo: null };
const receipt = { request_id: 'request', definition_fingerprint: definition.definition_fingerprint, resultados: [{ calificacion_id: 'g1', estado: 'applied', nota_anterior: '3.00', nota_nueva: '3.50' }] };
beforeEach(() => {
  vi.clearAllMocks(); sessionStorage.clear();
  useAuth.setState({ user: { id: 'p1', rol: 'profesor', permissions } as never });
  mocks.read.mockResolvedValue(structuredClone(definition)); mocks.save.mockResolvedValue(structuredClone(definition));
  mocks.preview.mockResolvedValue({ definition_fingerprint: definition.definition_fingerprint, resultados: [row, { ...row, calificacion_id: 'manual', nombre: 'Ajuste manual', elegible: false, motivo: 'Tiene ajuste manual' }], siguiente_cursor: null, aviso: 'Los ajustes manuales y pendientes se conservan. Los enlaces anteriores se pausan.' });
  mocks.apply.mockResolvedValue(receipt); mocks.receipt.mockRejectedValue({ response: { status: 404, data: { detail: 'Todavía no hay resultado' } } });
});
function show() { return render(<EvaluationScoreDialog evaluation={evaluation} onClose={vi.fn()} onSaved={vi.fn()} />); }
it('137 guardar reparto no aplica notas y requiere confirmación separada con exclusiones', async () => {
  show(); const user = userEvent.setup(); await screen.findByLabelText('Forma de repartir');
  await user.click(screen.getByRole('button', { name: 'Guardar reparto' }));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(mocks.apply).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Actualizar notas anteriores' }));
  expect(await screen.findByText('Tiene ajuste manual')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Seleccionar Ajuste manual' })).toBeDisabled();
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Estudiante sintético' }));
  await user.click(screen.getByRole('button', { name: 'Revisar 1 cambios' })); expect(mocks.apply).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Confirmar actualización de 1 notas' }));
  await screen.findByText('1 actualizadas'); expect(mocks.apply).toHaveBeenCalledOnce();
  expect(mocks.apply.mock.calls[0][1]).toMatchObject({ confirmar: true, selecciones: [{ calificacion_id: 'g1', fingerprint: row.fingerprint }] });
});
it('137 recupera una respuesta perdida y reintenta exactamente la misma solicitud', async () => {
  const saved = { request_id: 'saved', definition_fingerprint: definition.definition_fingerprint, confirmar: true, selecciones: [{ calificacion_id: 'g1', fingerprint: row.fingerprint }] };
  sessionStorage.setItem('xc-score-operation:p1:e1', JSON.stringify(saved)); show();
  await screen.findByRole('button', { name: 'Consultar resultado' });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Reintentar la misma confirmación' }));
  await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith('e1', saved, expect.any(AbortSignal)));
});
it('137 revocar permisos descarta respuestas tardías y no muestra datos de otra sesión', async () => {
  let finish!: (value: unknown) => void; mocks.read.mockImplementation(() => new Promise(resolve => { finish = resolve; })); show();
  act(() => useAuth.setState({ user: { id: 'otro', rol: 'profesor', permissions } as never }));
  await act(async () => finish(definition));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(mocks.save).not.toHaveBeenCalled();
});
it('137 permite una vista previa solo de lectura sin permiso de calificar', async () => {
  useAuth.setState({ user: { id: 'p1', rol: 'profesor', permissions: permissions.filter(p => p !== 'grading.grade') } as never });
  show(); await screen.findByLabelText('Forma de repartir');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Actualizar notas anteriores' }));
  expect(await screen.findByText('Estudiante sintético')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Seleccionar Estudiante sintético' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: /Revisar .* cambios/ })).not.toBeInTheDocument();
});
it('137 conservar borrador tras conflicto no inicia actualización de notas', async () => {
  mocks.save.mockRejectedValue(Object.assign(new AxiosError('Conflict'), { response: { status: 409, data: { detail: 'La evaluación cambió. Conservamos tu reparto.' } } }));
  show(); await screen.findByLabelText('Forma de repartir'); const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: 'Fijar posición 1' }));
  await user.clear(screen.getByLabelText('Valor fijado posición 1')); await user.type(screen.getByLabelText('Valor fijado posición 1'), '3');
  await user.click(screen.getByRole('button', { name: 'Guardar reparto' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La evaluación cambió');
  expect(screen.getByLabelText('Valor fijado posición 1')).toHaveValue('3');
  expect(mocks.apply).not.toHaveBeenCalled();
});
it('137 revocar la lectura de notas oculta los resultados del mismo usuario', async () => {
  show(); await screen.findByLabelText('Forma de repartir');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Actualizar notas anteriores' }));
  await screen.findByText('Estudiante sintético');
  act(() => useAuth.setState({ user: { id: 'p1', rol: 'profesor', permissions: permissions.filter(p => p !== 'grading.read') } as never }));
  expect(screen.queryByText('Estudiante sintético')).not.toBeInTheDocument();
  expect(mocks.apply).not.toHaveBeenCalled();
});
it('137 recuperar una respuesta perdida consulta el recibo sin enviar otra confirmación', async () => {
  mocks.apply.mockRejectedValue(new AxiosError('Respuesta no recibida'));
  mocks.receipt.mockResolvedValue(receipt);
  show(); const user = userEvent.setup(); await screen.findByLabelText('Forma de repartir');
  await user.click(screen.getByRole('button', { name: 'Actualizar notas anteriores' }));
  await screen.findByText('Estudiante sintético');
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Estudiante sintético' }));
  await user.click(screen.getByRole('button', { name: 'Revisar 1 cambios' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar actualización de 1 notas' }));
  await user.click(await screen.findByRole('button', { name: 'Consultar resultado' }));
  await screen.findByText('1 actualizadas');
  expect(mocks.apply).toHaveBeenCalledOnce(); expect(mocks.receipt).toHaveBeenCalledOnce();
});
it.each([{ id: 'p1', rol: 'estudiante' }, { id: 'otro', rol: 'profesor' }])('137 deniega la interfaz a $rol ajeno aunque tenga permisos copiados', actor => {
  useAuth.setState({ user: { ...actor, permissions } as never }); show();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(mocks.read).not.toHaveBeenCalled();
});
