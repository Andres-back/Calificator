import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GenerationWizard } from './GenerationWizard';
import { createEmptyWizardState, persistWizardDraft } from './generationWizardModel';
import type { Evaluacion, Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  get: vi.fn(),
  extractReference: vi.fn(),
  update: vi.fn(),
  listDba: vi.fn(),
  createDba: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../api', () => ({
  generarBorradorEvaluacion: mocks.generate,
  getEvaluacion: mocks.get,
  extraerReferenciaEvaluacion: mocks.extractReference,
  updateEvaluacion: mocks.update,
}));
vi.mock('@/modules/materias/dbaApi', () => ({
  listDbaCombinado: mocks.listDba,
  createDbaPersonalizado: mocks.createDba,
}));
vi.mock('@/modules/xali/api', () => ({
  sendMessage: mocks.sendMessage,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const materia: Materia = {
  id: 'materia-1',
  profesor_id: 'profesor-1',
  nombre: 'Matemáticas',
  area: 'Matemáticas',
  grado: '7',
  descripcion: 'Curso',
  codigo_matricula: 'MATE01',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const evaluation: Evaluacion = {
  id: 'evaluacion-1',
  materia_id: materia.id,
  profesor_id: 'profesor-1',
  nombre: 'Evaluación IA',
  descripcion: null,
  tipo_origen: 'nativa',
  modalidad: 'online',
  nota_maxima: 5,
  estado: 'borrador',
  tiempo_limite_minutos: null,
  fecha_publicacion: null,
  fecha_limite_entrega: null,
  dba_ids: ['dba-1'],
  dba_personalizado_ids: [],
  metas_profesor: [],
  criterios: [],
  preguntas: [
    { numero: 1, tipo: 'opcion_multiple', enunciado: 'Pregunta uno', opciones: ['A', 'B', 'C'], puntaje: '2', dba_ids: ['dba-1'] },
    { numero: 2, tipo: 'abierta', enunciado: 'Pregunta dos', opciones: [], puntaje: '2', dba_ids: ['dba-1'] },
    { numero: 3, tipo: 'completar', enunciado: 'Pregunta tres', opciones: [], puntaje: '1', dba_ids: ['dba-1'] },
  ],
  respuestas_esperadas: [
    { numero: 1, respuesta: 'A', dba_ids: ['dba-1'] },
    { numero: 2, respuesta: 'Respuesta dos', dba_ids: ['dba-1'] },
    { numero: 3, respuesta: 'Respuesta tres', dba_ids: ['dba-1'] },
  ],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};


const rubricEvaluation: Evaluacion = {
  ...evaluation,
  criterios: [
    {
      nombre: 'Comprensión conceptual',
      descripcion: 'Explica los conceptos principales.',
      peso_porcentaje: 60,
      puntaje_maximo: 3,
      dba_ids: [],
      niveles: {
        Excelente: 'Explica con precisión y ejemplos.',
        Satisfactorio: 'Explica la idea principal.',
        Inicial: 'Necesita apoyo para explicar.',
      },
    },
    {
      nombre: 'Aplicación',
      descripcion: 'Aplica el procedimiento correctamente.',
      peso_porcentaje: 40,
      puntaje_maximo: 2,
      dba_ids: [],
      niveles: {
        Excelente: 'Aplica y justifica cada paso.',
        Satisfactorio: 'Aplica el procedimiento.',
        Inicial: 'Presenta errores de aplicación.',
      },
    },
  ],
};
function renderWizard(onCompleted = vi.fn(), initialEvaluation: Evaluacion | null = null, subject = materia, contextual = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onCompleted,
    ...render(
      <QueryClientProvider client={client}>
        <GenerationWizard
          open
          onClose={vi.fn()}
          userId="profesor-1"
          materias={[subject, { ...materia, id: 'other-subject', nombre: 'Otra materia' }]}
          initialMateriaId={contextual ? subject.id : undefined}
          initialEvaluation={initialEvaluation}
          onCompleted={onCompleted}
        />
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listDba.mockResolvedValue([{
    id: 'dba-1',
    fuente: 'oficial',
    codigo: 'DBA-1',
    area: 'Matemáticas',
    grado: '7',
    descripcion: 'Resuelve problemas con números racionales.',
  }]);
  mocks.generate.mockResolvedValue(evaluation);
  mocks.get.mockResolvedValue(evaluation);
  mocks.extractReference.mockResolvedValue({
    texto: 'Contenido extraído del archivo',
    nombre_archivo: 'guia.pdf',
    mime: 'application/pdf',
    caracteres: 29,
    advertencias: [],
  });
  mocks.update.mockResolvedValue(evaluation);
  mocks.sendMessage.mockResolvedValue({ respuesta: 'Aclara el enunciado.' });
});

describe('GenerationWizard', () => {
  it('097 opens mobile without text autofocus and Listo preserves the topic without submitting', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query.includes('max-width'), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList));
    try {
      const user = userEvent.setup();
      renderWizard();
      const topic = screen.getByLabelText(/Qué quieres evaluar/);
      expect(topic).not.toHaveFocus();
      await user.type(topic, 'Fracciones con ejemplos');
      expect(await screen.findByRole('button', { name: 'Listo' })).toBeVisible();
      expect(screen.getByRole('dialog')).toHaveAttribute('data-writing', 'true');
      await user.click(screen.getByRole('button', { name: 'Listo' }));
      expect(screen.getByLabelText(/Qué quieres evaluar/)).toBe(topic);
      expect(topic).toHaveValue('Fracciones con ejemplos');
      expect(screen.getByRole('button', { name: 'Generar evaluación' })).toBeVisible();
      expect(mocks.generate).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    } finally { media.mockRestore(); }
  });

  it('097 retains a pending answer edit while finishing mobile writing', async () => {
    const media = vi.spyOn(window, 'matchMedia').mockImplementation(query => ({ matches: query.includes('max-width'), media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } as unknown as MediaQueryList));
    try {
      const user = userEvent.setup();
      renderWizard(vi.fn(), evaluation);
      const statement = screen.getByLabelText(/Enunciado/);
      await user.clear(statement);
      await user.type(statement, 'Pregunta editada sin guardar');
      await user.click(await screen.findByRole('button', { name: 'Listo' }));
      expect(statement).toHaveValue('Pregunta editada sin guardar');
      expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeVisible();
      expect(mocks.update).not.toHaveBeenCalled();
    } finally { media.mockRestore(); }
  });
  it('only calls Xali on request and applies its suggestion after confirmation', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), evaluation);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Necesito ayuda' }));
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('¿Qué necesitas mejorar?'), 'Aclara la pregunta');
    await user.click(screen.getByRole('button', { name: 'Enviar a Xali' }));
    await user.click(await screen.findByRole('button', { name: 'Revisar y aplicar' }));
    expect((screen.getByLabelText(/Enunciado/) as HTMLTextAreaElement).value).not.toContain('Aclara el enunciado.');
    await user.click(screen.getByRole('button', { name: 'Sí, aplicar' }));
    expect((screen.getByLabelText(/Enunciado/) as HTMLTextAreaElement).value).toContain('Aclara el enunciado.');
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('ignores a generation response after the account changes', async () => {
    let resolve!: (evaluation: Evaluacion) => void;
    mocks.generate.mockReturnValueOnce(new Promise<Evaluacion>(done => { resolve = done; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const content = (userId: string) => <QueryClientProvider client={client}><GenerationWizard open userId={userId} materias={[materia]} initialMateriaId={materia.id} onClose={vi.fn()} onCompleted={vi.fn()} /></QueryClientProvider>;
    const view = render(content('profesor-1'));
    await userEvent.setup().type(screen.getByLabelText(/Qué quieres evaluar/), 'Fracciones');
    fireEvent.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    view.rerender(content('profesor-2'));
    resolve(evaluation);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar evaluación' })).toBeDisabled());
    expect(screen.queryByText('Revisa y edita la evaluación')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Qué quieres evaluar/)).toHaveValue('');
  });

  it('opens and focuses the missing learning-criteria selection without sending a request', async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText(/Qué quieres evaluar/), 'Fracciones');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: /Usar criterios de aprendizaje/ }));
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Buscar criterios de aprendizaje' })).toHaveFocus());
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('096 reveals invalid rubric fields before allowing a save', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), { ...rubricEvaluation, criterios: rubricEvaluation.criterios.map((criterion, index) => ({ ...criterion, peso_porcentaje: index ? 30 : 60 })) });
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Revisar pendientes' }));
    await waitFor(() => expect(screen.getByLabelText('Nombre del criterio 1')).toBeVisible());
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('097 focuses the invalid score rather than moving subsequent typing into the statement', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), { ...evaluation, preguntas: evaluation.preguntas!.map((question, index) => index ? question : { ...question, puntaje: 0 }) });
    await user.click(screen.getByRole('button', { name: 'Revisar pendientes' }));
    await waitFor(() => expect(screen.getByLabelText('Puntaje de la pregunta 1')).toHaveFocus());
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('096 retains changes on save failure and shows a retryable error', async () => {
    mocks.update.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderWizard(vi.fn(), evaluation);
    await user.clear(screen.getByLabelText(/Enunciado/));
    await user.type(screen.getByLabelText(/Enunciado/), 'Conservar edición');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(/Enunciado/)).toHaveValue('Conservar edición');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });
  it('096 prepares and reviews in two screens without publishing or confirming again', async () => {
    const user = userEvent.setup();
    const { onCompleted } = renderWizard();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^En papel/ })).toBeChecked();
    expect(screen.getByText('Personalizar').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('complementary', { name: 'Asistencia opcional de Xali' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Qué quieres evaluar/), 'Fracciones');
    await user.click(screen.getByRole('button', { name: '10 preguntas' }));
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Evaluación de Fracciones', tema: 'Fracciones', cantidad_preguntas: 10, modalidad: 'fisica' })));
    expect(await screen.findByRole('button', { name: 'Guardar borrador' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledWith(evaluation));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('estado');
  });

  it('096 retains preparation after a generation error and retries explicitly', async () => {
    mocks.generate.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText(/Qué quieres evaluar/), 'Lectura comprensiva');
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledOnce());
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText(/Qué quieres evaluar/)).toHaveValue('Lectura comprensiva');
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await screen.findByRole('button', { name: 'Guardar borrador' });
    expect(mocks.generate).toHaveBeenCalledTimes(2);
  });

  it('096 checks restored generated draft identity and version without replacing local edits', async () => {
    const state = { ...createEmptyWizardState(materia.id), step: 6, nombre: 'Anterior', nombreAutomatico: false, generatedEvaluationId: evaluation.id, generatedUpdatedAt: evaluation.updated_at, questions: [{ clientId: 'local', numero: 1, tipo: 'abierta' as const, enunciado: 'Edición local', opciones: [], respuestaEsperada: 'Respuesta local', puntaje: 5, modalidadRespuesta: 'fisica' as const, dbaIds: [], expanded: true }] };
    persistWizardDraft(localStorage, 'profesor-1', state);
    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith(evaluation.id));
    expect(screen.getByLabelText(/Enunciado/)).toHaveValue('Edición local');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(evaluation.id, expect.objectContaining({ expected_updated_at: evaluation.updated_at })));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('096 blocks a restored version conflict while retaining the questions', async () => {
    const state = { ...createEmptyWizardState(materia.id), step: 6, nombre: 'Anterior', generatedEvaluationId: evaluation.id, generatedUpdatedAt: 'old-version', questions: [{ clientId: 'local', numero: 1, tipo: 'abierta' as const, enunciado: 'Edición conservada', opciones: [], respuestaEsperada: 'Respuesta local', puntaje: 5, modalidadRespuesta: 'fisica' as const, dbaIds: [], expanded: true }] };
    persistWizardDraft(localStorage, 'profesor-1', state);
    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/cambió desde que/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enunciado/)).toHaveValue('Edición conservada');
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('keeps question edits when subject and evaluation queries refetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const content = (subject: Materia, saved: Evaluacion) => <QueryClientProvider client={client}><GenerationWizard open userId="profesor-1" onClose={vi.fn()} materias={[subject]} initialMateriaId={subject.id} initialEvaluation={saved} onCompleted={vi.fn()} /></QueryClientProvider>;
    const view = render(content(materia, evaluation));
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText(/Enunciado/));
    await user.type(screen.getByLabelText(/Enunciado/), 'Cambio aún sin guardar');
    view.rerender(content({ ...materia }, { ...evaluation }));
    expect(screen.getByLabelText(/Enunciado/)).toHaveValue('Cambio aún sin guardar');
  });
  it('saves only the changed rubric without round-tripping saved questions', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), rubricEvaluation);
    await user.click(screen.getByText('Cómo se calificará'));
    await user.clear(screen.getByLabelText('Nombre del criterio 1'));
    await user.type(screen.getByLabelText('Nombre del criterio 1'), 'Comprensión revisada');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(Object.keys(mocks.update.mock.calls[0][1]).sort()).toEqual(['criterios', 'expected_updated_at']);
  });
  it('offers criteria after digitalization even when it has no rubric', () => {
    renderWizard(vi.fn(), { ...evaluation, tipo_origen: 'externa_digitalizada' });
    fireEvent.click(screen.getByText('Cómo se calificará'));
    expect(screen.getByRole('button', { name: 'Criterios y rúbrica' })).toBeInTheDocument();
  });
  it('searches without losing selection, sends only chosen criteria and shows degraded RAG warning', async () => {
    mocks.listDba.mockResolvedValue([
      { id: 'own-1', fuente: 'personalizado', codigo: null, descripcion: 'Interpreta fracciones equivalentes.', area: 'Matemáticas', grado: '7' },
      { id: 'own-2', fuente: 'personalizado', codigo: null, descripcion: 'Resuelve multiplicaciones.', area: 'Matemáticas', grado: '7' },
    ]);
    const warning = 'No se pudieron consultar las referencias guardadas.';
    mocks.generate.mockResolvedValue({ ...evaluation, blueprint: { reglas_feedback: { trazabilidad: { rag_estado: 'no_disponible', advertencias: [warning] } } } });
    const user = userEvent.setup();
    renderWizard();
    await user.type(screen.getByLabelText(/Qué quieres evaluar/), 'Prueba de fracciones');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: /Usar criterios de aprendizaje/ }));
    await user.click(await screen.findByRole('button', { name: /Interpreta fracciones/ }));
    await user.type(screen.getByRole('searchbox', { name: 'Buscar criterios de aprendizaje' }), 'multiplica');
    expect(screen.queryByRole('button', { name: /Interpreta fracciones/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 seleccionados');
    await user.clear(screen.getByRole('searchbox', { name: 'Buscar criterios de aprendizaje' }));
    expect(screen.getByRole('button', { name: /Interpreta fracciones/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ dba_ids: [], dba_personalizado_ids: ['own-1'] })));
    expect(await screen.findByText(warning)).toBeInTheDocument();
  });
  it('inherits fixed subject context and folds optional fields with their saved summary', async () => {
    const state = { ...createEmptyWizardState(materia.id), nombre: 'Guardada', descripcion: 'Fracciones', fechaLimiteEntrega: '2026-10-10T09:00' };
    persistWizardDraft(localStorage, 'profesor-1', state);
    const user = userEvent.setup();
    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Grado 7 · Área: Matemáticas')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const options = screen.getByText('Personalizar', { exact: true }).closest('details');
    expect(options).not.toHaveAttribute('open');
    expect(screen.getByLabelText(/Qué quieres evaluar/)).toHaveValue('Fracciones');
    expect(screen.getByLabelText('Resumen de preparación')).toHaveTextContent('2026-10-10 09:00');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    expect(screen.getByLabelText(/Qué quieres evaluar/)).toHaveValue('Fracciones');
    expect(screen.getByLabelText(/Fecha límite de entrega/)).toHaveValue('2026-10-10T09:00');
  });

  it('does not restore a different subject draft and keeps it recoverable', async () => {
    const original = { ...createEmptyWizardState(materia.id), nombre: 'Trabajo en matemáticas' };
    persistWizardDraft(localStorage, 'profesor-1', original);
    const other = { ...materia, id: 'materia-B', nombre: 'Español', grado: null, area: null } as unknown as Materia;
    const current = renderWizard(vi.fn(), null, other);
    expect(screen.queryByText('Encontramos una evaluación sin terminar.')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la evaluación/)).toHaveValue('');
    expect(screen.queryByText(/Grado 7/)).not.toBeInTheDocument();
    current.unmount();
    renderWizard();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.getByLabelText(/Nombre de la evaluación/)).toHaveValue(original.nombre);
  });

  it('keeps authorized subject selection in the general creator', () => {
    renderWizard(vi.fn(), null, materia, false);
    expect(screen.getByRole('combobox')).toHaveValue(materia.id);
    expect(mocks.listDba).not.toHaveBeenCalled();
  });

  it('prepares criteria and reference material, reviews and saves in two screens', async () => {
    const user = userEvent.setup();
    const { onCompleted } = renderWizard();
    expect(screen.getByRole('dialog', { name: /Generar evaluación con IA/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: 'Generar evaluación' })).toBeDisabled();
    await user.type(screen.getByLabelText(/Qué quieres evaluar/), 'Fracciones');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: /Usar criterios de aprendizaje/i }));
    await user.click(await screen.findByRole('button', { name: /DBA-1/i }));
    await user.type(screen.getByLabelText(/Texto de referencia/i), 'Material del docente');
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ modalidad: 'fisica', dba_ids: ['dba-1'], material_referencia: 'Material del docente' }));
    expect(await screen.findByText('Revisa y edita la evaluación')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
    await user.clear(screen.getByLabelText(/Enunciado/i));
    await user.type(screen.getByLabelText(/Enunciado/i), 'Pregunta uno editada');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1].preguntas[0].enunciado).toBe('Pregunta uno editada');
    expect(onCompleted).toHaveBeenCalledWith(evaluation);
    expect(screen.queryByText('Confirma la evaluación')).not.toBeInTheDocument();
  }, 10_000);

  it('prevents a double generation submit and keeps keyboard controls reachable', async () => {
    let resolveGeneration!: (value: Evaluacion) => void;
    mocks.generate.mockReturnValue(new Promise<Evaluacion>((resolve) => { resolveGeneration = resolve; }));
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Qué quieres evaluar/i), 'Evaluación IA');

    const generateButton = screen.getByRole('button', { name: 'Generar evaluación' });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1));
    expect(generateButton).toHaveAttribute('aria-busy', 'true');

    resolveGeneration(evaluation);
    expect(await screen.findByText('Revisa y edita la evaluación')).toBeInTheDocument();
    await user.tab();
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });

  it('generates with a rubric and without DBA when the teacher chooses that combination', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Qué quieres evaluar/i), 'Evaluación por rúbrica');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: /Evaluar con rúbrica/i }));
    await user.type(screen.getByLabelText('Nuevo criterio de rúbrica'), 'Argumentación con evidencias');
    await user.click(screen.getByRole('button', { name: /Agregar criterio/i }));
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));

    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      dba_ids: [],
      dba_personalizado_ids: [],
      usar_rubrica: true,
      criterios_docente: ['Argumentación con evidencias'],
    })));
  });

  it('uploads a PDF and uses its extracted text as generation material', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Qué quieres evaluar/i), 'Evaluación con guía');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    const file = new File(['contenido'], 'guia.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Seleccionar material de referencia'), file);

    await waitFor(() => expect(mocks.extractReference).toHaveBeenCalledWith(materia.id, file));
    expect(await screen.findByDisplayValue('Contenido extraído del archivo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({
      material_referencia: 'Contenido extraído del archivo',
    })));
  });

  it('reopens a saved draft and adds a new editable question', async () => {
    const user = userEvent.setup();
    renderWizard(vi.fn(), evaluation);

    expect(screen.getByRole('dialog', { name: /Editar contenido/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Agregar pregunta' }));
    await user.type(screen.getByLabelText(/Enunciado/i), '¿Cómo explicarías el procedimiento?');
    await user.type(screen.getByLabelText(/Respuesta esperada/i), 'Explica los pasos con claridad.');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1].preguntas).toHaveLength(4);
    expect(mocks.update.mock.calls[0][1].preguntas[3].enunciado).toContain('procedimiento');
  });

  it('warns clearly when editing an already assigned evaluation', () => {
    renderWizard(vi.fn(), { ...evaluation, estado: 'publicada', recepcion_habilitada: true });

    expect(screen.getByText('Estás editando una evaluación ya asignada.')).toBeInTheDocument();
    expect(screen.getByText(/No se borrarán entregas ni notas anteriores/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar pregunta' })).toBeInTheDocument();
  });

  it('uses the wide single-scroll layout when editing questions', () => {
    renderWizard(vi.fn(), { ...evaluation, estado: 'publicada', recepcion_habilitada: true });

    expect(screen.getByRole('dialog', { name: /Editar contenido/i })).toHaveClass('max-w-[min(96vw,90rem)]');
    const questionList = screen.getByRole('list', { name: 'Preguntas editables' });
    expect(questionList).not.toHaveClass('max-h-[52vh]', 'overflow-y-auto');
    fireEvent.click(screen.getByRole('button', { name: 'Necesito ayuda' }));
    expect(screen.getByRole('complementary', { name: 'Asistencia opcional de Xali' }).parentElement).toHaveClass('order-3');
    expect(screen.getByTestId('evaluation-wizard-content')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
  });
  it('recovers, discards, and starts over from a saved draft', async () => {
    const state = createEmptyWizardState(materia.id);
    state.nombre = 'Evaluación recuperada';
    state.step = 3;
    persistWizardDraft(localStorage, 'profesor-1', state);
    const user = userEvent.setup();

    const first = renderWizard();
    expect(await screen.findByText('Encontramos una evaluación sin terminar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Prepara tu evaluación')).toBeInTheDocument();
    first.unmount();

    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Empezar de nuevo' }));
    expect(screen.getByText('Prepara tu evaluación')).toBeInTheDocument();
  });
  it('lets the teacher edit the AI rubric before confirming the evaluation', async () => {
    mocks.generate.mockResolvedValueOnce(rubricEvaluation);
    mocks.update.mockResolvedValueOnce(rubricEvaluation);
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Qué quieres evaluar/i), 'Evaluación con rúbrica editable');
    await user.click(screen.getByText('Personalizar', { exact: true }));
    await user.click(screen.getByRole('checkbox', { name: /Evaluar con rúbrica/i }));
    await user.click(screen.getByRole('button', { name: 'Generar evaluación' }));

    await user.click(await screen.findByText('Cómo se calificará'));
    const criterionName = await screen.findByLabelText('Nombre del criterio 1');
    await user.clear(criterionName);
    await user.type(criterionName, 'Argumentación matemática');
    const criterionDescription = screen.getByLabelText('Descripción del criterio 1');
    await user.clear(criterionDescription);
    await user.type(criterionDescription, 'Justifica el procedimiento con evidencias.');
    const firstWeight = screen.getByLabelText('Peso del criterio 1');
    await user.clear(firstWeight);
    await user.type(firstWeight, '50');
    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
    expect(screen.getAllByText(/deben sumar 100 %/i).length).toBeGreaterThan(0);
    const secondWeight = screen.getByLabelText('Peso del criterio 2');
    await user.clear(secondWeight);
    await user.type(secondWeight, '50');
    const levelDescription = screen.getByLabelText('Descripción del nivel Excelente del criterio 1');
    await user.clear(levelDescription);
    await user.type(levelDescription, 'Justifica cada paso con precisión.');

    expect(screen.getByText('Peso total: 100 %')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1].criterios[0]).toMatchObject({
      nombre: 'Argumentación matemática',
      descripcion: 'Justifica el procedimiento con evidencias.',
      peso_porcentaje: 50,
      puntaje_maximo: 2.5,
      niveles: { Excelente: 'Justifica cada paso con precisión.' },
    });
  }, 10_000);
});
