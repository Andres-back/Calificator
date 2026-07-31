import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResolverEvaluacionPage } from './ResolverEvaluacionPage';

const mocks = vi.hoisted(() => ({
  getEvaluation: vi.fn(),
  createDelivery: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./api', () => ({
  getEvaluacion: mocks.getEvaluation,
  crearEntregaOnline: mocks.createDelivery,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
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
      <MemoryRouter initialEntries={['/app/evaluaciones/evaluation-1/resolver']}>
        <Routes>
          <Route
            path="/app/evaluaciones/:id/resolver"
            element={<ResolverEvaluacionPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getEvaluation.mockResolvedValue({
    id: 'evaluation-1',
    materia_id: 'materia-1',
    profesor_id: 'teacher-1',
    nombre: 'Evaluación online',
    descripcion: 'Responde mostrando el procedimiento.',
    tipo_origen: 'nativa',
    modalidad: 'online',
    nota_maxima: 5,
    estado: 'publicada',
    tiempo_limite_minutos: null,
    fecha_publicacion: '2026-07-30T00:00:00Z',
    dba_ids: [],
    dba_personalizado_ids: [],
    metas_profesor: [],
    criterios: [],
    preguntas: [{ numero: 1, enunciado: 'Explica tu procedimiento.' }],
    respuestas_esperadas: [],
    created_at: '2026-07-30T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
  });
  mocks.createDelivery.mockResolvedValue({
    id: 'delivery-1',
    evaluacion_id: 'evaluation-1',
    estudiante_id: 'student-1',
    materia_id: 'materia-1',
    tipo: 'online',
    estado: 'requiere_reintento',
    respuesta_texto: 'P1: Mi procedimiento se conserva.',
    archivo_url: null,
    created_at: '2026-07-30T00:00:00Z',
  });
});

describe('ResolverEvaluacionPage', () => {
  it('tells the student their answer was saved when AI analysis fails', async () => {
    const user = userEvent.setup();
    renderPage();

    const answer = await screen.findByPlaceholderText(/P1:/i);
    await user.type(answer, 'P1: Mi procedimiento se conserva.');
    await user.click(screen.getByRole('button', { name: /Enviar respuesta/i }));

    await waitFor(() => expect(mocks.createDelivery).toHaveBeenCalledTimes(1));
    expect(mocks.createDelivery).toHaveBeenCalledWith('evaluation-1', {
      respuesta_texto: 'P1: Mi procedimiento se conserva.',
    });
    expect(await screen.findByText('La entrega está segura')).toBeInTheDocument();
    expect(
      screen.getByText(/Tu respuesta quedó guardada, pero la IA no pudo analizarla/i),
    ).toBeInTheDocument();
    expect(screen.queryByText('Entrega enviada')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar respuesta/i })).toBeEnabled();
  });

  it('shows only online questions and waits for the physical section in mixed mode', async () => {
    mocks.getEvaluation.mockResolvedValue({
      id: 'evaluation-1',
      materia_id: 'materia-1',
      profesor_id: 'teacher-1',
      nombre: 'Evaluación mixta',
      descripcion: 'Combina plataforma y papel.',
      tipo_origen: 'nativa',
      modalidad: 'mixta',
      nota_maxima: 5,
      estado: 'publicada',
      tiempo_limite_minutos: null,
      fecha_publicacion: '2026-07-30T00:00:00Z',
      dba_ids: [],
      dba_personalizado_ids: [],
      metas_profesor: [],
      criterios: [],
      preguntas: [
        { numero: 1, enunciado: 'Respuesta desde la plataforma.', modalidad_respuesta: 'online' },
        { numero: 2, enunciado: 'Dibujo que se entrega en papel.', modalidad_respuesta: 'fisica' },
      ],
      respuestas_esperadas: [],
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:00:00Z',
    });
    mocks.createDelivery.mockResolvedValue({
      id: 'delivery-1',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'mixta',
      estado: 'recibida',
      respuesta_texto: 'P1: respuesta online.',
      archivo_url: null,
      created_at: '2026-07-30T00:00:00Z',
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Respuesta desde la plataforma.')).toBeInTheDocument();
    expect(screen.queryByText('Dibujo que se entrega en papel.')).not.toBeInTheDocument();
    expect(screen.getByText(/Las otras 1 se entregan en papel o archivo/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/P1:/i), 'P1: respuesta online.');
    await user.click(screen.getByRole('button', { name: /Enviar respuesta/i }));

    expect(await screen.findByText('Parte online guardada')).toBeInTheDocument();
    expect(screen.getByText(/Ahora entrega la parte física/i)).toBeInTheDocument();
    expect(screen.queryByText(/docente confirmará la calificación/i)).not.toBeInTheDocument();
  });});
