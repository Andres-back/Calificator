import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
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
  getMyBreakdown: vi.fn(),
  requestReview: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('./api', () => ({
  evaluationPdfUrl: (id: string, descargar = false) => '/api/evaluaciones/' + id + '/pdf' + (descargar ? '?descargar=true' : ''),
  getEvaluacion: mocks.getEvaluation,
  getMiEntrega: mocks.getMyDelivery,
  crearEntregaOnline: mocks.createDelivery,
  crearEntregaArchivo: mocks.createFileDelivery,
  getActividadEstudiante: mocks.getStudentActivity,
  getMiSolicitudRevision: mocks.getMyReviewRequest,
  getMiDesglose: mocks.getMyBreakdown,
  solicitarRevisionEvaluacion: mocks.requestReview,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
vi.mock('@/modules/calificaciones/student-feedback/XaliFeedbackStory', () => ({
  XaliFeedbackStory: ({ breakdown }: { breakdown: { calificacion_id: string } }) => (
    <section aria-label="Historia de tu retroalimentación">Historia Xali para {breakdown.calificacion_id}</section>
  ),
}));

function renderPage(entry = '/app/evaluaciones/evaluation-1/resolver') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
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
  sessionStorage.clear();
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
  mocks.getMyBreakdown.mockResolvedValue(null);
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
  it('scrolls to the result after a slower delivery lookup finishes', async () => {
    mocks.getEvaluation.mockResolvedValue({ ...await mocks.getEvaluation(), mi_nota_confirmada: 4 });
    let finishDelivery!: (value: null) => void;
    mocks.getMyDelivery.mockReturnValue(new Promise(resolve => { finishDelivery = resolve; }));
    const scroll = vi.fn();
    const originalLookup = document.getElementById.bind(document);
    const lookup = vi.spyOn(document, 'getElementById').mockImplementation(id => {
      const element = originalLookup(id);
      if (element && id === 'mi-resultado') Object.defineProperty(element, 'scrollIntoView', { configurable: true, value: scroll });
      return element;
    });
    try {
      renderPage('/app/evaluaciones/evaluation-1/resolver#mi-resultado');
      await waitFor(() => expect(mocks.getMyDelivery).toHaveBeenCalled());
      expect(scroll).not.toHaveBeenCalled();
      finishDelivery(null);
      await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' }));
    } finally {
      lookup.mockRestore();
    }
  });

  it('opens a published zero without a delivery and uses a neutral absent-detail message', async () => {
    mocks.getEvaluation.mockResolvedValue({ ...await mocks.getEvaluation(), mi_nota_confirmada: 0 });
    renderPage('/app/evaluaciones/evaluation-1/resolver#mi-resultado');
    expect(await screen.findByText('Detalle por respuesta no disponible')).toBeInTheDocument();
    expect(document.getElementById('mi-resultado')).toHaveTextContent('Tu nota es 0.0 de 5.0');
    expect(screen.queryByText('Detalle histórico')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tu respuesta')).not.toBeInTheDocument();
    expect(mocks.createDelivery).not.toHaveBeenCalled();
  });

  it('distinguishes a breakdown error and retries only the read', async () => {
    mocks.getEvaluation.mockResolvedValue({ ...await mocks.getEvaluation(), mi_nota_confirmada: 4 });
    mocks.getMyBreakdown.mockRejectedValueOnce(new AxiosError('Unavailable', undefined, undefined, undefined, { status: 500 } as never)).mockResolvedValue(null);
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole('heading', { name: 'No pudimos cargar la explicación de tu nota' })).toBeInTheDocument();
    expect(screen.queryByText('Detalle por respuesta no disponible')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Detalle por respuesta no disponible')).toBeInTheDocument();
    expect(mocks.getMyBreakdown).toHaveBeenCalledTimes(2);
    expect(mocks.createDelivery).not.toHaveBeenCalled();
    expect(mocks.createFileDelivery).not.toHaveBeenCalled();
    expect(mocks.requestReview).not.toHaveBeenCalled();
  });

  it('does not turn a forbidden breakdown into a historical result or retry control', async () => {
    mocks.getEvaluation.mockResolvedValue({ ...await mocks.getEvaluation(), mi_nota_confirmada: 4 });
    mocks.getMyBreakdown.mockRejectedValue(new AxiosError('Forbidden', undefined, undefined, undefined, { status: 403 } as never));
    renderPage();
    expect(await screen.findByRole('heading', { name: 'No tienes acceso a esta explicación' })).toBeInTheDocument();
    expect(screen.queryByText('Detalle histórico')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
    expect(mocks.createDelivery).not.toHaveBeenCalled();
  });

  it('confirms the saved delivery and does not ask the student to resend it', async () => {
    const user = userEvent.setup();
    renderPage();

    const answer = await screen.findByLabelText('Tu respuesta');
    await user.type(answer, 'Mi procedimiento se conserva.');
    await user.click(screen.getByRole('button', { name: /Revisar respuestas y entregar/i }));
    expect(mocks.createDelivery).not.toHaveBeenCalled();
    expect(screen.getByText('¿Entregar la evaluación?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sí, entregar ahora' }));

    await waitFor(() => expect(mocks.createDelivery).toHaveBeenCalledTimes(1));
    expect(mocks.createDelivery).toHaveBeenCalledWith('evaluation-1', {
      respuesta_texto: 'P1: Mi procedimiento se conserva.',
    });
    expect(await screen.findByText('Entrega recibida')).toBeInTheDocument();
    expect(screen.getByText(/no necesitas volver a enviarla/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar respuestas y entregar/i })).not.toBeInTheDocument();
    expect(mocks.success).toHaveBeenCalledWith(
      'Entrega realizada. Quedó pendiente de calificación docente.',
    );
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

    await user.type(screen.getByLabelText('Tu respuesta'), 'respuesta online.');
    await user.click(screen.getByRole('button', { name: /Revisar respuestas y entregar/i }));
    await user.click(screen.getByRole('button', { name: 'Sí, entregar ahora' }));

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
      screen.queryByRole('button', { name: /Revisar respuestas y entregar/i }),
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

  it('shows a motivating Xali story before the complete published breakdown', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      entrega_realizada: true,
      mi_nota_confirmada: 4,
      mi_calificacion_estado: 'publicada',
    });
    mocks.getMyDelivery.mockResolvedValue({
      id: 'delivery-1',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'online',
      estado: 'calificada',
      respuesta_texto: 'P1: Paso a paso',
      archivo_url: null,
      evidencia_paginas: 1,
      evidencia_tipo: 'texto',
      reemplazo_solicitado: false,
      created_at: '2026-09-19T00:00:00Z',
    });
    mocks.getMyBreakdown.mockResolvedValue({
      id: 'breakdown-1', calificacion_id: 'grade-1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: false, created_at: '2026-09-19T00:00:00Z',
      formula: { puntos_obtenidos: 4, puntos_posibles: 5, nota_maxima: 5, nota_base: 4, ajuste_global: 0, nota_antes_redondeo: 4, regla_redondeo: 'half_up', decimales: 1, nota_final: 4 },
      componentes: [{ id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Procedimiento', respuesta_estudiante: 'Paso a paso', respuesta_referencia: 'Paso a paso', puntos_obtenidos: 4, puntos_maximos: 5, estado: 'correcta', explicacion: 'Tu procedimiento está ordenado y sustentado.', origen: 'ia', requiere_revision: false, evidencia_paginas: [1] }],
    });

    renderPage();

    await waitFor(() => expect(mocks.getMyBreakdown).toHaveBeenCalledWith('evaluation-1'));
    expect(await screen.findByRole('region', { name: 'Historia de tu retroalimentación' })).toHaveTextContent('grade-1');
    expect(screen.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeInTheDocument();
  });

  it('muestra y permite descargar el material antes de subir una entrega física', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      modalidad: 'fisica',
      material_origen_id: 'material-1',
      tipo_actividad: 'sopa_letras',
      recepcion_habilitada: true,
    });
    mocks.getStudentActivity.mockResolvedValue({
      material_id: 'material-1',
      tipo: 'sopa_letras',
      titulo: 'Sopa de multiplicación',
      interactivo: true,
      contenido: {
        grilla: [['S', 'U', 'M', 'A'], ['R', 'E', 'S', 'T']],
        banco_palabras: ['SUMA', 'RESTA'],
      },
    });

    renderPage();

    expect(await screen.findByText('Material que debes resolver')).toBeInTheDocument();
    expect(screen.getByText('Sopa de multiplicación')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver material' })).toHaveAttribute(
      'href',
      '/app/recursos/material-1',
    );
    expect(screen.getByRole('link', { name: 'Descargar PDF' })).toHaveAttribute(
      'href',
      '/api/evaluaciones/evaluation-1/pdf?descargar=true',
    );
    expect(screen.getByText('Foto o PDF de tu trabajo')).toBeInTheDocument();
    expect(screen.queryByText('Tus respuestas')).not.toBeInTheDocument();
  });
  it('confirms a physical file immediately while grading continues in background', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      modalidad: 'fisica',
      recepcion_habilitada: true,
    });
    mocks.createFileDelivery.mockResolvedValue({
      id: 'delivery-photo-1',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'foto',
      estado: 'recibida',
      respuesta_texto: null,
      archivo_url: '/api/calificaciones/entregas/delivery-photo-1/evidencia',
      created_at: '2026-08-10T00:00:00Z',
    });
    const user = userEvent.setup();
    renderPage();

    const file = new File(['imagen'], 'taller.jpg', { type: 'image/jpeg' });
    await screen.findByRole('button', { name: /Elegir fotos o PDF/ });
    const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: 'Revisar y entregar 1 hoja' }));
    await user.click(screen.getByRole('button', { name: 'Entregar 1 hoja' }));

    await waitFor(() => expect(mocks.createFileDelivery).toHaveBeenCalledWith('evaluation-1', [file], [0]));
    expect(await screen.findByText('Calificando tu entrega')).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revisar y entregar 1 hoja' })).not.toBeInTheDocument();
    expect(mocks.success).toHaveBeenCalledWith(
      'Entrega realizada. Ya estamos calificándola en segundo plano.',
    );
  });
  it('allows resending the complete package when the teacher requests replacement', async () => {
    mocks.getEvaluation.mockResolvedValue({
      ...(await mocks.getEvaluation()),
      modalidad: 'fisica',
      preguntas: [{ numero: 1, enunciado: 'Resuelve en papel.' }],
    });
    mocks.getMyDelivery.mockResolvedValue({
      id: 'delivery-old',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'pdf',
      estado: 'requiere_reintento',
      respuesta_texto: null,
      archivo_url: '/api/calificaciones/entregas/delivery-old/evidencia',
      evidencia_paginas: 2,
      evidencia_tipo: 'fotos',
      reemplazo_solicitado: true,
      motivo_reemplazo: 'Falta la hoja donde termina el ejercicio 3.',
      created_at: '2026-08-10T00:00:00Z',
    });
    mocks.createFileDelivery.mockResolvedValue({
      id: 'delivery-old',
      evaluacion_id: 'evaluation-1',
      estudiante_id: 'student-1',
      materia_id: 'materia-1',
      tipo: 'pdf',
      estado: 'recibida',
      respuesta_texto: null,
      archivo_url: '/api/calificaciones/entregas/delivery-old/evidencia',
      evidencia_paginas: 2,
      evidencia_tipo: 'fotos',
      reemplazo_solicitado: false,
      created_at: '2026-08-11T00:00:00Z',
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('El docente solicitó reemplazar la entrega completa')).toBeInTheDocument();
    expect(screen.getByText(/Falta la hoja donde termina el ejercicio 3/)).toBeInTheDocument();
    const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
    const pages = [
      new File(['uno'], 'hoja-1.jpg', { type: 'image/jpeg', lastModified: 1 }),
      new File(['dos'], 'hoja-2.jpg', { type: 'image/jpeg', lastModified: 2 }),
    ];
    await user.upload(input, pages);
    await user.click(screen.getByRole('button', { name: 'Revisar y entregar 2 hojas' }));
    await user.click(screen.getByRole('button', { name: 'Entregar 2 hojas' }));

    await waitFor(() => expect(mocks.createFileDelivery).toHaveBeenCalledWith(
      'evaluation-1',
      pages,
      [0, 0],
    ));
  });
  it('restaura el borrador guardado al volver a la evaluación', async () => {
    sessionStorage.setItem(
      'xcalificator:evaluacion:draft:anonymous:evaluation-1',
      JSON.stringify({ 1: 'Procedimiento que aún no he entregado.' }),
    );

    renderPage();

    expect(await screen.findByLabelText('Tu respuesta')).toHaveValue(
      'Procedimiento que aún no he entregado.',
    );
    expect(screen.getByText('Borrador guardado en esta pestaña.')).toBeInTheDocument();
    expect(mocks.createDelivery).not.toHaveBeenCalled();
  });

  it('lleva al estudiante a la primera respuesta pendiente antes de entregar', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      preguntas: [
        { numero: 1, enunciado: 'Primera pregunta.' },
        { numero: 2, enunciado: 'Segunda pregunta.' },
      ],
    });
    const user = userEvent.setup();
    renderPage();

    const inputs = await screen.findAllByLabelText('Tu respuesta');
    await user.type(inputs[0], 'Esta es mi primera respuesta.');
    await user.click(screen.getByRole('button', { name: /Revisar respuestas y entregar/i }));

    expect(screen.getByText('Completa esta respuesta antes de entregar.')).toBeInTheDocument();
    expect(mocks.error).toHaveBeenCalledWith('Completa la respuesta pendiente.');
    expect(mocks.createDelivery).not.toHaveBeenCalled();
  });
  it('no duplica las preguntas debajo de una actividad interactiva', async () => {
    const currentEvaluation = await mocks.getEvaluation();
    mocks.getEvaluation.mockResolvedValue({
      ...currentEvaluation,
      modalidad: 'online',
      material_origen_id: 'material-interactivo',
      preguntas: [{ numero: 1, enunciado: 'Encuentra las palabras.' }],
    });
    mocks.getStudentActivity.mockResolvedValue({
      material_id: 'material-interactivo',
      tipo: 'sopa_letras',
      titulo: 'Sopa de operaciones',
      interactivo: true,
      contenido: {
        grilla: [['S', 'U', 'M', 'A'], ['R', 'E', 'S', 'T']],
        banco_palabras: ['SUMA', 'RESTA'],
      },
    });

    renderPage();

    expect(await screen.findByText('Sopa de operaciones')).toBeInTheDocument();
    expect(screen.getByText('Entrega tu actividad interactiva')).toBeInTheDocument();
    expect(screen.queryByText('Resuelve paso a paso')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revisar actividad y entregar' })).toBeInTheDocument();
  });
});
