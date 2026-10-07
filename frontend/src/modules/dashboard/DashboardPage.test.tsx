import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { useAuth } from '@/stores/auth';
import { markTourCompleted } from '@/components/ui/tourState';

const mocks = vi.hoisted(() => ({ listMaterials: vi.fn(), listMaterias: vi.fn(), getBandejaDocente: vi.fn() }));
vi.mock('@/modules/herramientas/api', () => ({ listMaterials: mocks.listMaterials }));
vi.mock('@/modules/materias/api', () => ({ listMaterias: mocks.listMaterias }));
vi.mock('@/modules/calificaciones/api', () => ({ getBandejaDocente: mocks.getBandejaDocente }));
vi.mock('./DashboardEstudiante', () => ({ DashboardEstudiante: () => <p>Inicio estudiante</p> }));
vi.mock('./DashboardAdmin', () => ({ DashboardAdmin: () => <p>Inicio admin</p> }));

function renderDashboard() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  markTourCompleted({ tourId: 'teacher-home', role: 'profesor', version: 1 });
  mocks.listMaterials.mockResolvedValue([]);
  mocks.listMaterias.mockResolvedValue([{ id: 'materia-1', nombre: 'Matemáticas', grado: '8°', estado: 'activa' }]);
  mocks.getBandejaDocente.mockResolvedValue({ reclamos_abiertos: 0, pendientes_revision: 0, reclamos: [], pendientes: [] });
  useAuth.setState({ user: {
    id: 'profesor-1', nombre: 'Profesor Demo', email: 'teacher@example.test', rol: 'profesor', estado: 'activo',
    permissions: ['subjects.read', 'subjects.create', 'evaluations.read', 'attendance.manage', 'grading.read', 'submissions.review', 'resources.read', 'resources.create'],
  }, status: 'authenticated' });
});

describe('DashboardPage docente', () => {
  it('prioritizes contextual subject actions without a global grading shortcut', async () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: 'Hola, Profesor' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Evaluaciones de Matemáticas' })).toHaveAttribute('href', '/app/materias/materia-1/evaluaciones');
    expect(screen.getByRole('link', { name: 'Asistencia de Matemáticas' })).toHaveAttribute('href', '/app/materias/materia-1/asistencia');
    expect(screen.queryByRole('link', { name: /Calificar evidencia/ })).not.toBeInTheDocument();
    expect(mocks.listMaterials).not.toHaveBeenCalled();
  });
  it('opens pending cases only on request and retains the review destination', async () => {
    mocks.getBandejaDocente.mockResolvedValue({ reclamos_abiertos: 1, pendientes_revision: 1, pendientes: [], reclamos: [{
      id: 'c1', tipo: 'solicitud_revision', calificacion_id: 'g1', evaluacion_id: 'e1', estudiante_nombre: 'Ana Prueba',
      materia_nombre: 'Matemáticas', evaluacion_nombre: 'Fracciones', motivo: 'nota',
    }] });
    renderDashboard();
    const button = await screen.findByRole('button', { name: /Ver pendientes/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByRole('link', { name: /Revisar Ana Prueba/ })).toHaveAttribute('href', '/app/calificaciones?evaluacion=e1&calificacion=g1');
  });
  it('filters thirty subjects and clears no-results without server searches', async () => {
    mocks.listMaterias.mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({ id: 'm' + i, nombre: 'Grupo ' + i, estado: 'activa' })));
    renderDashboard();
    await screen.findByText('Grupo 29');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar materia' }), 'inexistente');
    expect(screen.getByText('No encontramos esa materia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(screen.getByText('Grupo 29')).toBeInTheDocument();
    expect(mocks.listMaterias).toHaveBeenCalledOnce();
  });
  it('keeps subjects available when inbox and secondary resources fail', async () => {
    mocks.getBandejaDocente.mockRejectedValue(new Error('Unavailable'));
    mocks.listMaterials.mockRejectedValue(new Error('Unavailable'));
    renderDashboard();
    expect(await screen.findByText('No pudimos actualizar la bandeja')).toBeInTheDocument();
    expect(screen.queryByText('Todo al día')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Herramientas y recursos/ }));
    expect(await screen.findByText('No pudimos cargar los materiales')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Evaluaciones de Matemáticas' })).toBeInTheDocument();
  });
  it('distinguishes empty subjects from errors with an independent retry', async () => {
    mocks.listMaterias.mockRejectedValue(new Error('Unavailable'));
    renderDashboard();
    expect(await screen.findByText('No pudimos cargar tus materias')).toBeInTheDocument();
    expect(screen.queryByText('Crea tu primera materia')).not.toBeInTheDocument();
    mocks.listMaterias.mockResolvedValue([]);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar materias' }));
    expect(await screen.findByText('Crea tu primera materia')).toBeInTheDocument();
  });
  it('respects limited permissions and shows the complete long name', async () => {
    const longName = 'Lectura y comprensión de textos para estudiantes de primaria';
    mocks.listMaterias.mockResolvedValue([{ id: 'm1', nombre: longName, estado: 'activa' }]);
    useAuth.setState({ user: { ...useAuth.getState().user!, custom_role_id: 'limited', permissions: ['subjects.read', 'evaluations.read'] } });
    renderDashboard();
    expect(await screen.findByText(longName)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Asistencia de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Nueva materia/ })).not.toBeInTheDocument();
    expect(mocks.getBandejaDocente).not.toHaveBeenCalled();
  });
  it('can reopen and omit the existing guide', async () => {
    renderDashboard();
    await screen.findByText('Matemáticas');
    await userEvent.click(screen.getByRole('button', { name: 'Cómo empezar' }));
    expect(await screen.findByText('Empieza por tu materia')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Saltar/ }));
    expect(screen.queryByText('Empieza por tu materia')).not.toBeInTheDocument();
  });
  it.each(['admin', 'estudiante'] as const)('preserves the %s home', (rol) => {
    useAuth.setState({ user: { ...useAuth.getState().user!, rol } });
    renderDashboard();
    expect(screen.getByText('Inicio ' + rol)).toBeInTheDocument();
    expect(mocks.listMaterias).not.toHaveBeenCalled();
  });
});
