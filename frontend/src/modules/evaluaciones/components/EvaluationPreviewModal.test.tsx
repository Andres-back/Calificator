import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { EvaluationPreviewModal } from './EvaluationPreviewModal';
import type { Evaluacion } from '@/types/api';

const mocks = vi.hoisted(() => ({ document: vi.fn(), revoke: vi.fn(), create: vi.fn() }));
vi.mock('../api', () => ({ getEvaluationDocument: mocks.document }));
vi.mock('./EvaluationPdfViewer', () => ({ default: ({ blob }: { blob: Blob }) => (
  <section title="Formato final de la evaluación" data-document-type={blob.type}>Documento renderizado</section>
) }));
const evaluation: Evaluacion = {
  id: 'evaluation-1', materia_id: 'subject', nombre: 'Operaciones', profesor_id: 'teacher',
  descripcion: null, tipo_origen: 'nativa', modalidad: 'fisica', nota_maxima: 5,
  estado: 'borrador', tiempo_limite_minutos: null, fecha_publicacion: null,
  fecha_limite_entrega: null, dba_ids: [], dba_personalizado_ids: [], metas_profesor: [],
  criterios: [], preguntas: [{ enunciado: '3 × 4' }], respuestas_esperadas: [],
  created_at: '2026-10-04T00:00:00Z', updated_at: '2026-10-04T00:00:00Z',
};

function httpError(detail: string) {
  return Object.assign(new AxiosError(detail), { response: { status: 422, data: { detail } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.document.mockResolvedValue(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  mocks.create.mockReturnValue('blob:document');
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: mocks.create, revokeObjectURL: mocks.revoke }));
});

describe('EvaluationPreviewModal', () => {
  it('loads final document without answers by default, no editing, and cleans up on close', async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    const view = render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions onClose={close} />);
    expect(await screen.findByTitle('Formato final de la evaluación')).toHaveAttribute('data-document-type', 'application/pdf');
    expect(document.querySelector('iframe')).toBeNull();
    expect(mocks.document).toHaveBeenCalledWith(evaluation.id, 'pdf', false, expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(mocks.revoke).toHaveBeenCalledWith('blob:document');
  });

  it('selects the saved solution version explicitly and resets it for another evaluation', async () => {
    const user = userEvent.setup();
    const view = render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions onClose={vi.fn()} />);
    await screen.findByTitle('Formato final de la evaluación');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Versión del documento' }), 'solutions');
    await waitFor(() => expect(mocks.document).toHaveBeenCalledWith(evaluation.id, 'pdf', true, expect.any(AbortSignal)));
    view.rerender(<EvaluationPreviewModal evaluation={{ ...evaluation, id: 'evaluation-2' }} canViewSolutions onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('student'));
    expect(mocks.document).toHaveBeenLastCalledWith('evaluation-2', 'pdf', false, expect.any(AbortSignal));
  });

  it('does not expose a solution control without permission', async () => {
    render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions={false} onClose={vi.fn()} />);
    await screen.findByTitle('Formato final de la evaluación');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(mocks.document).toHaveBeenCalledWith(evaluation.id, 'pdf', false, expect.any(AbortSignal));
  });

  it('shows a failed preview and permits retry without opening the editor', async () => {
    mocks.document.mockRejectedValueOnce(httpError('Aún no tiene preguntas'));
    const user = userEvent.setup();
    render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions onClose={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Aún no tiene preguntas');
    await user.click(screen.getByRole('button', { name: 'Volver a intentar' }));
    await screen.findByTitle('Formato final de la evaluación');
    expect(mocks.document).toHaveBeenCalledTimes(2);
  });

  it('reports Word errors separately while keeping the PDF visible and retryable', async () => {
    const user = userEvent.setup();
    render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions onClose={vi.fn()} />);
    await screen.findByTitle('Formato final de la evaluación');
    mocks.document.mockRejectedValueOnce(httpError('Conserva este material en PDF'));
    await user.click(screen.getByRole('button', { name: 'Descargar Word' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Conserva este material en PDF');
    expect(screen.getByTitle('Formato final de la evaluación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar Word' })).toBeEnabled();
    expect(mocks.document).toHaveBeenCalledWith(evaluation.id, 'docx', false, expect.any(AbortSignal));
  });

  it('aborts a pending request when the preview is closed', () => {
    mocks.document.mockImplementation(() => new Promise(() => {}));
    const view = render(<EvaluationPreviewModal evaluation={evaluation} canViewSolutions onClose={vi.fn()} />);
    const signal = mocks.document.mock.calls[0][3] as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});
