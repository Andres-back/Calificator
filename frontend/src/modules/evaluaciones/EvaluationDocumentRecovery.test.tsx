import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { documentEvaluation } from '@/test/fixtures/documentEvaluation';
import { useAuth } from '@/stores/auth';
import { EvaluationDocumentRecovery } from './EvaluationDocumentRecovery';

const mocks = vi.hoisted(() => ({ read: vi.fn(), copy: vi.fn() }));
vi.mock('./api', () => ({ getDocumentRecovery: mocks.read }));
vi.mock('./EvaluationCopyDialog', () => ({ EvaluationCopyDialog: (props: unknown) => { mocks.copy(props); return <p>Confirmación de copia independiente</p>; } }));
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', rol: 'profesor', permissions: ['evaluations.read', 'evaluations.create', 'evaluations.update'] } as never });
  const evaluation = documentEvaluation();
  const document = structuredClone(evaluation.estructura_documento!);
  document.revision!.confirmado = false; document.revision!.estado = 'requiere_revision';
  mocks.read.mockResolvedValue({ disponible: true, fuentes: [], source_job_id: 'source', source_fingerprint: 'a'.repeat(64),
    texto: 'Transcripción educativa completa', documento: document, preguntas: evaluation.preguntas, original_disponible: false,
    mensaje: 'Solo recuperamos el texto. Comprueba las figuras.', expected_updated_at: evaluation.updated_at, expected_content_version_id: evaluation.contenido_version_id });
});

it('requires explicit source review and preserves the original by proceeding only to a copy', async () => {
  render(<EvaluationDocumentRecovery evaluation={{ ...documentEvaluation(), profesor_id: 'teacher' }} onClose={vi.fn()} />);
  expect(await screen.findByText('Transcripción educativa completa')).toBeInTheDocument();
  expect(screen.getByText(/No conservamos el archivo original/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continuar con la copia revisada' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/Comparé las secciones/));
  fireEvent.click(screen.getByRole('button', { name: 'Continuar con la copia revisada' }));
  expect(screen.getByText('Confirmación de copia independiente')).toBeInTheDocument();
  const props = mocks.copy.mock.lastCall?.[0];
  expect(props.recoveryDocument.source_fingerprint).toBe('a'.repeat(64));
  expect(props.recoveryDocument.documento.revision.confirmado).toBe(true);
});

it('does not request source content for a student or a teacher without update permission', () => {
  useAuth.setState({ user: { id: 'teacher', rol: 'estudiante', permissions: ['evaluations.read'] } as never });
  render(<EvaluationDocumentRecovery evaluation={documentEvaluation()} onClose={vi.fn()} />);
  expect(mocks.read).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
