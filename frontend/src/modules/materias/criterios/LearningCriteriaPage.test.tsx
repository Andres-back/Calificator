import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/stores/auth';
import { LearningCriteriaPage } from './LearningCriteriaPage';

const materiaApi = vi.hoisted(() => ({ getMateria: vi.fn() }));
const criteriaApi = vi.hoisted(() => ({
  archiveLearningCriteria: vi.fn(),
  cloneLearningCriteria: vi.fn(),
  getLearningCriteriaCapabilities: vi.fn(),
  listLearningCriteria: vi.fn(),
}));

vi.mock('../api', () => materiaApi);
vi.mock('./api', () => criteriaApi);
vi.mock('../MateriaDbaPage', () => ({ MateriaDbaPage: () => <div>Estándares oficiales</div> }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/materias/materia-1/criterios']}>
        <Routes>
          <Route path="/app/materias/:id/criterios" element={<LearningCriteriaPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LearningCriteriaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('xcalificator:tour:profesor:criterios-aprendizaje:v1', 'completed');
    useAuth.setState({
      user: { id: 'profesor-1', nombre: 'Profesora', email: 'profesora@example.test', rol: 'profesor', estado: 'activo' },
      status: 'authenticated',
    });
    materiaApi.getMateria.mockResolvedValue({ id: 'materia-1', nombre: 'Lengua', grado: '5' });
    criteriaApi.getLearningCriteriaCapabilities.mockResolvedValue({ ui: true, write: true, generation: true });
    criteriaApi.listLearningCriteria.mockResolvedValue({ items: [], total: 0, limit: 25, offset: 0 });
  });

  it('presenta una acción docente y abre el inicio guiado', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Criterios de aprendizaje' })).toBeVisible();
    const actions = screen.getAllByRole('button', { name: 'Definir qué voy a evaluar' });
    expect(actions.length).toBeGreaterThan(0);
    await user.click(actions[0]);

    expect(screen.getByRole('heading', { name: '¿Cómo quieres empezar?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Usar foto, PDF o material/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escribir lo que enseñé/ })).toBeInTheDocument();
  });

  it('permite buscar y filtrar criterios sin perder las acciones reales', async () => {
    const user = userEvent.setup();
    criteriaApi.listLearningCriteria.mockResolvedValue({
      items: [
        {
          id: 'set-1', materia_id: 'materia-1', profesor_id: 'profesor-1', titulo: 'Comprensión literal',
          descripcion: 'Reconoce información explícita', estado: 'activo', created_at: '2026-09-27', updated_at: '2026-09-27',
          version_trabajo: null,
          version_aprobada: {
            id: 'version-1', set_id: 'set-1', version_number: 1, revision: 1, estado: 'aprobada',
            intencion_docente: {}, fuentes: [], created_at: '2026-09-27',
            criterios: [{ stable_key: 'literal', orden: 1, nombre: 'Identifica datos', descripcion: 'Ubica datos explícitos', evidencia_esperada: 'Respuesta textual', peso_porcentaje: 100, niveles: [] }],
          },
        },
        {
          id: 'set-2', materia_id: 'materia-1', profesor_id: 'profesor-1', titulo: 'Argumentación',
          descripcion: 'Borrador para debate', estado: 'activo', created_at: '2026-09-27', updated_at: '2026-09-27',
          version_aprobada: null,
          version_trabajo: {
            id: 'version-2', set_id: 'set-2', version_number: 1, revision: 1, estado: 'borrador',
            intencion_docente: {}, fuentes: [], criterios: [], created_at: '2026-09-27',
          },
        },
      ],
      total: 2,
      limit: 25,
      offset: 0,
    });
    renderPage();

    expect(await screen.findByText('Comprensión literal')).toBeVisible();
    expect(screen.getByText('Argumentación')).toBeVisible();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar criterios' }), 'datos');
    expect(screen.getByText('Comprensión literal')).toBeVisible();
    expect(screen.queryByText('Argumentación')).not.toBeInTheDocument();

    await user.clear(screen.getByRole('searchbox', { name: 'Buscar criterios' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filtrar por estado' }), 'borrador');
    expect(screen.queryByText('Comprensión literal')).not.toBeInTheDocument();
    expect(screen.getByText('Argumentación')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Revisar y editar' })).toBeEnabled();
  });
});
