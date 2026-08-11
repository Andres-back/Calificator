import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  addPendingDigitalization,
  readPendingDigitalizations,
} from '@/modules/evaluaciones/digitalizationJobs';
import { DigitalizationJobMonitor } from './DigitalizationJobMonitor';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  invalidateQueries: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { get: mocks.get },
}));
vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: mocks.success,
    error: mocks.error,
  },
}));
vi.mock('./DocumentProcessingAnimation', () => ({
  DocumentProcessingAnimation: () => <div aria-label="Procesando documento" />,
}));

function queueJob() {
  addPendingDigitalization({
    jobId: 'job-1',
    materiaId: 'materia-1',
    nombre: 'Taller de decimales',
  });
}

function renderMonitor() {
  return render(
    <MemoryRouter>
      <DigitalizationJobMonitor />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe('DigitalizationJobMonitor', () => {
  it('keeps a failed job visible with its error and retry action', async () => {
    queueJob();
    mocks.get.mockResolvedValue({
      data: {
        id: 'job-1',
        estado: 'failed',
        progreso: 100,
        resultado_json: {},
        error: '502: OpenCode no pudo analizar el archivo.',
      },
    });

    renderMonitor();

    expect(
      await screen.findByText('No se pudo completar la digitalización'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('OpenCode no pudo analizar el archivo.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Intentar de nuevo' }),
    ).toBeEnabled();

    const [stored] = readPendingDigitalizations();
    expect(stored).toMatchObject({
      jobId: 'job-1',
      status: 'failed',
      progress: 100,
      error: 'OpenCode no pudo analizar el archivo.',
    });
  });

  it('persists a successful result until the teacher reviews or dismisses it', async () => {
    queueJob();
    mocks.get.mockResolvedValue({
      data: {
        id: 'job-1',
        estado: 'success',
        progreso: 100,
        resultado_json: {
          evaluacion_id: 'evaluation-1',
          preguntas_count: 12,
        },
        error: null,
      },
    });

    renderMonitor();

    expect(
      await screen.findByText('Evaluación lista para revisar'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Se detectaron 12 preguntas/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Revisar borrador' }),
    ).toBeEnabled();

    await waitFor(() => {
      expect(readPendingDigitalizations()[0]).toMatchObject({
        status: 'success',
        evaluationId: 'evaluation-1',
        questionsCount: 12,
      });
    });
  });
});