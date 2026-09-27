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
});
