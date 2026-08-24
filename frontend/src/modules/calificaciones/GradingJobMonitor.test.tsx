import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPendingGrading,
  readPendingGradings,
} from './gradingJobs';
import { GradingJobMonitor } from './GradingJobMonitor';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  invalidateQueries: vi.fn(),
  custom: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('@/lib/api', () => ({ api: { get: mocks.get } }));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('react-hot-toast', () => ({
  default: {
    custom: mocks.custom,
    error: mocks.error,
    dismiss: mocks.dismiss,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('GradingJobMonitor', () => {
  it('keeps a slow OpenCode request visible and explicitly active', async () => {
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

    expect(await screen.findByText(/OpenCode sigue procesando/)).toHaveTextContent(
      'No cancelamos la solicitud',
    );
    expect(screen.getByText('Estudiante Demo')).toBeInTheDocument();
  });
});