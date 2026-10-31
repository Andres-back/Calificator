import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  it('095 muestra el grado docente sin desplegar información secundaria', async () => {
    materiaApi.getMateriaEstudiantes.mockResolvedValue({ ...materia, estudiantes: [] });
    useAuth.setState({ user: { id: 'p1', nombre: 'Docente', email: 'p@example.test', rol: 'profesor', estado: 'activo', permissions: ['subjects.read', 'evaluations.read'] } });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Grado 7')).toBeVisible());
    expect(screen.getByText('Información de la materia').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'Ciencias' })).toBeVisible();
  });
  it('keeps secondary subject information folded while navigation stays available', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    renderDetail();
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ciencias' })).toBeVisible());
    expect(screen.getByText('Información de la materia').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('navigation', { name: 'Secciones de la materia' })).toHaveClass('flex');
    expect(screen.queryByRole('combobox', { name: 'Sección de la materia' })).not.toBeInTheDocument();
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

  it('138 ofrece secciones visibles y deslizables con solo destinos autorizados', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    const user = userEvent.setup();

    renderDetail();

    const sections = await screen.findByRole('navigation', { name: 'Secciones de la materia' });
    expect(sections).toHaveClass('flex', 'overflow-x-auto');
    expect(sections).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: /Vista general/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: 'Calificar' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Evaluaciones/ }));

    expect(await screen.findByText('Evaluaciones confirmadas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Evaluaciones/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Vista general/ })).not.toHaveAttribute('aria-current');
  });

  it('138 revela la sección activa solo en la fila horizontal y conserva la posición vertical', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    const user = userEvent.setup();
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('aria-label') === 'Secciones de la materia') return { left: 0, right: 250, top: 420, bottom: 476, width: 250, height: 56, x: 0, y: 420, toJSON: () => ({}) };
      if (this.getAttribute('aria-current') === 'page' && this.textContent?.includes('Evaluaciones')) return { left: 400, right: 580, top: 420, bottom: 476, width: 180, height: 56, x: 400, y: 420, toJSON: () => ({}) };
      return originalRect.call(this);
    });
    try {
      renderDetail();
      const sections = await screen.findByRole('navigation', { name: 'Secciones de la materia' });
      const verticalPosition = window.scrollY;
      expect(sections.scrollLeft).toBe(0);
      await user.click(screen.getByRole('link', { name: /Evaluaciones/ }));
      expect(await screen.findByText('Evaluaciones confirmadas')).toBeInTheDocument();
      expect(sections.scrollLeft).toBe(330);
      expect(window.scrollY).toBe(verticalPosition);
    } finally { rect.mockRestore(); }
  });

  it('138 mantiene la pestaña activa a la vista cuando la fila se estrecha', async () => {
    materiaApi.getMateria.mockResolvedValue(materia);
    let resized: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) { resized = callback; }
      observe() {}
      unobserve() {}
      disconnect = disconnect;
    });
    const originalRect = HTMLElement.prototype.getBoundingClientRect;
    let narrowed = false;
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.getAttribute('aria-label') === 'Secciones de la materia') return { left: 0, right: narrowed ? 100 : 300, top: 420, bottom: 476, width: narrowed ? 100 : 300, height: 56, x: 0, y: 420, toJSON: () => ({}) };
      if (this.getAttribute('aria-current') === 'page') return { left: 20, right: 160, top: 420, bottom: 476, width: 140, height: 56, x: 20, y: 420, toJSON: () => ({}) };
      return originalRect.call(this);
    });
    try {
      const rendered = renderDetail();
      const sections = await screen.findByRole('navigation', { name: 'Secciones de la materia' });
      expect(sections.scrollLeft).toBe(0);
      expect(resized).toBeTypeOf('function');
      narrowed = true;
      act(() => resized?.([], {} as ResizeObserver));
      expect(sections.scrollLeft).toBe(60);
      rendered.unmount();
      expect(disconnect).toHaveBeenCalled();
    } finally { rect.mockRestore(); vi.unstubAllGlobals(); }
  });
});
