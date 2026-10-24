import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DetailPage } from './DetailPage';
import { useAuth } from '@/stores/auth';

const mocks = vi.hoisted(() => ({ getMaterial: vi.fn(), listMaterialEvaluaciones: vi.fn(), editMaterial: vi.fn(), deleteMaterial: vi.fn(), duplicateMaterial: vi.fn(), assignMaterialAsSupport: vi.fn(), setMaterialVisibility: vi.fn(), convertToEvaluacion: vi.fn() }));
vi.mock('./api', () => ({ ...mocks, pdfUrl: (id: string, solutions = false, download = false) => `/api/herramientas/${id}/pdf?soluciones=${solutions}&descargar=${download}` }));
vi.mock('@/modules/materias/MateriaSelect', () => ({ useMaterias: () => ({ data: [{ id: 'math', nombre: 'Matemáticas' }] }) }));
vi.mock('./views', () => ({ ContenidoView: ({ data }: { data: { texto: string } }) => <p>{data.texto}</p>, CrucigramaView: () => <p>Crucigrama</p>, SopaLetrasView: () => <p>Sopa</p>, MatchingView: () => <p>Pares</p> }));

const original = { id: 'guide', titulo: 'Fracciones', tipo: 'guia', materia_id: 'math', materia_nombre: 'Matemáticas', contenido_json: { titulo: 'Fracciones', texto: 'Contenido completo para leer', extra_oculto: { original: [1, 2] }, criterios: [{ nombre: 'Comprende', descripcion: 'Explica el procedimiento', peso_porcentaje: 100 }], _xcalificator: { errores_criterios: [] } }, asignacion_tipo: null, archivo_url: null, created_at: '' };
const permissions = ['resources.read', 'resources.update', 'resources.assign', 'resources.create', 'resources.delete', 'evaluations.read', 'evaluations.create'];
function setup(path = '/app/herramientas/guide') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/app/herramientas/:id', element: <DetailPage /> }, { path: '/app/herramientas', element: <p>Biblioteca</p> }], { initialEntries: [path] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, client };
}
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ status: 'authenticated', user: { id: 'teacher', nombre: 'Docente', email: 'test@example.com', rol: 'profesor', estado: 'activo', permissions } });
  mocks.getMaterial.mockResolvedValue(structuredClone(original));
  mocks.listMaterialEvaluaciones.mockResolvedValue([]);
  mocks.editMaterial.mockResolvedValue(original);
});
describe('resource reading and authorized actions', () => {
  it('keeps content first and prepares distinct documents only after choosing', async () => {
    setup();
    expect(await screen.findByText('Contenido completo para leer')).toBeInTheDocument();
    await screen.findByRole('button', { name: 'Editar contenido' });
    expect(screen.queryByRole('link', { name: 'Solucionario docente' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    expect(screen.getByRole('link', { name: 'PDF para estudiantes' })).toHaveAttribute('href', expect.stringContaining('soluciones=false'));
    expect(screen.getByRole('link', { name: 'Solucionario docente' })).toHaveAttribute('href', expect.stringContaining('soluciones=true'));
    expect(screen.getByRole('link', { name: 'Abrir PDF para imprimir sin respuestas' })).toHaveAttribute('href', expect.stringContaining('soluciones=false'));
    for (const method of ['editMaterial', 'deleteMaterial', 'duplicateMaterial', 'assignMaterialAsSupport'] as const) expect(mocks[method]).not.toHaveBeenCalled();
  });
  it('does not infer foreign ownership from admin permissions or edit URL', async () => {
    mocks.listMaterialEvaluaciones.mockRejectedValue({ response: { status: 404 } });
    useAuth.setState(state => ({ user: { ...state.user!, rol: 'admin' } }));
    setup('/app/herramientas/guide?action=edit');
    await screen.findByText('Contenido completo para leer');
    expect(screen.queryByRole('button', { name: 'Editar contenido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar' }));
    expect(screen.queryByRole('link', { name: 'Solucionario docente' })).not.toBeInTheDocument();
  });
  it('distinguishes failed reading and offers retry', async () => {
    mocks.getMaterial.mockRejectedValueOnce({ response: { status: 503 } });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Volver a intentar' }));
    await screen.findByText('Contenido completo para leer');
  });
  it('preserves critical criteria warnings even in compact reading', async () => {
    mocks.getMaterial.mockResolvedValue({ ...original, contenido_json: { ...original.contenido_json, _xcalificator: { errores_criterios: ['Revisa el peso de los criterios'] } } });
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa el peso de los criterios');
  });
});
describe('resource editing without data loss', () => {
  it('opens a focused panel, confirms discard and retains edits after failed save', async () => {
    mocks.editMaterial.mockRejectedValueOnce(new Error('network'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar contenido' }));
    const panel = screen.getByRole('dialog', { name: 'Editar recurso' });
    await waitFor(() => expect(within(panel).getByRole('heading', { name: 'Editar recurso' })).toHaveFocus());
    fireEvent.change(within(panel).getByLabelText('Título del recurso'), { target: { value: 'Título cambiado' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mocks.editMaterial).toHaveBeenCalledTimes(1));
    expect(within(panel).getByLabelText('Título del recurso')).toHaveValue('Título cambiado');
    expect(mocks.editMaterial.mock.calls[0][1].contenido_json.extra_oculto).toEqual(original.contenido_json.extra_oculto);
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancelar' }));
    const confirmation = screen.getByRole('dialog', { name: '¿Descartar los cambios?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Seguir editando' }));
    expect(within(panel).getByLabelText('Título del recurso')).toHaveValue('Título cambiado');
  });
  it('sends a single save and ignores completion after account switch', async () => {
    let resolve!: (value: unknown) => void;
    mocks.editMaterial.mockReturnValue(new Promise(done => { resolve = done; }));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar contenido' }));
    fireEvent.change(screen.getByLabelText('Título del recurso'), { target: { value: 'Fracciones actualizadas' } });
    const save = screen.getByRole('button', { name: 'Guardar cambios' });
    fireEvent.click(save); fireEvent.click(save);
    expect(mocks.editMaterial).toHaveBeenCalledTimes(1);
    act(() => useAuth.setState(state => ({ user: { ...state.user!, id: 'other', permissions: ['resources.read'] } })));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar recurso' })).not.toBeInTheDocument());
    await act(async () => resolve(original));
    expect(screen.queryByRole('dialog', { name: 'Editar recurso' })).not.toBeInTheDocument();
  });
});
