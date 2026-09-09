import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPendingGrading,
  readPendingGradings,
} from './gradingJobs';
import { GradingJobMonitor } from './GradingJobMonitor';
import { calificarLoteAsincrono } from './api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  invalidateQueries: vi.fn(),
  custom: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: { get: mocks.get, post: mocks.post } }));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('react-hot-toast', () => ({
  default: {
    custom: mocks.custom,
    error: mocks.error,
    dismiss: mocks.dismiss,
    success: mocks.success,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('GradingJobMonitor', () => {
  it('sends one ordered student id per batch evidence', async () => {
    mocks.post.mockResolvedValue({ data: {
      job_id: 'parent-job', estado: 'queued', entrega_ids: ['delivery-1', 'delivery-2'],
      total: 2, summary_url: '/api/jobs/parent-job',
    } });
    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.png', { type: 'image/png' });

    await calificarLoteAsincrono('evaluation-1', [
      { estudianteId: 'student-1', file: first },
      { estudianteId: 'student-2', file: second },
    ]);

    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(mocks.post).toHaveBeenCalledWith('/calificaciones/lote/asincrono', expect.any(FormData));
    expect(JSON.parse(String(form.get('estudiantes')))).toEqual(['student-1', 'student-2']);
    expect(form.getAll('files')).toEqual([first, second]);
  });

  it('keeps slow work visible without inventing provider activity', async () => {
    addPendingGrading({
      jobId: 'job-grade-1',
      evaluacionId: 'evaluation-1',
      materiaId: 'subject-1',
      estudianteId: 'student-1',
      estudianteNombre: 'Estudiante Demo',
    });
    const [stored] = readPendingGradings();
    window.localStorage.setItem(
      'xcalificator.pending-gradings.v1',
      JSON.stringify([{
        ...stored,
        createdAt: new Date(Date.now() - 100_000).toISOString(),
      }]),
    );
    mocks.get.mockResolvedValue({
      data: {
        id: 'job-grade-1',
        estado: 'running',
        progreso: 20,
        error: null,
      },
    });

    render(
      <MemoryRouter>
        <GradingJobMonitor />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/El trabajo sigue pendiente/)).toHaveTextContent(
      'Tu evidencia está guardada',
    );
    expect(screen.getByText('Estudiante Demo')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/jobs/pendientes');
  });

  it.each(['requires_review', 'failed_permanent'])('stops the monitor on %s and preserves a recovery notice', async (estado) => {
    addPendingGrading({
      jobId: 'failed-job', evaluacionId: 'evaluation-1', materiaId: 'subject-1',
      estudianteId: 'student-1', estudianteNombre: 'Estudiante',
    });
    mocks.get.mockResolvedValue({ data: { id: 'failed-job', estado, progreso: 100, error: null } });
    render(<MemoryRouter><GradingJobMonitor /></MemoryRouter>);
    await waitFor(() => expect(readPendingGradings()).toHaveLength(0));
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('La evidencia quedó guardada'), expect.any(Object));
  });

  it('polls a batch parent once and shows aggregate counts', async () => {
    addPendingGrading({
      jobId: 'parent-job', evaluacionId: 'evaluation-1', materiaId: 'subject-1',
      estudianteId: '', estudianteNombre: 'Lote de 30 estudiantes', kind: 'batch', total: 30,
    });
    mocks.get.mockResolvedValue({ data: {
      id: 'parent-job', estado: 'running', progreso: 50, error: null,
      summary: { total: 30, queued: 8, running: 4, retrying: 1, success: 14, requires_review: 2, failed_permanent: 1, cancelled: 0 },
    } });
    render(<MemoryRouter><GradingJobMonitor /></MemoryRouter>);
    expect(await screen.findByText('14 listas · 13 en curso · 3 por revisar')).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith('/jobs/pendientes');
    expect(mocks.get).toHaveBeenCalledWith('/jobs/parent-job');
  });

  it('recovers an active grading monitor from the server after local storage is lost', async () => {
    mocks.get.mockImplementation((url: string) => {
      if (url === '/jobs/pendientes') {
        return Promise.resolve({ data: { items: [{
          job_id: 'recovered-job', evaluacion_id: 'evaluation-2', materia_id: 'subject-2',
          estudiante_id: 'student-2', estudiante_nombre: 'Ana Recuperada', kind: 'individual',
          total: 1, estado: 'running', progreso: 35, stage: 'vision',
          created_at: new Date().toISOString(),
        }] } });
      }
      return Promise.resolve({ data: {
        id: 'recovered-job', estado: 'running', progreso: 35, error: null,
      } });
    });

    render(<MemoryRouter><GradingJobMonitor /></MemoryRouter>);

    expect(await screen.findByText('Ana Recuperada')).toBeInTheDocument();
    expect(readPendingGradings()[0]).toMatchObject({
      jobId: 'recovered-job', evaluacionId: 'evaluation-2', materiaId: 'subject-2',
    });
  });

  it('keeps a completed batch with failures visible and retries only the selected child', async () => {
    addPendingGrading({
      jobId: 'parent-attention', evaluacionId: 'evaluation-1', materiaId: 'subject-1',
      estudianteId: '', estudianteNombre: 'Lote de 2 estudiantes', kind: 'batch', total: 2,
    });
    let retried = false;
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/items')) {
        return Promise.resolve({ data: { items: [
          { job_id: 'child-ok', entrega_id: 'delivery-1', estudiante_id: 'student-ok', estado: 'success', stage: 'completed', progreso: 100, attempt_count: 1, error_code: null },
          { job_id: 'child-failed', entrega_id: 'delivery-2', estudiante_id: 'student-failed', estado: 'failed_permanent', stage: 'requires_review', progreso: 100, attempt_count: 3, error_code: 'provider_error' },
        ], total: 2, limit: 30, offset: 0 } });
      }
      if (retried) {
        return Promise.resolve({ data: {
          id: 'parent-attention', estado: 'running', progreso: 50, error: null,
          summary: { total: 2, queued: 0, running: 0, retrying: 1, success: 1, requires_review: 0, failed_permanent: 0, cancelled: 0 },
        } });
      }
      return Promise.resolve({ data: {
        id: 'parent-attention', estado: 'success', progreso: 100, error: null,
        summary: { total: 2, queued: 0, running: 0, retrying: 0, success: 1, requires_review: 0, failed_permanent: 1, cancelled: 0 },
      } });
    });
    mocks.post.mockImplementation(() => {
      retried = true;
      return Promise.resolve({ data: { requested: 1, enqueued: 1, skipped: 0 } });
    });

    render(<MemoryRouter><GradingJobMonitor /></MemoryRouter>);

    expect(await screen.findByText('Lote terminado con casos por revisar')).toBeInTheDocument();
    expect(readPendingGradings()[0]).toMatchObject({ completed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Ver casos' }));
    const retry = await screen.findByRole('button', { name: 'Reintentar' });
    fireEvent.click(retry);

    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
      '/jobs/parent-attention/reintentar',
      { job_ids: ['child-failed'] },
    ));
    expect(readPendingGradings()[0]).toMatchObject({ completed: false });
    expect(mocks.success).toHaveBeenCalledWith(expect.stringContaining('sin repetir'));
  });
});
