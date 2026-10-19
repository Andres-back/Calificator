import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MateriaRecursos } from './MateriaRecursos';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({ listMateriaResources: vi.fn() }));

vi.mock('@/modules/herramientas/api', () => ({
  listMateriaResources: mocks.listMateriaResources,
  pdfUrl: (id: string) => '/api/herramientas/' + id + '/pdf',
}));

vi.mock('./MateriaContext', () => ({
  useMateriaContext: () => ({
    materia: { id: 'materia-1', nombre: 'Matemáticas' },
    canManageMateria: true,
  }),
}));

function resource(id: string, assignment: null | 'apoyo' | 'actividad', visible: boolean, reception?: boolean) {
  return {
    id,
    tipo: 'taller',
    titulo: 'Recurso ' + id,
    materia_id: 'materia-1',
    materia_nombre: 'Matemáticas',
    contenido_json: {},
    archivo_url: null,
    created_at: '2026-08-22T00:00:00Z',
    updated_at: '2026-08-22T00:00:00Z',
    asignacion_tipo: assignment,
    publicado_estudiantes: visible,
    fecha_publicacion: visible ? '2026-08-22T00:00:00Z' : null,
    evaluacion_id: assignment === 'actividad' ? 'evaluation-1' : null,
    evaluacion_estado: assignment === 'actividad' ? 'publicada' : null,
    evaluacion_modalidad: assignment === 'actividad' ? 'fisica' : null,
    evaluacion_recepcion_habilitada: reception ?? null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: {
      id: 'profesor-1',
      nombre: 'Docente',
      email: 'docente@example.com',
      rol: 'profesor',
      estado: 'activo',
      permissions: ['resources.read', 'resources.create', 'resources.update', 'resources.assign'],
    },
    status: 'authenticated',
  });
  mocks.listMateriaResources.mockResolvedValue([
    resource('draft', null, false),
    resource('support', 'apoyo', true),
    resource('activity', 'actividad', true, true),
  ]);
});

describe('recursos canónicos de la materia', () => {
  it('muestra borrador, apoyo y actividad sin duplicar identidades', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><MateriaRecursos /></QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Recurso draft')).toBeInTheDocument();
    expect(screen.getByText('Recurso support')).toBeInTheDocument();
    expect(screen.getByText('Recurso activity')).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Apoyo visible')).toBeInTheDocument();
    expect(screen.getByText('Actividad · recibe entregas')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Ver recurso' })).toHaveLength(3);
    expect(document.querySelector('a button')).not.toBeInTheDocument();
  });

  it('preserves student read routes and does not expose author administration', async () => {
    useAuth.setState(state => ({ user: { ...state.user!, rol: 'estudiante', permissions: ['resources.read'] } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><MateriaRecursos /></QueryClientProvider></MemoryRouter>);
    const links = await screen.findAllByRole('link', { name: 'Ver recurso' });
    expect(links[0]).toHaveAttribute('href', '/app/recursos/draft');
    expect(screen.queryByRole('link', { name: 'Crear recurso' })).not.toBeInTheDocument();
  });

  it('keeps a read-only teacher on the teacher reader without offering creation', async () => {
    useAuth.setState(state => ({ user: { ...state.user!, permissions: ['resources.read'] } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<MemoryRouter><QueryClientProvider client={client}><MateriaRecursos /></QueryClientProvider></MemoryRouter>);
    const links = await screen.findAllByRole('link', { name: 'Ver recurso' });
    expect(links[0]).toHaveAttribute('href', '/app/herramientas/draft');
    expect(screen.getByRole('heading', { name: 'Recursos del salón' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear recurso' })).not.toBeInTheDocument();
  });
});
