import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/auth';
import { ShareFeedbackDialog } from './ShareFeedbackDialog';
import type { User } from '@/types/api';
import * as teacherApi from './api';
import { getEvaluationReview } from '@/modules/calificaciones/api';
import { StrictMode } from 'react';

vi.mock('./api');
vi.mock('@/modules/calificaciones/api', () => ({ getEvaluationReview: vi.fn() }));
const teacher = { id: 'teacher', rol: 'profesor', permissions: ['grading.read', 'grading.publish'] } as User;
const result = { estudiante: 'Ana Pérez', evaluacion: 'Lectura', materia: 'Lenguaje', nota: '3.5', nota_maxima: '5', explicacion: 'Revisada.', retroalimentacion: 'Identificaste al personaje. En la pregunta 2 relee el párrafo y busca una emoción.', respuestas: [], claves_liberadas: false };

async function issuedAccesses(): Promise<teacherApi.FeedbackAccess[]> {
  const results = await Promise.all(vi.mocked(teacherApi.issueFeedbackAccesses).mock.results.map(async item =>
    item.type === 'return' ? await item.value.catch(() => []) : []));
  return [...new Map(results.flat().filter(item => item.id && !item.error).map(item => [item.id!, {
    id: item.id!, calificacion_id: item.calificacion_id, estudiante: result.estudiante,
    estado: item.estado ?? 'active', version: item.version ?? 1,
    expires_at: item.expires_at ?? '2099-01-04T00:00:00Z', fingerprint: 'f'.repeat(64), copy_available: true,
  }])).values()];
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  useAuth.setState({ user: teacher });
  vi.mocked(getEvaluationReview).mockResolvedValue({ alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }, { estudiante_id: 'b', nombre: 'Luis Pérez', calificacion_id: null }], siguiente_cursor: null } as never);
  vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64), resultado: result }]);
  vi.mocked(teacherApi.listFeedbackAccesses).mockImplementation(issuedAccesses);
  vi.mocked(teacherApi.copyFeedbackAccesses).mockImplementation(async (_evaluation, ids) => {
    const saved = await issuedAccesses();
    const issued = (await Promise.all(vi.mocked(teacherApi.issueFeedbackAccesses).mock.results.map(async item =>
      item.type === 'return' ? await item.value.catch(() => []) : []))).flat();
    return ids.map(id => ({ ...saved.find(item => item.id === id)!, url: issued.find(item => item.id === id)?.url ?? undefined }));
  });
});
describe('retroalimentaciones por evaluación', () => {
  it('139 vuelve al estudiante con el mismo enlace visible sin generar ni aprobar', async () => {
    const access = { id: 'saved-link', calificacion_id: 'g1', estudiante: 'Ana Pérez', estado: 'active' as const,
      version: 4, expires_at: '2099-01-01T00:00:00Z', fingerprint: 'f'.repeat(64), copy_available: true };
    const url = 'https://example.test/devolucion#' + 'a'.repeat(43);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    vi.mocked(teacherApi.listFeedbackAccesses).mockResolvedValue([access]);
    vi.mocked(teacherApi.copyFeedbackAccesses).mockResolvedValue([{ id: access.id, calificacion_id: 'g1', estudiante: access.estudiante, url, expires_at: access.expires_at }]);
    const props = { evaluationId: 'e1', initialGradeId: 'g1', onClose: () => {}, onReview: () => {} };
    const first = render(<ShareFeedbackDialog {...props} />);
    const block = await screen.findByRole('region', { name: 'Enlace para el estudiante' });
    await waitFor(() => expect(within(block).getByRole('textbox', { name: 'Enlace del estudiante' })).toHaveValue(url));
    fireEvent.click(within(block).getByRole('button', { name: 'Copiar enlace' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`Hola. Esta es la retroalimentación de Ana Pérez en Lectura: ${url}`));
    first.unmount(); sessionStorage.clear(); localStorage.clear();
    render(<ShareFeedbackDialog {...props} />);
    const reopened = await screen.findByRole('region', { name: 'Enlace para el estudiante' });
    await waitFor(() => expect(within(reopened).getByRole('textbox', { name: 'Enlace del estudiante' })).toHaveValue(url));
    await waitFor(() => expect(within(reopened).getByText('Enlace disponible')).toBeVisible());
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(teacherApi.publishFeedbackBatch).not.toHaveBeenCalled();
    expect(teacherApi.changeFeedbackAccess).not.toHaveBeenCalled();
  });
  it('139 recuperar foco durante una copia no invalida la operación ni deja bloqueada la pantalla', async () => {
    const access = { id: 'saved-link', calificacion_id: 'g1', estudiante: 'Ana Pérez', estado: 'active' as const, version: 1, fingerprint: 'f'.repeat(64), copy_available: true, expires_at: '2099-01-01T00:00:00Z' };
    const copied = { ...access, url: 'https://example.test/devolucion#' + 'a'.repeat(43) };
    const onBusyChange = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    vi.mocked(teacherApi.listFeedbackAccesses).mockResolvedValue([access]);
    vi.mocked(teacherApi.copyFeedbackAccesses).mockResolvedValue([copied]);
    render(<ShareFeedbackDialog evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} onBusyChange={onBusyChange} />);
    const copy = await screen.findByRole('button', { name: /^Copiar enlace$/ });
    let finish!: (value: teacherApi.FeedbackCopiedAccess[]) => void;
    vi.mocked(teacherApi.copyFeedbackAccesses).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    fireEvent.click(copy);
    await waitFor(() => expect(teacherApi.copyFeedbackAccesses).toHaveBeenCalledTimes(2));
    const queries = vi.mocked(teacherApi.listFeedbackAccesses).mock.calls.length;
    fireEvent.focus(window);
    expect(teacherApi.listFeedbackAccesses).toHaveBeenCalledTimes(queries);
    await act(async () => { finish([copied]); });
    await waitFor(() => expect(copy).toBeEnabled());
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('139 no confunde fallo de consulta con ausencia ni ofrece generar otro enlace', async () => {
    vi.mocked(teacherApi.listFeedbackAccesses).mockRejectedValue(new Error('offline'));
    render(<ShareFeedbackDialog evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    const block = screen.getByRole('region', { name: 'Enlace para el estudiante' });
    await waitFor(() => expect(within(block).getByRole('button', { name: 'Reintentar' })).toBeEnabled());
    expect(within(block).queryByRole('button', { name: 'Generar enlace' })).not.toBeInTheDocument();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('139 refrescar metadatos al enfocar conserva el botón de copia y el foco', async () => {
    const access = { id: 'saved-link', calificacion_id: 'g1', estudiante: 'Ana Pérez', estado: 'active' as const, version: 1, fingerprint: 'f'.repeat(64), copy_available: true, expires_at: '2099-01-01T00:00:00Z' };
    vi.mocked(teacherApi.listFeedbackAccesses).mockResolvedValue([access]);
    render(<ShareFeedbackDialog evaluationId="e1" initialSelectedIds={['g1']} onClose={() => {}} onReview={() => {}} />);
    const copy = await screen.findByRole('button', { name: 'Copiar lista de 1' });
    copy.focus();
    let finish!: (value: teacherApi.FeedbackAccess[]) => void;
    vi.mocked(teacherApi.listFeedbackAccesses).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    fireEvent.focus(window);
    expect(copy).toBeInTheDocument();
    await act(async () => { finish([access]); });
    expect(screen.getByRole('button', { name: 'Copiar lista de 1' })).toBe(copy);
    expect(copy).toHaveFocus();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it.each([true, false])('138/139 ofrece una sola acción de enlace y conserva impresión en el detalle individual (integrado=%s)', async embedded => {
    render(<ShareFeedbackDialog embedded={embedded} evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    const block = screen.getByRole('region', { name: 'Enlace para el estudiante' });
    expect(within(block).getByRole('button', { name: 'Generar enlace' })).toBeEnabled();
    expect(screen.getAllByRole('button', { name: /^(Generar enlace|Copiar enlace)$/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /^Compartir/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar impresión' })).toBeEnabled();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(teacherApi.publishFeedbackBatch).not.toHaveBeenCalled();
  });
  it.each([true, false])('136 lectura, edición e impresión conservan el mismo modo de scroll (integrado=%s)', async (embedded) => {
    const context = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: (text: string) => ({ width: text.length * 7 }) } as unknown as CanvasRenderingContext2D);
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64), resultado: result,
      mensaje_editable: { source_fingerprint: 'f'.repeat(64), feedback_text: result.retroalimentacion, detail_available: false } }]);
    vi.mocked(teacherApi.prepareFeedbackPrint).mockResolvedValue([{ calificacion_id: 'g1', resultado: result }]);
    render(<ShareFeedbackDialog embedded={embedded} evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar retroalimentación de Ana Pérez' }));
    const input = await screen.findByRole('textbox', { name: 'Mensaje para el estudiante' });
    expect(input.closest('[data-feedback-scroll]')).toHaveAttribute('data-feedback-scroll', embedded ? 'outer' : 'self');
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin aprobar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preparar impresión' }));
    const preview = await screen.findByRole('region', { name: 'Vista previa de impresión' });
    expect(preview.parentElement).toHaveAttribute('data-feedback-scroll', embedded ? 'outer' : 'self');
    expect(preview.parentElement!.classList.contains('overscroll-contain')).toBe(!embedded);
    expect(teacherApi.publishFeedbackBatch).not.toHaveBeenCalled();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    context.mockRestore();
  });
  it.each([true, false])('136 delega lectura y compartir al dueño de scroll adecuado (integrado=%s)', async (embedded) => {
    render(<ShareFeedbackDialog embedded={embedded} evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    const detail = await screen.findByRole('region', { name: 'Retroalimentación de Ana Pérez' });
    const scroll = detail.parentElement!;
    if (embedded) {
      expect(scroll).not.toHaveClass('overflow-y-auto', 'overscroll-contain');
      expect(scroll).not.toHaveAttribute('data-mobile-scroll');
    } else {
      expect(scroll).toHaveClass('overflow-y-auto', 'overscroll-contain');
      expect(scroll).toHaveAttribute('data-mobile-scroll');
      expect(document.body.style.overflow).toBe('hidden');
    }
    fireEvent.click(screen.getByRole('button', { name: 'Generar enlace' }));
    const share = await screen.findByRole('region', { name: 'Compartir retroalimentaciones' });
    const shareBody = share.querySelector('[data-feedback-scroll]')!;
    expect(shareBody).toHaveAttribute('data-feedback-scroll', embedded ? 'outer' : 'self');
    expect(shareBody.classList.contains('overscroll-contain')).toBe(!embedded);
    expect(shareBody.hasAttribute('data-mobile-scroll')).toBe(!embedded);
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(teacherApi.publishFeedbackBatch).not.toHaveBeenCalled();
  });
  it('135 separa la preparación pendiente de los cambios reales sin guardar', async () => {
    let finish!: (result: Awaited<ReturnType<typeof teacherApi.issueFeedbackAccesses>>) => void;
    vi.mocked(teacherApi.issueFeedbackAccesses).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const dirty = vi.fn(); const busy = vi.fn();
    render(<ShareFeedbackDialog embedded evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} onDirtyChange={dirty} onBusyChange={busy} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Generar enlace' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar y generar 1 enlace' }));
    await waitFor(() => expect(busy).toHaveBeenLastCalledWith(true));
    expect(dirty.mock.calls.some(([value]) => value === true)).toBe(false);
    await act(async () => finish([{ calificacion_id: 'g1', id: 'access', credential_available: true, url: 'https://example.test/devolucion#' + 'a'.repeat(43) }]));
    await screen.findByRole('button', { name: 'Copiar enlace' });
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it('135 usa el espacio integrado sin otra altura fija ni marco anidado', async () => {
    render(<ShareFeedbackDialog embedded evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    const workspace = screen.getByRole('region', { name: 'Retroalimentación del estudiante' });
    expect(workspace.className).not.toContain('70dvh');
    expect(workspace.className).not.toContain('border');
  });

  it.each([false, true])('revisa una publicada pendiente desde Compartir sin salir del panel (integrado=%s)', async (embedded) => {
    const pending = { calificacion_id: 'g1', elegible: false, seleccionable: true, preparacion: 'needs_review' as const,
      motivo: 'Revisa los puntajes por pregunta antes de compartir esta retroalimentación.',
      revision_docente: { source_fingerprint: 'a'.repeat(64), feedback_text: result.retroalimentacion, detail_available: false },
      borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: result.retroalimentacion } };
    const ready = { ...pending, elegible: true, preparacion: 'ready' as const, fingerprint: 'b'.repeat(64), resultado: { ...result, alcance: 'summary' as const } };
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([pending]);
    vi.mocked(teacherApi.approveFeedbackReview).mockImplementation(async () => { vi.mocked(teacherApi.previewFeedback).mockResolvedValue([ready]); return ready; });
    vi.mocked(teacherApi.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'new-access', credential_available: true, url: 'https://example.test/devolucion#' + 'b'.repeat(43) }]);
    const onReview = vi.fn();
    const onClose = vi.fn();
    const finishEditing = vi.fn();
    render(<ShareFeedbackDialog embedded={embedded} evaluationId="e1" initialGradeId={embedded ? 'g1' : undefined} onClose={onClose} onReview={onReview} onFinishEditing={finishEditing} />);
    if (embedded) {
      fireEvent.click(await screen.findByRole('button', { name: 'Revisar retroalimentación de Ana Pérez' }));
    } else {
      fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Generar enlaces' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Revisar y compartir retroalimentación de Ana Pérez' }));
    }
    expect(screen.getByRole('combobox', { name: 'Contenido de la retroalimentación' })).toHaveValue('summary');
    expect(screen.queryByRole('option', { name: 'Incluir detalle por pregunta revisado' })).toBeNull();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    if (embedded) await waitFor(() => expect(vi.mocked(teacherApi.previewFeedback).mock.calls.length).toBeGreaterThanOrEqual(2));
    const create = await screen.findByRole('button', { name: embedded ? 'Generar enlace' : 'Generar 1 enlace' });
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(onReview).not.toHaveBeenCalled();
    expect(finishEditing).toHaveBeenCalledOnce();
    fireEvent.click(create);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar y generar 1 enlace' }));
    expect(await screen.findByRole('button', { name: embedded ? 'Copiar enlace' : 'Copiar enlace de Ana Pérez' })).toBeEnabled();
    expect(teacherApi.approveFeedbackReview).toHaveBeenCalledWith('e1', expect.objectContaining({ scope: 'summary', feedback_text: result.retroalimentacion }), expect.any(AbortSignal));
    expect(teacherApi.issueFeedbackAccesses).toHaveBeenCalledWith('e1', expect.objectContaining({ selecciones: [{ calificacion_id: 'g1', fingerprint: ready.fingerprint }], duracion_dias: 3, evidencia: false }), expect.any(AbortSignal));
    if (!embedded) fireEvent.click(screen.getByRole('button', { name: 'Volver a estudiantes' }));
    if (!embedded) expect(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeChecked();
    expect(screen.getByText('Lista para entregar')).toBeInTheDocument();
  });

  it('el modo integrado y el diálogo usan el mismo contenido, sin seleccionar todo al abrir', async () => {
    const { rerender } = render(<ShareFeedbackDialog embedded evaluationId="e1" initialGradeId="g1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    rerender(<ShareFeedbackDialog evaluationId="e1" initialSelectedIds={['g1']} onClose={() => {}} onReview={() => {}} />);
    expect(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Ver retroalimentación de Ana Pérez' }));
    expect(screen.getByText(result.retroalimentacion)).toBeInTheDocument();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('protege el texto al volver sin guardar y permite guardar sin aprobar la nota', async () => {
    useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } });
    const draft = { calificacion_id: 'g1', elegible: false, seleccionable: true, borrador_docente: { estado: 'sugerida', nota: '3.5', nota_maxima: '5', retroalimentacion: result.retroalimentacion }, mensaje_editable: { source_fingerprint: 'a'.repeat(64), feedback_text: result.retroalimentacion, detail_available: false } };
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([draft]);
    vi.mocked(teacherApi.saveFeedbackMessage).mockResolvedValue(draft);
    const onClose = vi.fn();
    render(<ShareFeedbackDialog evaluationId="e1" onClose={onClose} onReview={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver retroalimentación de Ana Pérez' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar retroalimentación de Ana Pérez' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Mensaje para el estudiante' }), { target: { value: 'Una explicación revisada.' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Mensaje para el estudiante' })).toHaveValue('Una explicación revisada.');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver sin aprobar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Descartar cambios y volver' })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar mensaje sin publicar' }));
    await waitFor(() => expect(teacherApi.saveFeedbackMessage).toHaveBeenCalledWith('e1', expect.objectContaining({ feedback_text: 'Una explicación revisada.' }), expect.any(AbortSignal)));
    expect(teacherApi.approveFeedbackReview).not.toHaveBeenCalled();
    expect(teacherApi.publishFeedbackBatch).not.toHaveBeenCalled();
  });
  it('una carga cancelada por StrictMode no deja un falso error', async () => {
    vi.mocked(getEvaluationReview).mockImplementation(async (_id, _params, signal) => {
      await Promise.resolve();
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return { alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }], siguiente_cursor: null } as never;
    });
    render(<StrictMode><ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} /></StrictMode>);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('reúne el grupo, conserva texto y no genera enlaces al consultar', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText(/Sin calificación todavía/)).toBeInTheDocument();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(getEvaluationReview).toHaveBeenCalledWith('e1', expect.objectContaining({ limit: 100 }), expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Ver retroalimentación de Ana Pérez' }));
    expect(screen.getByText(result.retroalimentacion)).toBeInTheDocument();
  });
  it('crea solo seleccionados con tres días y evidencia desactivada', async () => {
    vi.mocked(teacherApi.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'access', estado: 'active', version: 1, expires_at: '2099-01-04T00:00:00Z', url: 'https://example.test/devolucion#' + 'a'.repeat(43), credential_available: true }]);
    render(<ShareFeedbackDialog evaluationId="e1" initialSelectedIds={[]} onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generar enlaces' }));
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Generar 1 enlace' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar y generar 1 enlace' }));
    await waitFor(() => expect(teacherApi.issueFeedbackAccesses).toHaveBeenCalledWith('e1', expect.objectContaining({ duracion_dias: 3, evidencia: false, selecciones: [{ calificacion_id: 'g1', fingerprint: 'f'.repeat(64) }] }), expect.any(AbortSignal)));
    expect(await screen.findByRole('button', { name: 'Copiar enlace de Ana Pérez' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copiar todos/i })).toBeNull();
  });
  it('no consulta con rol de estudiante', () => {
    useAuth.setState({ user: { ...teacher, rol: 'estudiante' } });
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    expect(getEvaluationReview).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('permite leer un borrador docente pero no entregarlo como definitivo', async () => {
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: false, motivo: 'Primero revisa y confirma la nota.', borrador_docente: { nota: '3.5', nota_maxima: '5', retroalimentacion: result.retroalimentacion, estado: 'requiere_revision' } }]);
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preparar impresión' })).toBeDisabled();
    expect(screen.getByText('Primero revisa y confirma la nota.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver retroalimentación de Ana Pérez' }));
    expect(screen.getByText(result.retroalimentacion)).toBeInTheDocument();
  });
  it('no muestra una carga parcial como si fuera toda la evaluación', async () => {
    vi.mocked(getEvaluationReview).mockResolvedValueOnce({ alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }], siguiente_cursor: 'next' } as never).mockRejectedValueOnce(new Error('offline'));
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos cargar/);
    expect(screen.queryByText('Ana Pérez')).toBeNull();
  });
  it('permite seleccionar una nota confirmada pendiente y aprobar su resumen sin perder la selección', async () => {
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: false,
      seleccionable: true, preparacion: 'needs_review', motivo: 'Revisa los puntajes por pregunta.',
      revision_docente: { source_fingerprint: 'a'.repeat(64), feedback_text: result.retroalimentacion, detail_available: false },
      borrador_docente: { estado: 'publicada', nota: '3.5', nota_maxima: '5', retroalimentacion: result.retroalimentacion } }]);
    vi.mocked(teacherApi.approveFeedbackReview).mockResolvedValue({ calificacion_id: 'g1', elegible: true,
      seleccionable: true, preparacion: 'ready', fingerprint: 'f'.repeat(64), resultado: { ...result, alcance: 'summary' } });
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    const checkbox = await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    expect(checkbox).toBeEnabled();
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'Ver retroalimentación de Ana Pérez' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revisar retroalimentación de Ana Pérez' }));
    expect(await screen.findByText(/Solo nota y retroalimentación/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar retroalimentación' }));
    await waitFor(() => expect(teacherApi.approveFeedbackReview).toHaveBeenCalledWith('e1', expect.objectContaining({ calificacion_id: 'g1', scope: 'summary' }), expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preparar impresión' })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeChecked();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('limpia el contenido al perder la sesión', async () => {
    const { rerender } = render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    useAuth.setState({ user: null });
    rerender(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    expect(screen.queryByText(result.retroalimentacion)).toBeNull();
  });
  it('no omite pendientes silenciosamente al entregar una selección mixta', async () => {
    vi.mocked(getEvaluationReview).mockResolvedValue({ alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }, { estudiante_id: 'b', nombre: 'Luis Pérez', calificacion_id: 'g2' }], siguiente_cursor: null } as never);
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([
      { calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64), resultado: result },
      { calificacion_id: 'g2', elegible: false, seleccionable: true, preparacion: 'needs_review', motivo: 'Revisa el mensaje.' },
    ]);
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    fireEvent.click(screen.getByRole('button', { name: 'Todos con nota del filtro' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preparar impresión' }));
    expect(screen.getByText(/1 retroalimentaciones seleccionadas necesitan revisión/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar solo 1 lista' })).toBeInTheDocument();
    expect(teacherApi.prepareFeedbackPrint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Luis Pérez' })).toBeChecked();
  });
  it('actualizar conserva la selección y no emite ni imprime por su cuenta', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estudiantes y retroalimentaciones' }));
    await waitFor(() => expect(teacherApi.previewFeedback).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).not.toBeChecked();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(teacherApi.prepareFeedbackPrint).not.toHaveBeenCalled();
  });
  it('129 conserva seleccionados ocultos y sesión renovada, sin seleccionar fuera del filtro', async () => {
    vi.mocked(getEvaluationReview).mockResolvedValue({ alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }, { estudiante_id: 'b', nombre: 'Luis Pérez', calificacion_id: 'g2' }], siguiente_cursor: null } as never);
    vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64), resultado: result }, { calificacion_id: 'g2', elegible: true, fingerprint: 'b'.repeat(64), resultado: { ...result, estudiante: 'Luis Pérez', nota: '0' } }]);
    render(<ShareFeedbackDialog evaluationId="e1" initialSelectedIds={[]} onClose={() => {}} onReview={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Luis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Listos del filtro' }));
    expect(screen.getByText('2 seleccionados · 1 fuera del filtro')).toBeInTheDocument();
    act(() => useAuth.setState({ user: { ...teacher } }));
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Luis Pérez' })).toBeChecked();
    expect(screen.getByText('2 seleccionados · 1 fuera del filtro')).toBeInTheDocument();
    expect(getEvaluationReview).toHaveBeenCalledTimes(1);
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('129 devuelve el foco a Compartir al volver del panel sin perder selección', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" initialSelectedIds={[]} onClose={() => {}} onReview={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' }));
    const share = screen.getByRole('button', { name: 'Generar enlaces' }); share.focus(); fireEvent.click(share);
    await screen.findByRole('button', { name: 'Generar 1 enlace' });
    fireEvent.click(screen.getByRole('button', { name: 'Volver a estudiantes' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar enlaces' })).toHaveFocus());
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeChecked();
  });
  it('129 solo ofrece publicación en lote con ambos permisos requeridos', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' });
    expect(screen.queryByRole('button', { name: 'Revisar y publicar notas' })).toBeNull();
    act(() => useAuth.setState({ user: { ...teacher, permissions: [...teacher.permissions!, 'grading.grade'] } }));
    expect(await screen.findByRole('button', { name: 'Revisar y publicar notas' })).toBeEnabled();
  });
});
