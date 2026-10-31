import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackSharePanel } from './FeedbackSharePanel';
import * as api from './api';
import { useAuth } from '@/stores/auth';
import type { User } from '@/types/api';
import { createManifest, storeManifest } from './feedbackPreparation';

vi.mock('./api');
const teacher = { id: 't', rol: 'profesor', permissions: ['grading.read', 'grading.publish'] } as User;
const row = { calificacion_id: 'g1', nombre: 'Ana', estudiante_id: 's1' };
const preview = { calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64) };
const access = { id: 'a1', calificacion_id: 'g1', estudiante: 'Ana', estado: 'active' as const, copy_available: true, version: 1, fingerprint: 'f'.repeat(64), expires_at: '2099-01-01' };
const url = 'https://example.test/devolucion#' + 'a'.repeat(43);
const message = 'Identificaste al personaje. Explica qué frase del relato justifica su decisión.';
const pending = { calificacion_id: 'g1', elegible: false, seleccionable: true, preparacion: 'needs_review' as const,
  motivo: 'Revisa los puntajes por pregunta antes de compartir esta retroalimentación.',
  borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: message },
  revision_docente: { source_fingerprint: 'b'.repeat(64), feedback_text: message, detail_available: false } };
function show() { return render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row]} signal={new AbortController().signal} valid={() => useAuth.getState().user?.id === 't'} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />); }
beforeEach(() => {
  vi.resetAllMocks(); sessionStorage.clear(); useAuth.setState({ user: teacher });
  vi.mocked(api.previewFeedback).mockResolvedValue([preview]);
  vi.mocked(api.listFeedbackAccesses).mockResolvedValue([]);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});
