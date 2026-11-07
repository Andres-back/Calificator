import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GenerationWizard } from './GenerationWizard';
import type { Evaluacion, Materia } from '@/types/api';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  publish: vi.fn(),
  readScore: vi.fn(),
  order: [] as string[],
}));

vi.mock('../scoreApi', () => ({ readScoreDefinition: mocks.readScore }));
vi.mock('../api', () => ({
  generarBorradorEvaluacion: vi.fn(),
  getEvaluacion: vi.fn(),
  extraerReferenciaEvaluacion: vi.fn(),
  updateEvaluacion: mocks.update,
  publicarEvaluacion: mocks.publish,
}));
vi.mock('@/modules/materias/dbaApi', () => ({ listDbaCombinado: vi.fn().mockResolvedValue([]) }));
vi.mock('@/modules/xali/api', () => ({ sendMessage: vi.fn() }));
vi.mock('../visualApi', () => ({ getVisualCapabilities: vi.fn().mockResolvedValue({ editor: false, generacion: false, importacion: false, max_bytes: 20971520 }) }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

const materia: Materia = {
  id: 'materia-1', profesor_id: 'profesor-1', nombre: 'Lenguaje', area: 'Lenguaje', grado: '3', descripcion: '',
  codigo_matricula: 'LEN01', codigo_activo: true, requiere_aprobacion: false, estado: 'activa',
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const question = (numero: number, puntaje: string) => ({ numero, tipo: 'abierta', enunciado: `Pregunta sintética ${numero}`, opciones: [], puntaje, dba_ids: [] });

const draft: Evaluacion = {
  id: 'digital-1', materia_id: materia.id, profesor_id: 'profesor-1', nombre: 'Taller digitalizado', descripcion: null,
  tipo_origen: 'externa_digitalizada', modalidad: 'fisica', nota_maxima: 5, estado: 'borrador', tiempo_limite_minutos: null,
  fecha_publicacion: null, fecha_limite_entrega: null, dba_ids: [], dba_personalizado_ids: [], metas_profesor: [],
  criterios: [{ nombre: 'Comprensión', descripcion: 'Responde con sentido.', peso_porcentaje: 100, puntaje_maximo: 5, dba_ids: [] }],
  preguntas: [question(1, '2'), question(2, '2'), question(3, '1')],
  respuestas_esperadas: [1, 2, 3].map(numero => ({ numero, respuesta: `Respuesta ${numero}`, dba_ids: [] })),
  blueprint: { reglas_feedback: { advertencias: [
    'La lectura de la hoja 1 quedó incompleta. Revísala o pégala en el borrador antes de publicar.',
    'Revisa las respuestas antes de publicar.',
  ] } } as Evaluacion['blueprint'],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

const pendingDraft: Evaluacion = {
  ...draft,
  preguntas: [question(1, '2'), question(2, '2'), question(3, '0.5')],
  respuestas_esperadas: [1, 2, 3].map(numero => ({ numero, respuesta: numero === 2 ? '' : `Respuesta ${numero}`, dba_ids: [] })),
};

function renderWizard(initialEvaluation: Evaluacion, publishable = true) {
  const onPublished = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <GenerationWizard open onClose={vi.fn()} userId="profesor-1" materias={[materia]} initialMateriaId={materia.id}
        initialEvaluation={initialEvaluation} onCompleted={vi.fn()} onPublished={publishable ? onPublished : undefined} />
    </QueryClientProvider>,
  );
  return { onPublished };
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  mocks.order.length = 0;
  mocks.readScore.mockResolvedValue({ tiene_entregas: false });
  mocks.update.mockImplementation(async (id: string, payload: Record<string, unknown>) => { mocks.order.push('guardar'); return { ...draft, id, ...payload, updated_at: '2026-01-02T00:00:00Z' }; });
  mocks.publish.mockImplementation(async (id: string) => { mocks.order.push('publicar'); return { ...draft, id, estado: 'publicada' }; });
});

describe('156 lista "Para publicar" del borrador digitalizado', () => {
  it('muestra la hoja con aviso, la pregunta sin respuesta y la suma, con un botón a cada una', async () => {
    const user = userEvent.setup();
    renderWizard(pendingDraft);
    const list = await screen.findByRole('region', { name: 'Para publicar' });
    expect(list).toHaveTextContent('La lectura de la hoja 1 quedó incompleta');
    expect(list).not.toHaveTextContent('Revisa las respuestas antes de publicar.');
    expect(list).toHaveTextContent('Suma de puntos: 4,5 de 5');
    expect(within(list).queryByRole('button', { name: 'Publicar y empezar a calificar' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Pregunta 1 de 3' })).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: 'Ir a la pregunta 2' }));
    expect(screen.getByRole('heading', { name: 'Pregunta 2 de 3' })).toBeInTheDocument();
  });

  it('al completar los pendientes guarda los cambios y luego publica con la regla del servidor', async () => {
    const user = userEvent.setup();
    const { onPublished } = renderWizard(pendingDraft);
    const list = await screen.findByRole('region', { name: 'Para publicar' });
    await user.click(within(list).getByRole('button', { name: 'Ir a la pregunta 2' }));
    await user.type(screen.getByLabelText(/^Respuesta esperada/), 'Respuesta 2');
    expect(list).toHaveTextContent('Todas las preguntas tienen su respuesta correcta.');
    await user.click(within(list).getByRole('button', { name: 'Revisar puntos' }));
    const score = screen.getByLabelText('Puntaje de la pregunta 1');
    await user.clear(score);
    await user.type(score, '2,5');
    expect(list).toHaveTextContent('Todo listo para publicar');
    await user.click(within(list).getByRole('button', { name: 'Publicar y empezar a calificar' }));
    const confirm = screen.getByRole('dialog', { name: 'Publicar evaluación' });
    expect(mocks.publish).not.toHaveBeenCalled();
    await user.click(within(confirm).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledWith(expect.objectContaining({ id: 'digital-1', estado: 'publicada' })));
    expect(mocks.order).toEqual(['guardar', 'publicar']);
    expect(mocks.update).toHaveBeenCalledWith('digital-1', expect.objectContaining({ expected_updated_at: draft.updated_at }));
    expect(mocks.publish).toHaveBeenCalledWith('digital-1');
  });

  it('sin cambios pendientes publica sin volver a guardar', async () => {
    const user = userEvent.setup();
    const { onPublished } = renderWizard(draft);
    const list = await screen.findByRole('region', { name: 'Para publicar' });
    await user.click(within(list).getByRole('button', { name: 'Publicar y empezar a calificar' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Publicar evaluación' })).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(onPublished).toHaveBeenCalled());
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('si el servidor no permite publicar, muestra su motivo y conserva el borrador abierto', async () => {
    const user = userEvent.setup();
    mocks.publish.mockRejectedValue(new AxiosError('409', 'ERR', undefined, undefined, {
      status: 409, statusText: 'Conflict', headers: {}, config: { headers: new AxiosHeaders() },
      data: { detail: 'Agrega criterios de calificacion antes de publicar.' },
    }));
    const { onPublished } = renderWizard(draft);
    const list = await screen.findByRole('region', { name: 'Para publicar' });
    await user.click(within(list).getByRole('button', { name: 'Publicar y empezar a calificar' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Publicar evaluación' })).getByRole('button', { name: 'Publicar' }));
    expect(await within(list).findByRole('alert')).toHaveTextContent('Agrega criterios de calificacion antes de publicar.');
    expect(onPublished).not.toHaveBeenCalled();
  });

  it('no aparece sin permiso de publicar ni en evaluaciones que no vienen de una foto', async () => {
    renderWizard(draft, false);
    expect(await screen.findByRole('heading', { name: 'Pregunta 1 de 3' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Para publicar' })).not.toBeInTheDocument();
  });

  it('no aparece en una evaluación creada con IA', async () => {
    renderWizard({ ...draft, tipo_origen: 'nativa' });
    expect(await screen.findByRole('heading', { name: 'Pregunta 1 de 3' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Para publicar' })).not.toBeInTheDocument();
  });
});
