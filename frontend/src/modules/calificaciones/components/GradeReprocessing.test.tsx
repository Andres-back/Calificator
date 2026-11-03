import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AxiosError } from 'axios';
import type { CalificacionDetalle } from '@/types/api';
import { GradeReprocessing } from './GradeReprocessing';

const mocks = vi.hoisted(() => ({ send: vi.fn(), history: vi.fn(), context: vi.fn(), detail: vi.fn(), edit: vi.fn(), realPicker: false, scan: false }));
vi.mock('@/components/evidence/useEvidenceScanCapability', () => ({
  useEvidenceScanCapability: () => ({ available: mocks.scan, scope: 'teacher:e1:s1' }),
}));
vi.mock('../api', () => ({ reprocessGrade: mocks.send, listGradingRevisions: mocks.history, getRegradingContext: mocks.context, getCalificacionDetalle: mocks.detail, getEvidenceEditContext: mocks.edit }));
vi.mock('@/components/evidence/MultiPageEvidencePicker', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/evidence/MultiPageEvidencePicker')>();
  return { MultiPageEvidencePicker: (props: React.ComponentProps<typeof actual.MultiPageEvidencePicker>) => mocks.realPicker
    ? <actual.MultiPageEvidencePicker {...props} />
    : <button onClick={() => props.onChange([{ id: crypto.randomUUID(), file: new File(['synthetic'], 'photo.jpg', { type: 'image/jpeg' }), rotation: 90,
      ...(mocks.scan ? { scan: { decision: 'original' as const } } : {}) }])}>Tomar foto sintética</button> };
});
vi.mock('@/components/evidence/imageQuality', () => ({ analyzeEvidenceImage: vi.fn().mockResolvedValue(null) }));
const cal = { id: 'c1', evaluacion_id: 'e1', materia_id: 'm1', estudiante_id: 's1', estudiante_nombre: 'Alumno sintético', evaluacion_nombre: 'Actividad sintética',
  estado: 'confirmada', nota_confirmada: 0, revisado_por_docente: true, entrega_archivo_url: '/api/evidencia', updated_at: '2026-10-22T00:00:00', resultado_json: {} } as unknown as CalificacionDetalle;
function setup(changes: Partial<CalificacionDetalle> = {}, expandOptions = true) {
  const accepted = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><GradeReprocessing cal={{ ...cal, ...changes }} onAccepted={accepted} /></QueryClientProvider>);
  if (expandOptions) fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
  return accepted;
}
async function openMode(name: 'Volver a calificar' | 'Cambiar evidencia') {
  fireEvent.click(screen.getByRole('button', { name }));
  await screen.findByTestId('regrading-context-ready');
}
const unchanged = { estado: 'sin_cambios', version_entrega_id: 'old', version_objetivo_id: 'old', fingerprint: null,
  requiere_confirmacion: false, cambios: [], mensaje: 'Se usarán los puntos guardados para esta entrega.' };
const changed = { estado: 'puntajes_actualizados', version_entrega_id: 'old', version_objetivo_id: 'new', fingerprint: 'a'.repeat(64),
  requiere_confirmacion: true, cambios: [{ numero: '8', puntaje_anterior: '0.56', puntaje_actual: '1.25' }, { numero: '9', puntaje_anterior: '0.52', puntaje_actual: '1.25' }],
  mensaje: 'El reparto de puntos cambió. Confirma los puntos actuales antes de enviar.' };
beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); mocks.realPicker = false; mocks.scan = false; mocks.context.mockResolvedValue(unchanged); mocks.detail.mockResolvedValue(cal); mocks.history.mockResolvedValue([]); mocks.send.mockResolvedValue({ ...cal, estado: 'procesando', nota_confirmada: null, resultado_json: { job_id: 'job1' } }); });

