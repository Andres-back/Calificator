import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EvaluacionesPage } from './EvaluacionesPage';
import { useAuth } from '@/stores/auth';
import type { Evaluacion } from '@/types/api';

const mocks = vi.hoisted(() => ({ list: vi.fn(), publish: vi.fn(), close: vi.fn() }));

vi.mock('./api', () => ({
  listEvaluaciones: mocks.list,
  createEvaluacion: vi.fn(),
  generarBorradorEvaluacion: vi.fn(),
  updateEvaluacion: vi.fn(),
  publicarEvaluacion: mocks.publish,
  cerrarEvaluacion: mocks.close,
}));
vi.mock('@/modules/materias/MateriaSelect', () => ({
  useMaterias: () => ({ data: [{ id: 'materia-1', nombre: 'Ciencias', estado: 'activa' }], isLoading: false }),
  MateriaSelect: () => null,
}));
vi.mock('./components/GenerationWizard', () => ({ GenerationWizard: () => null }));
vi.mock('./visualApi', () => ({ getVisualCapabilities: vi.fn().mockResolvedValue({ documento: false }) }));
vi.mock('@/modules/materias/dbaApi', () => ({ listDbaCombinado: vi.fn().mockResolvedValue([]) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const base: Evaluacion = {
  id: 'a', materia_id: 'materia-1', profesor_id: 'profesor-1', nombre: 'Taller A', descripcion: null,
  tipo_origen: 'nativa', modalidad: 'online', nota_maxima: 5, estado: 'borrador', tiempo_limite_minutos: null,
  fecha_publicacion: null, fecha_limite_entrega: null, dba_ids: [], dba_personalizado_ids: [], metas_profesor: [],
  criterios: [], preguntas: [], respuestas_esperadas: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/evaluaciones?materia=materia-1']}>
        <EvaluacionesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: {
      id: 'profesor-1', nombre: 'Docente', email: 'docente@example.com', rol: 'profesor', estado: 'activo',
      permissions: ['evaluations.read', 'evaluations.create', 'evaluations.update', 'evaluations.publish'],
    },
    status: 'authenticated',
  });
});

describe('146 EvaluacionesPage confirma y marca carga por tarjeta', () => {
  it('confirma antes de publicar y solo la tarjeta elegida muestra carga', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([base, { ...base, id: 'b', nombre: 'Taller B' }]);
    mocks.publish.mockReturnValue(new Promise(() => {}));
    renderPage();
    const buttons = await screen.findAllByRole('button', { name: 'Publicar' });
    expect(buttons).toHaveLength(2);

    await user.click(buttons[0]);
    const dialog = screen.getByRole('dialog', { name: 'Publicar evaluación' });
    expect(dialog).toHaveTextContent('Taller A');
    expect(mocks.publish).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(mocks.publish.mock.calls[0]?.[0]).toBe('a'));

    const [cardA, cardB] = screen.getAllByRole('button', { name: 'Publicar' }).filter((button) => !button.closest('[role="dialog"]'));
    expect(cardA).toHaveAttribute('aria-busy', 'true');
    expect(cardB).not.toHaveAttribute('aria-busy');
    expect(cardB).toBeEnabled();
  });

  it('confirma antes de cerrar una evaluación y no la cierra al cancelar', async () => {
    const user = userEvent.setup();
    mocks.list.mockResolvedValue([{ ...base, estado: 'publicada' }]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Cerrar' }));
    const dialog = screen.getByRole('dialog', { name: 'Cerrar evaluación' });
    expect(dialog).toHaveTextContent('Taller A');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(mocks.close).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Cerrar evaluación' })).getByRole('button', { name: 'Cerrar evaluación' }));
    await waitFor(() => expect(mocks.close.mock.calls[0]?.[0]).toBe('a'));
  });
});
