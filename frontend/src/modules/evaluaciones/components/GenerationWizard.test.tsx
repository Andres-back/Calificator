import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GenerationWizard } from './GenerationWizard';
import { createEmptyWizardState, persistWizardDraft } from './generationWizardModel';
import type { Evaluacion, Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  extractReference: vi.fn(),
  update: vi.fn(),
  listDba: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../api', () => ({
  generarBorradorEvaluacion: mocks.generate,
  extraerReferenciaEvaluacion: mocks.extractReference,
  updateEvaluacion: mocks.update,
}));
vi.mock('@/modules/materias/dbaApi', () => ({
  listDbaCombinado: mocks.listDba,
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

function renderWizard(onCompleted = vi.fn(), initialEvaluation: Evaluacion | null = null) {
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
          materias={[materia]}
          initialMateriaId={materia.id}
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
  it('navigates the six accessible steps, reviews a question and confirms the normal evaluation', async () => {
    const user = userEvent.setup();
    const { onCompleted } = renderWizard();

    expect(screen.getByRole('dialog', { name: /Generar evaluación con IA/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    const next = screen.getByRole('button', { name: 'Siguiente' });
    expect(next).toBeDisabled();

    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Evaluación IA');
    await user.click(screen.getByRole('radio', { name: /^En papel\b/i }));
    await user.click(next);
    expect(await screen.findByText('Elige cómo orientar la evaluación')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    await user.click(screen.getByRole('checkbox', { name: /Alinear con DBA/i }));
    await user.click(await screen.findByRole('button', { name: /DBA-1/i }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Configura las preguntas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Añade material de referencia')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Texto de referencia/i), 'Material del docente');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await user.click(screen.getByRole('button', { name: 'Generar borrador' }));
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ modalidad: 'fisica' }));
    expect(await screen.findByText('Revisa y edita las preguntas')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Enunciado/i));
    await user.type(screen.getByLabelText(/Enunciado/i), 'Pregunta uno editada');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Confirma la evaluación')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1].preguntas[0].enunciado).toBe('Pregunta uno editada');
    expect(onCompleted).toHaveBeenCalledWith(evaluation);
  }, 10_000);

  it('prevents a double generation submit and keeps keyboard controls reachable', async () => {
    let resolveGeneration!: (value: Evaluacion) => void;
    mocks.generate.mockReturnValue(new Promise<Evaluacion>((resolve) => { resolveGeneration = resolve; }));
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Evaluación IA');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    const generateButton = screen.getByRole('button', { name: 'Generar borrador' });
    fireEvent.click(generateButton);
    fireEvent.click(generateButton);
    await waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1));
    expect(generateButton).toHaveAttribute('aria-busy', 'true');

    resolveGeneration(evaluation);
    expect(await screen.findByText('Revisa y edita las preguntas')).toBeInTheDocument();
    await user.tab();
    expect(document.activeElement).toBeInstanceOf(HTMLElement);
  });

  it('generates with a rubric and without DBA when the teacher chooses that combination', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Evaluación por rúbrica');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('checkbox', { name: /Evaluar con rúbrica/i }));
    await user.type(screen.getByLabelText('Nuevo criterio de rúbrica'), 'Argumentación con evidencias');
    await user.click(screen.getByRole('button', { name: /Agregar criterio/i }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Generar borrador' }));

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

    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Evaluación con guía');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    const file = new File(['contenido'], 'guia.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Seleccionar material de referencia'), file);

    await waitFor(() => expect(mocks.extractReference).toHaveBeenCalledWith(materia.id, file));
    expect(await screen.findByDisplayValue('Contenido extraído del archivo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Generar borrador' }));
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
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
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

  it('recovers, discards, and starts over from a saved draft', async () => {
    const state = createEmptyWizardState(materia.id);
    state.nombre = 'Evaluación recuperada';
    state.step = 3;
    persistWizardDraft(localStorage, 'profesor-1', state);
    const user = userEvent.setup();

    const first = renderWizard();
    expect(await screen.findByText('Encontramos una evaluación sin terminar.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByText('Configura las preguntas')).toBeInTheDocument();
    first.unmount();

    renderWizard();
    await user.click(await screen.findByRole('button', { name: 'Empezar de nuevo' }));
    expect(screen.getByText('Datos básicos de la evaluación')).toBeInTheDocument();
  });
});