describe('141 editar hojas guardadas', () => {
  async function openEditor() {
    mocks.edit.mockResolvedValue({ version_esperada: cal.updated_at, fingerprint: 'a'.repeat(64), paginas: [
      { referencia: 'first', numero: 1, rotacion: 0 }, { referencia: 'second', numero: 2, rotacion: 90 },
    ], limites: { max_pages: 10, max_file_bytes: 1024, max_total_bytes: 4096 } });
    render(<QueryClientProvider client={new QueryClient()}><GradeReprocessing cal={cal} evidenceView onAccepted={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Editar hojas' }));
    await screen.findByText('Hoja 2');
    await screen.findByTestId('regrading-context-ready');
  }

  it('conserva las hojas por referencia y requiere confirmar antes de guardar el orden', async () => {
    await openEditor();
    const save = screen.getByRole('button', { name: 'Guardar y volver a calificar' });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Subir hoja 2' }));
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo guardar las hojas/ }));
    fireEvent.click(save);
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({
      confirmed: true, files: [], evidenceEdit: { fingerprint: 'a'.repeat(64), paginas: [{ referencia: 'second' }, { referencia: 'first' }] },
    })));
  });

  it('pide confirmar el descarte y no escribe al cancelar', async () => {
    await openEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar hoja 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar cambios' }));
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

describe('140 puntajes al volver a calificar', () => {
  it('compara máximos y exige aceptar puntos además de reabrir la nota', async () => {
    mocks.context.mockResolvedValue(changed);
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    await screen.findByText('El reparto de puntos cambió');
    expect(screen.getByText('Pregunta 8')).toBeVisible();
    expect(screen.getByText('Pregunta 9')).toBeVisible();
    expect(screen.getByText('0,52')).toBeVisible();
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ useCurrentScores: true, targetScoreVersion: 'new', scoreContextFingerprint: changed.fingerprint, confirmed: true }));
  });
  it('espera la consulta y deja reintentar sin enviar ni seleccionar automáticamente', async () => {
    mocks.context.mockRejectedValueOnce(new Error('Sin conexión'));
    setup({ estado: 'sugerida', revisado_por_docente: false, nota_confirmada: null });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    await screen.findByText('No pudimos comprobar los puntos de esta entrega.');
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.context.mockResolvedValue(changed);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar puntos de nuevo' }));
    await screen.findByText('El reparto de puntos cambió');
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
  });
  it('un conflicto conserva foto y motivo, retira aceptación y permite actualizar propuesta', async () => {
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new AxiosError('Conflict', '409', undefined, undefined,
      { status: 409, data: { detail: 'Los puntos cambiaron. Consulta de nuevo.' }, headers: {}, statusText: 'Conflict', config: {} as never }));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    await screen.findByText('El reparto de puntos cambió');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByText('Añadir motivo (opcional)'));
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'Corregir reparto' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    const first = mocks.send.mock.calls[0][1];
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    mocks.context.mockResolvedValue({ ...changed, version_objetivo_id: 'newer', fingerprint: 'b'.repeat(64) });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await waitFor(() => expect(mocks.context).toHaveBeenCalledTimes(2));
    await screen.findByTestId('regrading-context-ready');
    expect(screen.getByLabelText('Motivo (opcional)')).toHaveValue('Corregir reparto');
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    const next = mocks.send.mock.calls[1][1];
    expect(next.files).toEqual(first.files);
    expect(next.reason).toBe('Corregir reparto');
    expect(next.requestId).not.toBe(first.requestId);
    expect(next.targetScoreVersion).toBe('newer');
  });
  it('un cambio de contenido informa versión original y no permite aceptar puntos nuevos', async () => {
    mocks.context.mockResolvedValue({ ...unchanged, estado: 'contenido_modificado', mensaje: 'El contenido cambió. Se usará la versión original de esta entrega.' });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a calificar' }));
    await screen.findByText('El contenido cambió. Se usará la versión original de esta entrega.');
    expect(screen.queryByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send.mock.calls[0][1].useCurrentScores).toBeUndefined();
  });
  it('140 no habilita otro envío si falla la nota actual aunque los puntos puedan consultarse', async () => {
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new AxiosError('Conflict', '409', undefined, undefined,
      { status: 409, data: { detail: 'La nota cambió en otra sesión.' }, headers: {}, statusText: 'Conflict', config: {} as never }));
    setup();
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByText('Añadir motivo (opcional)'));
    fireEvent.change(screen.getByLabelText('Motivo (opcional)'), { target: { value: 'Conservar este motivo' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    const first = mocks.send.mock.calls[0][1];
    mocks.detail.mockRejectedValueOnce(new Error('Sin conexión con el detalle'));
    mocks.context.mockResolvedValue({ ...changed, fingerprint: 'b'.repeat(64) });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await screen.findByText(/No pudimos comprobar la nota actual/);
    expect(mocks.context).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Motivo (opcional)')).toHaveValue('Conservar este motivo');
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(mocks.send).toHaveBeenCalledTimes(1);
    mocks.detail.mockResolvedValue({ ...cal, updated_at: '2026-11-03T13:00:00' });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await waitFor(() => expect(mocks.context).toHaveBeenCalledTimes(2));
    await screen.findByTestId('regrading-context-ready');
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    const next = mocks.send.mock.calls[1][1];
    expect(next.files).toEqual(first.files);
    expect(next.reason).toBe('Conservar este motivo');
    expect(next.version).toBe('2026-11-03T13:00:00');
    expect(next.scoreContextFingerprint).toBe('b'.repeat(64));
    expect(next.requestId).not.toBe(first.requestId);
  });
  it('140 exige reabrir una nota que otra sesión publicó después de abrir la propuesta', async () => {
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new AxiosError('Conflict', '409', undefined, undefined,
      { status: 409, data: { detail: 'La nota cambió en otra sesión.' }, headers: {}, statusText: 'Conflict', config: {} as never }));
    setup({ estado: 'sugerida', nota_confirmada: null, revisado_por_docente: false });
    await openMode('Volver a calificar');
    expect(screen.queryByRole('checkbox', { name: /Confirmo reabrir/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    mocks.detail.mockResolvedValue({ ...cal, estado: 'publicada', updated_at: '2026-11-03T13:00:00' });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await waitFor(() => expect(mocks.context).toHaveBeenCalledTimes(2));
    const reopen = await screen.findByRole('checkbox', { name: /Confirmo reabrir/ });
    expect(reopen).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(reopen);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    expect(mocks.send.mock.calls[1][1]).toMatchObject({ confirmed: true, version: '2026-11-03T13:00:00' });
  });
  it('140 no permite reenviar si el detalle actualizado indica que otra sesión ya está calificando', async () => {
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new AxiosError('Conflict', '409', undefined, undefined,
      { status: 409, data: { detail: 'Esta entrega está calificándose.' }, headers: {}, statusText: 'Conflict', config: {} as never }));
    setup();
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    mocks.detail.mockResolvedValue({ ...cal, estado: 'procesando', nota_confirmada: null, revisado_por_docente: false });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await waitFor(() => expect(mocks.context).toHaveBeenCalledTimes(2));
    await screen.findByTestId('regrading-context-ready');
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('una versión no disponible bloquea el envío sin alterar la evidencia', async () => {
    mocks.context.mockResolvedValue({ ...unchanged, estado: 'version_no_disponible', mensaje: 'No pudimos comprobar la versión de esta entrega.' });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar evidencia' }));
    await screen.findByText('No pudimos comprobar la versión de esta entrega.');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('con puntos aceptados conserva la misma referencia y solicitud tras error de red incierto', async () => {
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new Error('Sin conexión'));
    setup();
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    const first = mocks.send.mock.calls[0][1];
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    expect(mocks.send.mock.calls[1][1]).toEqual(first);
    expect(mocks.context).toHaveBeenCalledTimes(1);
  });
  it('cerrar y abrir consulta otra vez y no conserva la aceptación de los puntos', async () => {
    mocks.context.mockResolvedValue(changed);
    setup();
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await openMode('Cambiar evidencia');
    expect(mocks.context).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('una respuesta de recalificación tardía no ejecuta callbacks para otra nota', async () => {
    let finish!: (value: unknown) => void;
    mocks.send.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const accepted = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const content = (id: string) => <QueryClientProvider client={client}><GradeReprocessing cal={{ ...cal, id }} onAccepted={accepted} /></QueryClientProvider>;
    const view = render(content('c1'));
    fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    view.rerender(content('c2'));
    await act(async () => { finish({ ...cal, estado: 'procesando' }); });
    expect(accepted).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('una consulta tardía no reemplaza la versión de un diálogo cerrado y abierto de nuevo', async () => {
    let finish!: (value: CalificacionDetalle) => void;
    mocks.context.mockResolvedValue(changed);
    mocks.send.mockRejectedValueOnce(new AxiosError('Conflict', '409', undefined, undefined,
      { status: 409, data: { detail: 'La nota cambió.' }, headers: {}, statusText: 'Conflict', config: {} as never }));
    setup();
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    mocks.detail.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar puntos' }));
    await waitFor(() => expect(mocks.detail).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await openMode('Volver a calificar');
    await act(async () => { finish({ ...cal, updated_at: '2026-11-03T15:00:00' }); });
    expect(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ })).not.toBeChecked();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Confirmo reabrir/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar los puntos actuales/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    expect(mocks.send.mock.calls[1][1].version).toBe(cal.updated_at);
  });
});

describe('corregir una entrega desde la revisión docente', () => {
  it('permite el reemplazo habitual sin preparación y conserva la confirmación docente', async () => {
    mocks.scan = true;
    setup();
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar sin escaneo' }));
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    expect(mocks.send.mock.calls[0][1].scan).toBeUndefined();
    expect(mocks.send.mock.calls[0][1].rotations).toEqual([90]);
    expect(mocks.send.mock.calls[0][1].confirmed).toBe(true);
  });
  it('131 replaces evidence with raw photos and a closed reviewed recipe, not legacy rotations', async () => {
    mocks.scan = true;
    setup({ estado: 'sugerida', revisado_por_docente: false, nota_confirmada: null });
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
    const payload = mocks.send.mock.calls[0][1];
    expect(payload.files[0]).toBeInstanceOf(File);
    expect(payload.scan.pages[0]).toMatchObject({ decision: 'original', rotation: 90, confirmed: true });
    expect(payload.rotations).toBeUndefined();
  });
  it('127 native replacement requires explicit reopening confirmation and preserves file/rotation payload', async () => {
    mocks.realPicker = true;
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('iPhone');
    setup();
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('button', { name: /^Tomar foto/ }));
    const input = document.querySelector('input[capture]')!;
    expect(input.getAttribute('capture')).toBe('environment');
    const file = new File(['anonymous'], 'new.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(mocks.send).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rotar hoja 1' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ files: [file], rotations: [90], confirmed: true, version: cal.updated_at })));
  });
  it('mantiene las opciones avanzadas plegadas hasta que el docente las abre', () => {
    setup({}, false);
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).not.toBeVisible();
    fireEvent.click(screen.getByText('Recalificar y cambiar evidencia'));
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cambiar evidencia' })).toBeVisible();
  });
  it('reabre una nota cero con confirmación y sin motivo obligatorio', async () => {
    const accepted = setup();
    await openMode('Volver a calificar');
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(accepted).toHaveBeenCalledOnce());
    expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ reason: '', confirmed: true, version: cal.updated_at }));
  });
  it('una sugerencia sin confirmar no exige checkbox ni motivo', async () => {
    setup({ estado: 'sugerida', nota_confirmada: null, revisado_por_docente: false });
    await openMode('Volver a calificar');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce());
  });
  it('reemplaza directamente usando las hojas y giros seleccionados', async () => {
    setup();
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button', { name: 'Enviar a calificar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Tomar foto sintética' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('c1', expect.objectContaining({ files: [expect.any(File)], rotations: [90], reason: '' })));
  });
  it('cancelar no hace solicitudes y procesando no permite duplicar', async () => {
    setup();
    await openMode('Cambiar evidencia');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('conserva borrador y solicitud al reintentar tras error de red', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Sin conexión'));
    setup();
    await openMode('Volver a calificar');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await screen.findByRole('alert');
    const firstId = mocks.send.mock.calls[0][1].requestId;
    fireEvent.click(screen.getByRole('button', { name: 'Enviar a calificar' }));
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2));
    expect(mocks.send.mock.calls[1][1].requestId).toBe(firstId);
  });
  it('muestra la nota cero y la evidencia anteriores sin texto técnico', async () => {
    mocks.history.mockResolvedValue([{ id: 'r1', created_at: '2026-10-22T00:00:00Z', actor_nombre: 'Docente sintético', accion: 'cambiar_evidencia', nota_anterior: '0.00', estado_anterior: 'confirmada', feedback_anterior: 'Explica tu respuesta.', motivo: null, evidencia_url: '/api/private/evidence' }]);
    setup();
    fireEvent.click(screen.getByText('Evidencias y resultados anteriores'));
    await screen.findByText('0.00');
    expect(screen.getByRole('link', { name: 'Abrir evidencia anterior' })).toHaveAttribute('href', '/api/private/evidence');
  });
  it('durante procesamiento bloquea ambos envíos', () => {
    setup({ estado: 'procesando' });
    expect(screen.getByRole('button', { name: 'Volver a calificar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cambiar evidencia' })).toBeDisabled();
  });
});
