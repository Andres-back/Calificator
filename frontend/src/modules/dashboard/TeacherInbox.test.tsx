import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeacherInbox } from './TeacherInbox';
import { useAuth } from '@/stores/auth';
import type { BandejaDocenteItem, BandejaDocenteRead } from '@/types/api';

const getBandejaDocente = vi.hoisted(() => vi.fn());
vi.mock('@/modules/calificaciones/api', () => ({ getBandejaDocente }));

const item: BandejaDocenteItem = {
  id: 'pending-1', tipo: 'calificacion_pendiente', calificacion_id: 'c1', evaluacion_id: 'e1',
  evaluacion_nombre: 'Lectura de prueba', materia_id: 'm1', materia_nombre: 'Lenguaje',
  estudiante_id: 's1', estudiante_nombre: 'Estudiante sintético', estado: 'requiere_revision',
  motivo: null, descripcion: null, created_at: '2026-10-30T00:00:00Z',
};
const inbox: BandejaDocenteRead = { reclamos_abiertos: 0, pendientes_revision: 100, reclamos: [], pendientes: [item] };
const clients: QueryClient[] = [];

function renderInbox(compact = false, client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  clients.push(client);
  return { client, ...render(<QueryClientProvider client={client}><MemoryRouter><TeacherInbox compact={compact} /></MemoryRouter></QueryClientProvider>) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getBandejaDocente.mockResolvedValue(inbox);
  useAuth.setState({ user: { id: 'p1', nombre: 'Docente de prueba', email: 'teacher@example.test', rol: 'profesor', estado: 'activo', permissions: ['submissions.review', 'grading.read', 'subjects.read'] }, status: 'authenticated' });
});
afterEach(() => clients.splice(0).forEach(client => client.clear()));

describe('138 TeacherInbox', () => {
  it.each([{ permissions: null }, { permissions: [] as string[] }, { permissions: ['grading.read', 'subjects.read'] }])('sin permiso no consulta ni muestra datos cacheados ($permissions)', async ({ permissions }) => {
    useAuth.setState({ user: permissions == null ? null : { ...useAuth.getState().user!, permissions } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['bandeja-docente'], inbox);
    const { container } = renderInbox(false, client);
    await act(async () => { await Promise.resolve(); });
    expect(getBandejaDocente).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it('oculta la muestra al revocar permiso y no vuelve a consultar por invalidación', async () => {
    const { client, container } = renderInbox();
    await screen.findByRole('link', { name: 'Revisar Estudiante sintético en Lectura de prueba' });
    await act(async () => { useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['grading.read'] } }); });
    expect(container).toBeEmptyDOMElement();
    await act(async () => { await client.invalidateQueries({ queryKey: ['bandeja-docente'] }); });
    expect(getBandejaDocente).toHaveBeenCalledOnce();
    expect(screen.queryByText('Estudiante sintético')).not.toBeInTheDocument();
  });

  it('una respuesta tardía no reaparece tras revocación; se puede conceder permiso sin cambiar el orden de hooks', async () => {
    let finish!: (value: BandejaDocenteRead) => void;
    getBandejaDocente.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { container } = renderInbox();
    await waitFor(() => expect(getBandejaDocente).toHaveBeenCalledOnce());
    await act(async () => { useAuth.setState({ user: { ...useAuth.getState().user!, permissions: [] } }); finish(inbox); });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Estudiante sintético')).not.toBeInTheDocument();
    getBandejaDocente.mockResolvedValue(inbox);
    await act(async () => { useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['submissions.review', 'grading.read'] } }); });
    expect(await screen.findByRole('link', { name: 'Revisar Estudiante sintético en Lectura de prueba' })).toBeVisible();
  });

  it.each([false, true])('declara muestra y total, y conserva el contexto autorizado (compacto=%s)', async compact => {
    renderInbox(compact);
    if (compact) await userEvent.click(await screen.findByRole('button', { name: 'Ver pendientes' }));
    expect(await screen.findByText('Mostrando 1 de 100 casos')).toBeVisible();
    const link = screen.getByRole('link', { name: 'Revisar Estudiante sintético en Lectura de prueba' });
    expect(link).toHaveAttribute('href', '/app/materias/m1/evaluaciones/e1/revision?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
    expect(screen.queryByText('Reclamos y solicitudes')).not.toBeInTheDocument();
    expect(getBandejaDocente).toHaveBeenCalledOnce();
  });

  it('sin subjects.read conserva enlace global permitido con todas las referencias', async () => {
    useAuth.setState({ user: { ...useAuth.getState().user!, permissions: ['submissions.review', 'grading.read'] } });
    renderInbox();
    expect(await screen.findByRole('link', { name: 'Revisar Estudiante sintético en Lectura de prueba' })).toHaveAttribute('href', '/app/calificaciones?materia=m1&evaluacion=e1&calificacion=c1&estudiante=s1');
  });

  it('muestra conteos por lista sin atribuir el total global a la evaluación de la muestra ni hacer N+1', async () => {
    getBandejaDocente.mockResolvedValue({ ...inbox, reclamos_abiertos: 2, reclamos: [{ ...item, id: 'claim-1', tipo: 'solicitud_revision', motivo: 'evidencia' }], pendientes: Array.from({ length: 8 }, (_, i) => ({ ...item, id: `p${i}`, calificacion_id: `c${i}`, estudiante_id: `s${i}` })) });
    renderInbox();
    expect(await screen.findByText('Mostrando 8 de 100 casos')).toBeVisible();
    expect(screen.getByText('Mostrando 1 de 2 casos')).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(9);
    expect(getBandejaDocente).toHaveBeenCalledOnce();
  });

  it('también declara la muestra cuando todos los casos están incluidos', async () => {
    getBandejaDocente.mockResolvedValue({ ...inbox, pendientes_revision: 1 });
    renderInbox();
    expect(await screen.findByText('Mostrando 1 de 1 casos')).toBeVisible();
  });

  it('cero casos es un vacío real y un contador positivo sin detalle no se presenta como todo al día', async () => {
    getBandejaDocente.mockResolvedValue({ ...inbox, pendientes_revision: 0, pendientes: [] });
    const { client } = renderInbox();
    expect(await screen.findByText('Tu bandeja está al día')).toBeVisible();
    getBandejaDocente.mockResolvedValue({ ...inbox, pendientes: [] });
    await act(async () => { await client.invalidateQueries({ queryKey: ['bandeja-docente'] }); });
    expect(await screen.findByText('Hay casos pendientes, pero no pudimos mostrar su detalle.')).toBeVisible();
    expect(screen.queryByText('Tu bandeja está al día')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar casos' })).toBeEnabled();
  });

  it('un error sigue visible y puede reintentarse sin afirmar que no hay pendientes', async () => {
    getBandejaDocente.mockRejectedValueOnce(new Error('synthetic offline'));
    renderInbox();
    expect(await screen.findByText('No pudimos actualizar la bandeja')).toBeVisible();
    expect(screen.queryByText('Tu bandeja está al día')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }));
    expect(await screen.findByText('Mostrando 1 de 100 casos')).toBeVisible();
    expect(getBandejaDocente).toHaveBeenCalledTimes(2);
  });
});
