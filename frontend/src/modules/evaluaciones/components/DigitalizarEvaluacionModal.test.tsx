import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DigitalizarEvaluacionModal } from './DigitalizarEvaluacionModal';

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
  mocks.post.mockResolvedValue({
    data: {
      evaluacion: {
        id: 'evaluation-1',
        nombre: 'Prueba multiplicación',
        materia_id: 'materia-1',
        estado: 'borrador',
        tipo_origen: 'digitalizada',
        nota_maxima: 5,
        preguntas_count: 1,
        respuestas_count: 1,
        clave_completa: true,
      },
      estructura_detectada: {
        preguntas: [
          {
            numero: 1,
            tipo: 'opcion_multiple',
            enunciado: '¿Cuánto es 4 por 9?',
            opciones: ['A) 32', 'B) 36'],
            puntaje: '5.00',
          },
        ],
        respuestas_esperadas: [{ numero: 1, respuesta: 'B) 36' }],
        criterios: [],
        errores_comunes: [],
        reglas_feedback: {},
        clave_completa: true,
        advertencias: ['Los puntajes visibles fueron escalados a 5.'],
        nota_maxima: '5',
      },
    },
  });
});

describe('DigitalizarEvaluacionModal', () => {
  it('uploads FormData without overriding the multipart boundary and shows the draft key', async () => {
    const user = userEvent.setup();
    const { container } = renderModal();
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const file = new File(['%PDF-1.7'], 'prueba.pdf', { type: 'application/pdf' });
    await user.upload(fileInput as HTMLInputElement, file);
    await user.clear(screen.getByLabelText(/Nombre de la evaluación/i));
    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Prueba multiplicación');
    await user.click(screen.getByRole('button', { name: 'Digitalizar' }));

    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(1));
    expect(mocks.post).toHaveBeenCalledWith(
      '/evaluaciones/externa/digitalizar-con-archivo',
      expect.any(FormData),
    );
    const form = mocks.post.mock.calls[0][1] as FormData;
    expect(form.get('materia_id')).toBe('materia-1');
    expect(form.get('nota_maxima')).toBe('5');
    expect(form.get('file')).toBe(file);

    expect(await screen.findByText('Borrador creado. La IA sugiere; revisa la clave antes de publicar.')).toBeInTheDocument();
    expect(screen.getAllByText('B) 36')).toHaveLength(2);
    expect(screen.getByText('Los puntajes visibles fueron escalados a 5.')).toBeInTheDocument();
  });
});