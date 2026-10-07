import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterCredentials } from './RosterCredentials';
import type { RosterConfirmation } from './rosterImportApi';
import { useAuth } from '@/stores/auth';
import { downloadCsv } from '@/lib/csvExport';
import { RosterAccessDelivery } from './RosterAccessDelivery';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/lib/csvExport', () => ({ downloadCsv: vi.fn() }));
const delivery = vi.hoisted(() => ({ students: vi.fn(), reset: vi.fn() }));
vi.mock('./api', () => ({ getMateriaEstudiantes: delivery.students }));
vi.mock('./rosterImportApi', () => ({ resetTemporaryPassword: delivery.reset }));

const result: RosterConfirmation = { creados: 2, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true,
  credenciales: [{ estudiante_id: 'a', nombre: 'Ana', email: 'ana@example.test', password_temporal: 'Ficticia-A' }, { estudiante_id: 'b', nombre: 'Luis', email: 'luis@example.test', password_temporal: 'Ficticia-B' }] };
beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({ user: { id: 'teacher', permissions: ['subjects.update'] } as never, status: 'authenticated' });
  delivery.students.mockResolvedValue({ id: 'm', nombre: 'Clase', estudiantes: [
    { id: 'a', nombre: 'Ana', email: 'ana@example.test', email_es_interno: true },
    { id: 'b', nombre: 'Luis', email: 'luis@example.test', email_es_interno: true },
    { id: 'c', nombre: 'Personal', email: 'personal@example.test', email_es_interno: false },
  ] });
  delivery.reset.mockImplementation(async (_materia: string, id: string) => ({ estudiante_id: id, email: id + '@example.test', password_temporal: 'Prueba-' + id }));
});
function showDelivery() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RosterAccessDelivery materiaId="m" onClose={vi.fn()} /></QueryClientProvider>);
}
it('only renews selected internal accounts after confirmation and does not renew on download', async () => {
  showDelivery();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('checkbox', { name: 'Seleccionar Luis' }));
  await user.click(screen.getByRole('button', { name: 'Generar nuevas claves y entregar' }));
  expect(screen.getByText(/todas sus materias/)).toBeVisible();
  expect(delivery.reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Cancelar generación' }));
  expect(delivery.reset).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Generar nuevas claves y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar generación' }));
  expect(await screen.findByText('Clave temporal: Prueba-a')).toBeVisible();
  expect(delivery.reset).toHaveBeenCalledExactlyOnceWith('m', 'a');
  await user.click(screen.getByRole('button', { name: 'Descargar accesos CSV' }));
  expect(downloadCsv).toHaveBeenLastCalledWith(expect.any(String), [['Nombre', 'Usuario', 'Clave temporal'], ['Ana', 'a@example.test', 'Prueba-a'], ['Personal', 'personal@example.test', '']]);
  expect(delivery.reset).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Generar nuevas claves y entregar' })).toBeDisabled();
});
it('preserves received keys and stops without retrying when the next result is uncertain', async () => {
  delivery.students.mockResolvedValue({ id: 'm', nombre: 'Clase', estudiantes: [
    { id: 'a', nombre: 'Ana', email: 'ana@example.test', email_es_interno: true },
    { id: 'b', nombre: 'Luis', email: 'luis@example.test', email_es_interno: true },
    { id: 'd', nombre: 'No Intentada', email: 'tercera@example.test', email_es_interno: true },
  ] });
  delivery.reset.mockResolvedValueOnce({ estudiante_id: 'a', email: 'ana@example.test', password_temporal: 'Recibida' }).mockRejectedValueOnce(new Error('Network'));
  showDelivery();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Generar nuevas claves y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar generación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Luis');
  expect(screen.getByRole('alert')).toHaveTextContent(/puede haber cambiado/);
  expect(screen.getByText('Clave temporal: Recibida')).toBeVisible();
  expect(delivery.reset).toHaveBeenCalledTimes(2);
  expect(delivery.reset).not.toHaveBeenCalledWith('m', 'd');
  await user.click(screen.getByRole('button', { name: 'Descargar accesos CSV' }));
  expect(downloadCsv).toHaveBeenLastCalledWith(expect.any(String), expect.arrayContaining([['Ana', 'ana@example.test', 'Recibida'], ['Luis', 'luis@example.test', '']]));
  expect(delivery.reset).toHaveBeenCalledTimes(2);
});
it('does not renew if eligibility changed since the confirmation was opened', async () => {
  showDelivery();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Generar nuevas claves y entregar' }));
  delivery.students.mockResolvedValue({ id: 'm', nombre: 'Clase', estudiantes: [] });
  await user.click(screen.getByRole('button', { name: 'Confirmar generación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/lista cambió/);
  expect(delivery.reset).not.toHaveBeenCalled();
});
it('stops the next renewal and hides keys after logout', async () => {
  let finish!: (value: unknown) => void;
  delivery.reset.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  showDelivery();
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Generar nuevas claves y entregar' }));
  await user.click(screen.getByRole('button', { name: 'Confirmar generación' }));
  await waitFor(() => expect(delivery.reset).toHaveBeenCalledOnce());
  expect(screen.queryByRole('button', { name: 'Cerrar diálogo' })).not.toBeInTheDocument();
  useAuth.setState({ user: null, status: 'unauthenticated' });
  finish({ estudiante_id: 'a', email: 'ana@example.test', password_temporal: 'NoMostrar' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.queryByText(/NoMostrar/)).not.toBeInTheDocument();
  expect(delivery.reset).toHaveBeenCalledOnce();
});
it('exports only selected newly issued passwords', async () => {
  render(<RosterCredentials result={result} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Luis' }));
  await user.click(screen.getByRole('button', { name: 'Descargar accesos CSV' }));
  expect(downloadCsv).toHaveBeenLastCalledWith(expect.any(String), [['Nombre', 'Usuario', 'Clave temporal'], ['Ana', 'ana@example.test', 'Ficticia-A']]);
});
it('exports existing users without inventing or resetting historical passwords', async () => {
  render(<RosterCredentials result={{ ...result, credenciales: [] }} students={[{ estudiante_id: 'a', nombre: 'Ana', email: 'ana@example.test' }]} />);
  expect(screen.getByText(/Clave no disponible/)).toBeVisible();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Descargar accesos CSV' }));
  expect(downloadCsv).toHaveBeenLastCalledWith(expect.any(String), [['Nombre', 'Usuario', 'Clave temporal'], ['Ana', 'ana@example.test', '']]);
});
it('prints only selected private cards and clears the print portal afterwards', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const user = userEvent.setup();
  const view = render(<RosterCredentials result={result} />);
  await user.click(screen.getByRole('checkbox', { name: 'Seleccionar Luis' }));
  await user.click(screen.getByRole('button', { name: 'Imprimir seleccionados' }));
  expect(print).toHaveBeenCalledOnce();
  const portal = document.querySelector('#roster-private-print');
  expect(portal).toHaveTextContent('Ana');
  expect(portal).not.toHaveTextContent('Luis');
  expect(portal).toHaveTextContent('Cambia tu clave al entrar');
  expect(document.body).toHaveClass('roster-printing');
  view.unmount();
  expect(document.querySelector('#roster-private-print')).toBeNull();
  expect(document.body).not.toHaveClass('roster-printing');
});
it('does not persist credentials or expose them after the session changes', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const view = render(<RosterCredentials result={result} />);
  expect(storage).not.toHaveBeenCalled();
  useAuth.setState({ user: null, status: 'unauthenticated' });
  view.rerender(<RosterCredentials result={result} />);
  expect(screen.queryByText('Ficticia-A', { exact: false })).not.toBeInTheDocument();
});
it('removes credentials after the management permission is revoked', () => {
  const view = render(<RosterCredentials result={result} />);
  useAuth.setState({ user: { id: 'teacher', permissions: [] } as never });
  view.rerender(<RosterCredentials result={result} />);
  expect(screen.queryByRole('button', { name: 'Descargar accesos CSV' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Ficticia-A/)).not.toBeInTheDocument();
});
