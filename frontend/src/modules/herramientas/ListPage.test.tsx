import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListPage } from './ListPage';

const mocks = vi.hoisted(() => ({
  listMaterials: vi.fn(), deleteMaterial: vi.fn(), duplicateMaterial: vi.fn(),
}));

vi.mock('./api', () => ({
  listMaterials: mocks.listMaterials,
  deleteMaterial: mocks.deleteMaterial,
  duplicateMaterial: mocks.duplicateMaterial,
  pdfUrl: (id: string) => '/api/herramientas/' + id + '/pdf',
}));

function resource(id: string, assignment: null | 'apoyo' | 'actividad', visible: boolean, reception?: boolean) {
  return {
    id, tipo: 'taller', titulo: 'Recurso ' + id, materia_id: 'materia-1',
    materia_nombre: 'Matemáticas', contenido_json: {}, archivo_url: null,
    created_at: '2026-08-22T00:00:00Z', updated_at: '2026-08-22T00:00:00Z',
    asignacion_tipo: assignment, publicado_estudiantes: visible,
    fecha_publicacion: visible ? '2026-08-22T00:00:00Z' : null,
    evaluacion_id: assignment === 'actividad' ? 'evaluation-1' : null,
    evaluacion_estado: assignment === 'actividad' ? 'publicada' : null,
    evaluacion_modalidad: assignment === 'actividad' ? 'fisica' : null,
    evaluacion_recepcion_habilitada: reception ?? null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listMaterials.mockResolvedValue([
    resource('draft', null, false),
    resource('support', 'apoyo', true),
    resource('activity', 'actividad', true, false),
  ]);
});

describe('resource library lifecycle', () => {
  it('shows one coherent state per canonical resource', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><ListPage /></QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Borrador')).toBeInTheDocument();
    expect(screen.getByText('Apoyo visible')).toBeInTheDocument();
    expect(screen.getByText('Actividad · entregas cerradas')).toBeInTheDocument();
    expect(screen.queryByText('Apoyo publicado')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Asignar|Administrar|Abrir actividad/ })).toHaveLength(3);
    for (const icon of ['resources', 'interactive-games', 'archived-drafts', 'pdf-ready', 'prepare-evaluation']) {
      expect(document.querySelector(`[data-educational-icon="${icon}"]`)).toBeInTheDocument();
    }
  });

  it('filters locally and keeps occasional actions in an accessible menu', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><ListPage /></QueryClientProvider>
      </MemoryRouter>,
    );

    await screen.findByText('Recurso draft');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar recursos' }), { target: { value: 'support' } });
    expect(screen.getByText('Recurso support')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Recurso draft')).not.toBeInTheDocument());
    expect(screen.getByText('1 resultado')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Más acciones para Recurso support' }));
    expect(screen.getByRole('menuitem', { name: 'Descargar PDF' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Duplicar recurso' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Eliminar recurso' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });
});
