import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResolverEvaluacionPage } from './ResolverEvaluacionPage';

const mocks = vi.hoisted(() => ({
  getEvaluation: vi.fn(),
  getMyDelivery: vi.fn(),
  createDelivery: vi.fn(),
  createFileDelivery: vi.fn(),
  getStudentActivity: vi.fn(),
  getMyReviewRequest: vi.fn(),
  requestReview: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./api', () => ({
  getEvaluacion: mocks.getEvaluation,
  getMiEntrega: mocks.getMyDelivery,
  crearEntregaOnline: mocks.createDelivery,
  crearEntregaArchivo: mocks.createFileDelivery,
  getActividadEstudiante: mocks.getStudentActivity,
  getMiSolicitudRevision: mocks.getMyReviewRequest,
  solicitarRevisionEvaluacion: mocks.requestReview,
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
  mocks.getMyDelivery.mockResolvedValue(null);
  mocks.getStudentActivity.mockResolvedValue(null);
  mocks.getMyReviewRequest.mockResolvedValue(null);
  mocks.requestReview.mockResolvedValue({
    id: 'review-1',
    calificacion_id: 'grade-1',
    tipo: 'solicitud_revision',
    descripcion: 'La pregunta 1 debería revisarse.',
    estado: 'abierta',
    metadata_json: { motivo: 'respuesta', origen: 'estudiante' },
    resolucion: null,
    resuelto_por: null,
    resolved_at: null,
    created_at: '2026-08-08T00:00:00Z',
    updated_at: '2026-08-08T00:00:00Z',
  });
});

describe('ResolverEvaluacionPage', () => {
  it('tells the student their answer was saved when AI analysis fails', async () => {
    const user = userEvent.setup();
    renderPage();

    const answer = await screen.findByLabelText(/Respuesta 1/i);
    await user.type(answer, 'Mi procedimiento se conserva.');
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

    await user.type(screen.getByLabelText(/Respuesta 1/i), 'respuesta online.');
    await user.click(screen.getByRole('button', { name: /Enviar respuesta/i }));

    expect(await screen.findByText('Parte online guardada')).toBeInTheDocument();
    expect(screen.getByText(/Ahora entrega la parte física/i)).toBeInTheDocument();
    expect(screen.queryByText(/docente confirmará la calificación/i)).not.toBeInTheDocument();
  });

  it('never exposes the online form for a physical evaluation', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      modalidad: 'fisica',
      recepcion_habilitada: true,
    });

    renderPage();

    expect(await screen.findByText(/sube una foto clara o un PDF/i)).toBeInTheDocument();
    expect(screen.getByText('Foto o PDF de tu trabajo')).toBeInTheDocument();
    expect(screen.queryByText('Tus respuestas')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Enviar respuesta/i }),
    ).not.toBeInTheDocument();
  });

  it('lets a graded student request a teacher review', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      entrega_realizada: true,
      mi_nota_confirmada: 3.5,
      mi_calificacion_estado: 'publicada',
    });
    mocks.getMyDelivery.mockResolvedValue({
      id: 'delivery-1',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'online',
      estado: 'revisada',
      respuesta_texto: 'P1: Mi procedimiento.',
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Solicitar revisión' }));
    await user.selectOptions(screen.getByLabelText(/Qué deseas que revisen/i), 'respuesta');
    await user.type(screen.getByLabelText(/Explica lo que encontraste/i), 'La pregunta 1 tiene un procedimiento que considero correcto.');
    await user.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => {
      expect(mocks.requestReview).toHaveBeenCalledWith('evaluation-1', {
        motivo: 'respuesta',
        descripcion: 'La pregunta 1 tiene un procedimiento que considero correcto.',
      });
    });
    expect(mocks.success).toHaveBeenCalledWith('Solicitud de revisión enviada al docente.');
  });
});
