import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XaliPage } from './XaliPage';

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
  sendMessage: vi.fn(),
  clearHistory: vi.fn(),
  listEvaluations: vi.fn(),
  sendEvaluationMessage: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('./api', () => ({
  getHistory: mocks.getHistory,
  sendMessage: mocks.sendMessage,
  clearHistory: mocks.clearHistory,
  listEvaluacionesEntregadas: mocks.listEvaluations,
  sendEvaluationMessage: mocks.sendEvaluationMessage,
}));
vi.mock('@/modules/materias/MateriaSelect', () => ({
  useMaterias: () => ({ data: [] }),
}));
vi.mock('@/stores/auth', () => ({
  useAuth: () => ({
    user: { id: 'student-1', nombre: 'Ana', rol: 'estudiante' },
  }),
}));
vi.mock('./components/XaliAvatar', () => ({
  XaliAvatar: () => <span aria-hidden="true">Xali</span>,
}));
vi.mock('react-hot-toast', () => ({
  default: { error: mocks.error, success: mocks.success },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <XaliPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getHistory.mockResolvedValue([]);
  mocks.listEvaluations.mockResolvedValue([]);
  mocks.sendEvaluationMessage.mockResolvedValue({
    respuesta: 'Revisa el paso donde elegiste la operación.',
    contexto_usado: {
      evaluacion_entregada: true,
      calificacion_confirmada: true,
    },
  });
});

describe('XaliPage student policy', () => {
  it('does not offer general chat without a teacher-confirmed evaluation', async () => {
    renderPage();

    expect(
      await screen.findByText(/Xali estará disponible cuando tu docente confirme/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Chat general/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mensaje para Xali')).toBeDisabled();
    expect(mocks.getHistory).not.toHaveBeenCalled();
  });

  it('sends student questions only through confirmed evaluation context', async () => {
    mocks.listEvaluations.mockResolvedValue([
      {
        evaluacion_id: 'evaluation-1',
        materia_id: 'materia-1',
        materia_nombre: 'Matemáticas',
        evaluacion_nombre: 'Multiplicación',
        entrega_id: 'delivery-1',
        estado_calificacion: 'confirmada',
        nota_confirmada: 4.5,
        puede_chatear: true,
      },
    ]);
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText('Mensaje para Xali');
    await waitFor(() => expect(input).toBeEnabled());
    await user.type(input, '¿En qué paso me equivoqué?');
    await user.click(screen.getByRole('button', { name: 'Enviar mensaje a Xali' }));

    await waitFor(() => {
      expect(mocks.sendEvaluationMessage).toHaveBeenCalledWith(
        'evaluation-1',
        '¿En qué paso me equivoqué?',
      );
    });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
});
