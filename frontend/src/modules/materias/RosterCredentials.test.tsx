import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterCredentials } from './RosterCredentials';
import type { RosterConfirmation } from './rosterImportApi';
import { useAuth } from '@/stores/auth';
import { downloadCsv } from '@/lib/csvExport';
vi.mock('@/lib/csvExport', () => ({ downloadCsv: vi.fn() }));

const result: RosterConfirmation = { creados: 2, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true,
  credenciales: [{ estudiante_id: 'a', nombre: 'Ana', email: 'ana@example.test', password_temporal: 'Ficticia-A' }, { estudiante_id: 'b', nombre: 'Luis', email: 'luis@example.test', password_temporal: 'Ficticia-B' }] };
beforeEach(() => { vi.clearAllMocks(); useAuth.setState({ user: { id: 'teacher', permissions: ['subjects.update'] } as never, status: 'authenticated' }); });
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
