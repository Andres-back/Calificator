import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DigitalizarEvaluacionModal } from './DigitalizarEvaluacionModal';
import { readPendingDigitalizations } from '@/modules/evaluaciones/digitalizationJobs';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: { post: mocks.post },
  toApiError: (error: unknown) => ({ detail: String(error) }),
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));

function renderModal(onCompleted = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <DigitalizarEvaluacionModal
        open
        materiaId="materia-1"
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />
    </QueryClientProvider>,
  );
  return { ...view, onCompleted };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.post.mockResolvedValue({
    data: {
      job_id: 'job-1',
      estado: 'queued',
      materia_id: 'materia-1',
      nombre: 'Prueba multiplicación',
    },
  });
});

describe('DigitalizarEvaluacionModal', () => {
  it('queues FormData, persists the job and lets the teacher continue navigating', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const file = new File(['%PDF-1.7'], 'prueba.pdf', { type: 'application/pdf' });
    await user.upload(fileInput as HTMLInputElement, file);
    await user.clear(screen.getByLabelText(/Nombre de la evaluación/i));
    await user.type(
      screen.getByLabelText(/Nombre de la evaluación/i),
      'Prueba multiplicación',
    );
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith(
      '/evaluaciones/externa/digitalizar-con-archivo',
      expect.any(FormData),
    );
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.get('materia_id')).toBe('materia-1');
    expect(form.get('nota_maxima')).toBe('5');
    expect(form.get('modalidad')).toBe('fisica');
    expect(form.get('file')).toBe(file);

    expect(
      await screen.findByRole('heading', {
        name: 'Estamos trabajando en tu documento',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Puedes continuar navegando; te avisaremos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continuar navegando' }),
    ).toBeEnabled();
    expect(readPendingDigitalizations()).toEqual([
      expect.objectContaining({
        jobId: 'job-1',
        materiaId: 'materia-1',
        nombre: 'Prueba multiplicación',
      }),
    ]);
  });
});