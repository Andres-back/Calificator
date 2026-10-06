import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { MateriaDetailPage } from './MateriaDetailPage';
import { useAuth } from '@/stores/auth';
import type { Materia } from '@/types/api';

const materiaApi = vi.hoisted(() => ({
  getMateria: vi.fn(),
  getMateriaEstudiantes: vi.fn(),
  regenerateCode: vi.fn(),
}));

vi.mock('./api', () => materiaApi);
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
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

function apiFailure(status: number, detail: string) {
  return new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    undefined,
    undefined,
    {
      data: { detail },
      status,
      statusText: 'Error',
      headers: {},
      config: {} as InternalAxiosRequestConfig,
    },
  );
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app/materias/materia-1']}>
        <Routes>
          <Route path="/app/materias/:id" element={<MateriaDetailPage />}>
            <Route index element={<div>Acceso confirmado</div>} />
            <Route path="evaluaciones" element={<div>Evaluaciones confirmadas</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: {
      id: 'estudiante-1',
      nombre: 'Estudiante',
      email: 'estudiante@example.test',
      rol: 'estudiante',
      estado: 'activo',
      permissions: [
        'subjects.read',
        'evaluations.read',
        'evaluations.submit',
        'resources.read',
        'gradebook.read',
        'grading.read',
        'dba.read',
      ],
    },
    status: 'authenticated',
  });
});

describe('MateriaDetailPage for students', () => {
  it('keeps secondary subject information folded while navigation stays available', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    renderDetail();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ciencias' })).toBeVisible());
    expect(screen.getByText('Información de la materia').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('combobox', { name: 'Sección de la materia' })).toBeInTheDocument();
  });
  it('retira Calificar cuando Evaluaciones es accesible al docente', async () => {
    materiaApi.getMateriaEstudiantes.mockResolvedValue({ ...materia, estudiantes: [] });
    useAuth.setState({ user: { id: 'p1', nombre: 'Docente', email: 'p@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read', 'grading.grade'] } });
    renderDetail();
    expect(await screen.findByRole('link', { name: /Evaluaciones/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Calificar/i })).not.toBeInTheDocument();
  });
  it('uses the student subject endpoint and never requests the administrative roster', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);

    renderDetail();

    expect(await screen.findByText('Acceso confirmado')).toBeInTheDocument();
    expect(materiaApi.getMateria).toHaveBeenCalledWith('materia-1');
    expect(materiaApi.getMateriaEstudiantes).not.toHaveBeenCalled();
    expect(screen.queryByText('Codigo de inscripcion')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Vista general/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Evaluaciones/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Recursos/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Boletín/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Calificar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Asistencia/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Criterios de aprendizaje|DBA/i })).not.toBeInTheDocument();
  });

  it('keeps an explicitly assigned custom-role module visible', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    useAuth.setState({
      user: {
        id: 'estudiante-mixto',
        nombre: 'Perfil mixto',
        email: 'mixto@example.test',
        rol: 'estudiante',
        estado: 'activo',
        custom_role_id: 'role-1',
        permissions: ['subjects.read', 'grading.read'],
      },
      status: 'authenticated',
    });

    renderDetail();

    expect(await screen.findByRole('link', { name: /Calificar/i })).toBeInTheDocument();
    expect(materiaApi.getMateriaEstudiantes).not.toHaveBeenCalled();
  });

  it('keeps a real 403 visible and permits a retry instead of presenting a false 404', async () => {
    materiaApi.getMateria
      .mockRejectedValueOnce(apiFailure(403, 'No matriculado'))
      .mockResolvedValueOnce(materia);
    const user = userEvent.setup();

    renderDetail();

    expect(await screen.findByText('No tienes acceso a esta materia')).toBeInTheDocument();
    expect(screen.queryByText('Materia no encontrada')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Acceso confirmado')).toBeInTheDocument();
    expect(materiaApi.getMateria).toHaveBeenCalledTimes(2);
    expect(materiaApi.getMateriaEstudiantes).not.toHaveBeenCalled();
  });

  it('offers an explicit mobile section selector with only authorized destinations', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    const user = userEvent.setup();

    renderDetail();

    const sectionSelect = await screen.findByRole('combobox', { name: 'Sección de la materia' });
    expect(sectionSelect).toHaveValue('/app/materias/materia-1');
    expect(screen.queryByRole('option', { name: 'Calificar' })).not.toBeInTheDocument();

    await user.selectOptions(sectionSelect, '/app/materias/materia-1/evaluaciones');

    expect(await screen.findByText('Evaluaciones confirmadas')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sección de la materia' })).toHaveValue('/app/materias/materia-1/evaluaciones');
  });
});
