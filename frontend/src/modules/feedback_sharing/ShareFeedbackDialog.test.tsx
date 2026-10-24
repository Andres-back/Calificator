import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
beforeEach(() => {
  vi.resetAllMocks();
  useAuth.setState({ user: teacher });
  vi.mocked(getEvaluationReview).mockResolvedValue({ alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }, { estudiante_id: 'b', nombre: 'Luis Pérez', calificacion_id: null }], siguiente_cursor: null } as never);
  vi.mocked(teacherApi.previewFeedback).mockResolvedValue([{ calificacion_id: 'g1', elegible: true, fingerprint: 'f'.repeat(64), resultado: result }]);
  vi.mocked(teacherApi.listFeedbackAccesses).mockResolvedValue([]);
});
describe('devoluciones por evaluación', () => {
  it('una carga cancelada por StrictMode no deja un falso error', async () => {
    vi.mocked(getEvaluationReview).mockImplementation(async (_id, _params, signal) => {
      await Promise.resolve();
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      return { alumnos: [{ estudiante_id: 'a', nombre: 'Ana Pérez', calificacion_id: 'g1' }], siguiente_cursor: null } as never;
    });
    render(<StrictMode><ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} /></StrictMode>);
    await screen.findByText(result.retroalimentacion);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('reúne el grupo, conserva texto y no genera enlaces al consultar', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    expect(await screen.findByText(result.retroalimentacion)).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.getByText(/Sin calificación todavía/)).toBeInTheDocument();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(getEvaluationReview).toHaveBeenCalledWith('e1', expect.objectContaining({ limit: 100 }), expect.any(AbortSignal));
  });
  it('crea solo seleccionados con tres días y evidencia desactivada', async () => {
    vi.mocked(teacherApi.issueFeedbackAccesses).mockResolvedValue([{ calificacion_id: 'g1', id: 'access', estado: 'active', version: 1, expires_at: '2099-01-04T00:00:00Z', url: 'https://example.test/devolucion#' + 'a'.repeat(43), credential_available: true }]);
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    fireEvent.click(screen.getByText('Enlaces individuales'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear enlaces seleccionados' }));
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
    expect(await screen.findByText(result.retroalimentacion)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preparar impresión' })).toBeDisabled();
    expect(screen.getByText('Primero revisa y confirma la nota.')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Revisar devolución de Ana Pérez' }));
    expect(await screen.findByText(/Solo nota y retroalimentación/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar devolución' }));
    await waitFor(() => expect(teacherApi.approveFeedbackReview).toHaveBeenCalledWith('e1', expect.objectContaining({ calificacion_id: 'g1', scope: 'summary' }), expect.any(AbortSignal)));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preparar impresión' })).toBeEnabled());
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).toBeChecked();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
  });
  it('limpia el contenido al perder la sesión', async () => {
    const { rerender } = render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
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
    await screen.findByText(result.retroalimentacion);
    fireEvent.click(screen.getByRole('button', { name: 'Todos con nota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preparar impresión' }));
    expect(screen.getByText(/1 devoluciones seleccionadas necesitan revisión/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregar solo 1 lista' })).toBeInTheDocument();
    expect(teacherApi.prepareFeedbackPrint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('checkbox', { name: 'Seleccionar Luis Pérez' })).toBeChecked();
  });
  it('actualizar conserva la selección y no emite ni imprime por su cuenta', async () => {
    render(<ShareFeedbackDialog evaluationId="e1" onClose={() => {}} onReview={() => {}} />);
    await screen.findByText(result.retroalimentacion);
    fireEvent.click(screen.getByRole('button', { name: 'Ninguno' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar estudiantes y devoluciones' }));
    await waitFor(() => expect(teacherApi.previewFeedback).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('checkbox', { name: 'Seleccionar Ana Pérez' })).not.toBeChecked();
    expect(teacherApi.issueFeedbackAccesses).not.toHaveBeenCalled();
    expect(teacherApi.prepareFeedbackPrint).not.toHaveBeenCalled();
  });
});
