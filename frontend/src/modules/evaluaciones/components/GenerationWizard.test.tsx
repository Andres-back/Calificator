import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GenerationWizard } from './GenerationWizard';
import { createEmptyWizardState, persistWizardDraft } from './generationWizardModel';
import type { Evaluacion, Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  update: vi.fn(),
  listDba: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../api', () => ({
  generarBorradorEvaluacion: mocks.generate,
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

function renderWizard(onCompleted = vi.fn()) {
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
    await user.click(next);
    expect(await screen.findByText('Selecciona los DBA')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');

    await user.click(await screen.findByRole('button', { name: /DBA-1/i }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Configura las preguntas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Añade material de referencia')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Texto de referencia/i), 'Material del docente');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    await user.click(screen.getByRole('button', { name: 'Generar borrador' }));
    expect(await screen.findByText('Revisa y edita las preguntas')).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/Enunciado/i));
    await user.type(screen.getByLabelText(/Enunciado/i), 'Pregunta uno editada');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Confirma la evaluación')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][1].preguntas[0].enunciado).toBe('Pregunta uno editada');
    expect(onCompleted).toHaveBeenCalledWith(evaluation);
  });

  it('prevents a double generation submit and keeps keyboard controls reachable', async () => {
    let resolveGeneration!: (value: Evaluacion) => void;
    mocks.generate.mockReturnValue(new Promise<Evaluacion>((resolve) => { resolveGeneration = resolve; }));
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText(/Nombre de la evaluación/i), 'Evaluación IA');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(await screen.findByRole('button', { name: /DBA-1/i }));
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
    expect(screen.getByText('¿Para qué materia es la evaluación?')).toBeInTheDocument();
  });
});
