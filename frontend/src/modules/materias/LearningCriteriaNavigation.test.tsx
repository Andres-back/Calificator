import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/stores/auth';
import type { Materia } from '@/types/api';
import { MateriaDetailPage } from './MateriaDetailPage';
import { LearningCriteriaLegacyRedirect } from './criterios/LearningCriteriaLegacyRedirect';

const materiaApi = vi.hoisted(() => ({
  getMateria: vi.fn(),
  getMateriaEstudiantes: vi.fn(),
}));
const criteriaApi = vi.hoisted(() => ({
  getLearningCriteriaCapabilities: vi.fn(),
}));

vi.mock('./api', () => materiaApi);
vi.mock('./criterios/api', () => criteriaApi);
vi.mock('./MateriaDbaPage', () => ({
  MateriaDbaPage: () => <div>Estándares oficiales heredados</div>,
}));

const materia: Materia = {
  id: 'materia-1',
  profesor_id: 'profesor-1',
  nombre: 'Ciencias',
  area: 'Ciencias',
  grado: '7',
  descripcion: 'Materia de prueba',
  codigo_matricula: 'ABC123',
  codigo_activo: true,
  requiere_aprobacion: false,
  estado: 'activa',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function withQueries(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function LocationProbe() {
  const location = useLocation();
  return <div>{`${location.pathname}${location.search}${location.hash}`}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: {
      id: 'profesor-1',
      nombre: 'Docente',
      email: 'docente@example.test',
      rol: 'profesor',
      estado: 'activo',
      permissions: ['subjects.read', 'dba.read', 'dba.manage'],
    },
    status: 'authenticated',
  });
});

describe('navegación de criterios de aprendizaje', () => {
  it('redirige el alias /dba a /criterios conservando query y hash', async () => {
    criteriaApi.getLearningCriteriaCapabilities.mockResolvedValue({ ui: true, write: true, generation: true });

    render(withQueries(
      <MemoryRouter initialEntries={['/app/materias/materia-1/dba?origen=antiguo#fuentes']}>
        <Routes>
          <Route path="/app/materias/:id/dba" element={<LearningCriteriaLegacyRedirect />} />
          <Route path="/app/materias/:id/criterios" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    ));

    expect(await screen.findByText('/app/materias/materia-1/criterios?origen=antiguo#fuentes')).toBeVisible();
  });

  it('mantiene Estándares oficiales cuando la interfaz nueva está desactivada', async () => {
    criteriaApi.getLearningCriteriaCapabilities.mockResolvedValue({ ui: false, write: false, generation: false });

    render(withQueries(
      <MemoryRouter initialEntries={['/app/materias/materia-1/dba']}>
        <Routes>
          <Route path="/app/materias/:id/dba" element={<LearningCriteriaLegacyRedirect />} />
        </Routes>
      </MemoryRouter>,
    ));

    expect(await screen.findByText('Estándares oficiales heredados')).toBeVisible();
  });

  it('muestra al docente una sola pestaña canónica y no expone el nombre DBA', async () => {
    criteriaApi.getLearningCriteriaCapabilities.mockResolvedValue({ ui: true, write: true, generation: true });
    materiaApi.getMateriaEstudiantes.mockResolvedValue({ ...materia, estudiantes: [] });

    render(withQueries(
      <MemoryRouter initialEntries={['/app/materias/materia-1']}>
        <Routes>
          <Route path="/app/materias/:id" element={<MateriaDetailPage />}>
            <Route index element={<div>Vista general</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    ));

    const link = await screen.findByRole('link', { name: /Criterios de aprendizaje/i });
    expect(link).toHaveAttribute('href', '/app/materias/materia-1/criterios');
    expect(screen.queryByRole('link', { name: /^DBA$/i })).not.toBeInTheDocument();
  });
});