describe('129 mismo panel de compartir y copia', () => {
  it('135 no vuelve a aprobar un activo ni mantiene su copia si se cierra durante la preparación', async () => {
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    const candidate = { source_fingerprint: 'b'.repeat(64), nota: '3.5', feedback_text: message, scope: 'summary' as const, avisos: [] };
    const second = { ...preview, calificacion_id: 'g2', batch_candidate: candidate };
    vi.mocked(api.previewFeedback).mockResolvedValueOnce([{ ...pending, batch_candidate: candidate }, second]).mockResolvedValue([preview, second]);
    const secondAccess = { ...access, id: 'a2', calificacion_id: 'g2', estudiante: 'Luis' };
    vi.mocked(api.listFeedbackAccesses).mockResolvedValueOnce([secondAccess]).mockResolvedValue([{ ...secondAccess, estado: 'suspended', copy_available: false }]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a2', calificacion_id: 'g2', estudiante: 'Luis', url }]);
    vi.mocked(api.publishFeedbackBatch).mockImplementation(async (_evaluation, payload) => ({ id: 'batch', request_id: payload.request_id, total: 1, exitosos: 1, fallidos: 0,
      resultados: [{ calificacion_id: 'g1', estado: 'published', fingerprint: preview.fingerprint }] }));
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }]);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row, { ...row, calificacion_id: 'g2', nombre: 'Luis' }]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    await screen.findByRole('button', { name: 'Copiar enlace de Luis' });
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y crear 1 enlace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y preparar 1 enlace' }));
    await screen.findByRole('button', { name: 'Copiar enlace de Ana' });
    await screen.findByRole('button', { name: 'Copiar 1 disponible' });
    expect(vi.mocked(api.publishFeedbackBatch).mock.calls[0][1].selecciones.map(item => item.calificacion_id)).toEqual(['g1']);
    expect(screen.queryByRole('button', { name: 'Copiar enlace de Luis' })).toBeNull();
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
  });
  it('135 aprueba y crea el enlace con una confirmación, conservando opciones y copia separada', async () => {
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    const batchCandidate = { source_fingerprint: 'b'.repeat(64), nota: '3.5', feedback_text: message, scope: 'summary' as const, avisos: [] };
    vi.mocked(api.previewFeedback).mockResolvedValueOnce([{ ...pending, batch_candidate: batchCandidate }]).mockResolvedValue([preview]);
    vi.mocked(api.publishFeedbackBatch).mockImplementation(async (_evaluation, payload) => ({ id: 'batch', request_id: payload.request_id, total: 1, exitosos: 1, fallidos: 0,
      resultados: [{ calificacion_id: 'g1', estado: 'already_published', fingerprint: preview.fingerprint }] }));
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }]);
    show();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Duración del enlace' }), { target: { value: '7' } });
    expect(screen.getByText('Lista para tu aprobación')).toBeInTheDocument();
    expect(screen.queryByText(pending.motivo)).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Permitir ver las fotos de su propia entrega' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar y crear 1 enlace' }));
    expect(api.publishFeedbackBatch).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Confirmar entrega' })).toHaveTextContent(message);
    expect(screen.queryByRole('list', { name: 'Destinatarios y enlaces' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y preparar 1 enlace' }));
    await screen.findByRole('button', { name: 'Copiar 1 enlace' });
    expect(api.publishFeedbackBatch).toHaveBeenCalledTimes(1);
    expect(api.approveFeedbackReview).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).toHaveBeenCalledWith('e1', expect.objectContaining({ duracion_dias: 7, evidencia: true,
      selecciones: [{ calificacion_id: 'g1', fingerprint: preview.fingerprint }] }), expect.any(AbortSignal));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Copiar 1 enlace' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`Ana\n${url}`));
  });

  it('135 no emite un enlace de quien falló al aprobar y conserva los éxitos', async () => {
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    const candidate = { source_fingerprint: 'b'.repeat(64), nota: '3.5', feedback_text: message, scope: 'summary' as const, avisos: [] };
    const second = { ...pending, calificacion_id: 'g2', batch_candidate: candidate };
    vi.mocked(api.previewFeedback).mockResolvedValueOnce([{ ...pending, batch_candidate: candidate }, second]).mockResolvedValue([preview, second]);
    vi.mocked(api.publishFeedbackBatch).mockImplementation(async (_evaluation, payload) => ({ id: 'batch', request_id: payload.request_id, total: 2, exitosos: 1, fallidos: 1,
      resultados: [{ calificacion_id: 'g1', estado: 'published', fingerprint: preview.fingerprint }, { calificacion_id: 'g2', estado: 'failed', code: 'source_changed' }] }));
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }]);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row, { ...row, calificacion_id: 'g2', nombre: 'Luis' }]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar y crear 2 enlaces' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y preparar 2 enlaces' }));
    await screen.findByRole('button', { name: 'Copiar 1 disponible' });
    expect(vi.mocked(api.issueFeedbackAccesses).mock.calls[0][1].selecciones.map(item => item.calificacion_id)).toEqual(['g1']);
    expect(screen.queryByRole('button', { name: 'Copiar enlace de Luis' })).toBeNull();
  });

  it('conserva opciones y otro enlace preparado al aprobar una retroalimentación pendiente', async () => {
    const approved = { ...preview, revision_docente: pending.revision_docente, borrador_docente: pending.borrador_docente };
    vi.mocked(api.previewFeedback).mockResolvedValue([pending, { ...preview, calificacion_id: 'g2' }, { ...preview, calificacion_id: 'g3' }]);
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([{ ...access, id: 'a2', calificacion_id: 'g2', estudiante: 'Luis' }]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a2', calificacion_id: 'g2', estudiante: 'Luis', url }]);
    vi.mocked(api.approveFeedbackReview).mockResolvedValue(approved);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row, { ...row, calificacion_id: 'g2', nombre: 'Luis' }, { ...row, calificacion_id: 'g3', nombre: 'Eva' }]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    await screen.findByRole('button', { name: 'Copiar enlace de Luis' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Duración del enlace' }), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Permitir ver las fotos de su propia entrega' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    await screen.findByRole('button', { name: 'Crear 2 enlaces faltantes' });
    expect(screen.getByRole('combobox', { name: 'Duración del enlace' })).toHaveValue('7');
    expect(screen.getByRole('checkbox', { name: 'Permitir ver las fotos de su propia entrega' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Copiar enlace de Luis' })).toBeEnabled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
  });

  it('conserva borrador en conflicto y vuelve sin aprobar ni emitir', async () => {
    vi.mocked(api.previewFeedback).mockResolvedValue([pending]);
    vi.mocked(api.approveFeedbackReview).mockRejectedValue({ response: { data: { detail: 'La retroalimentación cambió. Actualiza la lista.' } } });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para el estudiante' }), { target: { value: message + ' Añade una razón.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La retroalimentación cambió');
    expect(screen.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveValue(message + ' Añade una razón.');
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin aprobar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios y volver' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' })).toHaveFocus());
    expect(screen.queryByRole('button', { name: 'Crear 1 enlace faltante' })).toBeNull();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('guardar el mensaje no lo aprueba ni crea el enlace', async () => {
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    vi.mocked(api.previewFeedback).mockResolvedValue([{ ...pending, mensaje_editable: pending.revision_docente }]);
    vi.mocked(api.saveFeedbackMessage).mockResolvedValue({ ...pending, mensaje_editable: { ...pending.revision_docente, feedback_text: message + ' Relee el final.' }, revision_docente: { ...pending.revision_docente, feedback_text: message + ' Relee el final.' } });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para el estudiante' }), { target: { value: message + ' Relee el final.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mensaje sin publicar' }));
    expect(await screen.findByText(/Falta aprobar la retroalimentación/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprobar retroalimentación' })).toBeEnabled();
    expect(api.approveFeedbackReview).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('aprobar un resumen no reactiva ni sustituye enlaces cerrados', async () => {
    vi.mocked(api.previewFeedback).mockResolvedValue([pending]);
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([{ ...access, estado: 'suspended', copy_available: false }]);
    vi.mocked(api.approveFeedbackReview).mockResolvedValue({ ...preview, revision_docente: pending.revision_docente, borrador_docente: pending.borrador_docente });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    expect(await screen.findByText(/no se reactivó ni creó otro/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crear 1 enlace faltante' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Revisar enlace de Ana' })).toBeEnabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Revisar enlace de Ana' })).toHaveFocus());
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('no permite aprobar una nota sin confirmar ni cambiar la intención de una solicitud incierta', async () => {
    vi.mocked(api.previewFeedback).mockResolvedValue([{ ...pending, revision_docente: undefined, preparacion: 'no_grade' }]);
    const first = show();
    await screen.findByRole('button', { name: 'Revisar enlace de Ana' });
    expect(screen.queryByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' })).toBeNull();
    first.unmount();
    storeManifest(sessionStorage, createManifest('t', 'e1', [{ calificacion_id: 'g1', fingerprint: 'f'.repeat(64) }], 3, false));
    vi.mocked(api.previewFeedback).mockResolvedValue([pending]);
    show();
    await screen.findByRole('button', { name: 'Recuperar la misma solicitud' });
    expect(screen.queryByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' })).toBeNull();
    expect(api.approveFeedbackReview).not.toHaveBeenCalled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('no expone una aprobación tardía al cambiar de cuenta', async () => {
    vi.mocked(api.previewFeedback).mockResolvedValue([pending]);
    let resolve!: (result: Awaited<ReturnType<typeof api.approveFeedbackReview>>) => void;
    vi.mocked(api.approveFeedbackReview).mockImplementation(() => new Promise(done => { resolve = done; }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar y compartir retroalimentación de Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    act(() => useAuth.setState({ user: { ...teacher, id: 'otro' } }));
    await act(async () => resolve(preview));
    expect(screen.queryByRole('region', { name: 'Compartir retroalimentaciones' })).toBeNull();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });

  it('abre sin emitir, confirma solo faltantes y copia con un gesto posterior', async () => {
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }]);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 1 enlace faltante' }));
    expect(api.issueFeedbackAccesses).toHaveBeenCalledWith('e1', expect.objectContaining({ duracion_dias: 3, evidencia: false, selecciones: [expect.objectContaining({ calificacion_id: 'g1' })] }), expect.any(AbortSignal));
    const copy = await screen.findByRole('button', { name: 'Copiar 1 enlace' });
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    fireEvent.click(copy);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`Ana\n${url}`));
  });
  it('solo recupera activos sin emisión, cambios de vigencia ni publicación', async () => {
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([access]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', calificacion_id: 'g1', estudiante: 'Ana', url }]);
    show();
    expect(await screen.findByRole('button', { name: 'Copiar 1 enlace' })).toBeEnabled();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(api.changeFeedbackAccess).not.toHaveBeenCalled();
    expect(api.publishFeedbackBatch).not.toHaveBeenCalled();
  });
  it('no emite para sustituir un vencido y ofrece opciones del estudiante', async () => {
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([{ ...access, estado: 'expired' }]);
    show();
    expect(await screen.findByRole('button', { name: 'Revisar enlace de Ana' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Crear.*faltante/ })).toBeNull();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('no considera una respuesta incompleta éxito y reintenta con idéntica solicitud', async () => {
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValueOnce([]).mockResolvedValueOnce([{ calificacion_id: 'g1', id: 'a1' }]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', estudiante: 'Ana', url }]);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 1 enlace faltante' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Recuperar la misma solicitud' }));
    await screen.findByRole('button', { name: 'Copiar 1 enlace' });
    expect(vi.mocked(api.issueFeedbackAccesses).mock.calls[1][1]).toEqual(vi.mocked(api.issueFeedbackAccesses).mock.calls[0][1]);
  });
  it('mantiene copia manual si el navegador deniega el portapapeles', async () => {
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([access]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', estudiante: 'Ana', url }]);
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Copiar 1 enlace' }));
    expect(await screen.findByRole('textbox', { name: 'Enlaces para copiar manualmente' })).toHaveValue(`Ana\n${url}`);
    expect(screen.queryByText(/enlaces copiados/)).toBeNull();
  });
  it('copia solo el alumno elegido aunque compartan apellido', async () => {
    const second = { ...row, calificacion_id: 'g2', nombre: 'Luis Pérez' };
    vi.mocked(api.previewFeedback).mockResolvedValue([preview, { ...preview, calificacion_id: 'g2' }]);
    vi.mocked(api.listFeedbackAccesses).mockResolvedValue([access, { ...access, id: 'a2', calificacion_id: 'g2', estudiante: 'Luis Pérez' }]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', estudiante: 'Ana', url }, { id: 'a2', estudiante: 'Luis Pérez', url: url.replace(/a+$/, 'b'.repeat(43)) }]);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[{ ...row, nombre: 'Ana Pérez' }, second]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Copiar enlace de Luis Pérez' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith('Luis Pérez\nhttps://example.test/devolucion#' + 'b'.repeat(43));
  });
  it('recupera tras reapertura con el mismo UUID y elimina metadata al cerrar sesión', async () => {
    vi.mocked(api.issueFeedbackAccesses).mockRejectedValueOnce(new Error('response lost')).mockResolvedValueOnce([{ calificacion_id: 'g1', id: 'a1' }]);
    vi.mocked(api.copyFeedbackAccesses).mockResolvedValue([{ id: 'a1', estudiante: 'Ana', url }]);
    const first = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 1 enlace faltante' }));
    await screen.findByRole('button', { name: 'Recuperar la misma solicitud' });
    const original = vi.mocked(api.issueFeedbackAccesses).mock.calls[0][1];
    first.unmount(); show();
    fireEvent.click(await screen.findByRole('button', { name: 'Recuperar la misma solicitud' }));
    await screen.findByRole('button', { name: 'Copiar 1 enlace' });
    expect(vi.mocked(api.issueFeedbackAccesses).mock.calls[1][1]).toEqual(original);
    // A new uncertain preparation never leaves credentials in storage.
    vi.mocked(api.issueFeedbackAccesses).mockRejectedValue(new Error('lost'));
    expect(JSON.stringify(sessionStorage)).not.toContain(url);
    act(() => useAuth.setState({ user: null }));
    expect(screen.queryByRole('region', { name: 'Compartir retroalimentaciones' })).toBeNull();
    expect(sessionStorage.getItem('feedback-preparation:t:e1')).toBeNull();
  });
  it('rechaza respuestas tardías después de cambiar de cuenta', async () => {
    let resolve!: (value: Awaited<ReturnType<typeof api.issueFeedbackAccesses>>) => void;
    vi.mocked(api.issueFeedbackAccesses).mockImplementation(() => new Promise(done => { resolve = done; }));
    show(); fireEvent.click(await screen.findByRole('button', { name: 'Crear 1 enlace faltante' }));
    act(() => useAuth.setState({ user: { ...teacher, id: 'otro' } }));
    await act(async () => resolve([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }]));
    expect(screen.queryByRole('button', { name: 'Copiar 1 enlace' })).toBeNull();
    expect(sessionStorage.getItem('feedback-preparation:t:e1')).toBeNull();
  });
  it('identifica el fallo por estudiante y copia explícitamente solo los confirmados', async () => {
    vi.mocked(api.previewFeedback).mockResolvedValue([preview, { ...preview, calificacion_id: 'g2' }]);
    vi.mocked(api.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'a1', url, credential_available: true }, { calificacion_id: 'g2', error: 'Cambió la retroalimentación' }]);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row, { ...row, calificacion_id: 'g2', nombre: 'Luis' }]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Crear 2 enlaces faltantes' }));
    const ready = await screen.findByRole('button', { name: 'Copiar 1 disponible' });
    expect(within(screen.getByText('Luis').closest('li')!).getByText(/No se pudo crear su enlace/)).toBeInTheDocument();
    fireEvent.click(ready);
    expect(navigator.clipboard.writeText).toHaveBeenCalledExactlyOnceWith(`Ana\n${url}`);
  });
  it('explica el almacenamiento bloqueado sin mandar una creación imposible de recuperar', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    try {
      show(); fireEvent.click(await screen.findByRole('button', { name: 'Crear 1 enlace faltante' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('No enviamos enlaces nuevos');
      expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
    } finally { storage.mockRestore(); }
  });
  it('identifica los destinatarios originales al recuperar con otra selección', async () => {
    storeManifest(sessionStorage, createManifest('t', 'e1', [{ calificacion_id: 'g2', fingerprint: 'f'.repeat(64) }], 3, false));
    vi.mocked(api.previewFeedback).mockResolvedValue([{ ...preview, calificacion_id: 'g2' }]);
    render(<FeedbackSharePanel actorId="t" evaluationId="e1" rows={[row]} knownRows={[row, { ...row, calificacion_id: 'g2', nombre: 'Luis' }]} signal={new AbortController().signal} valid={() => true} onBusy={vi.fn()} onBack={vi.fn()} onManage={vi.fn()} />);
    expect(await screen.findByText('Luis')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).toBeNull();
    expect(api.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
});
