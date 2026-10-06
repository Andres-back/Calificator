import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RosterCredentials } from './RosterCredentials';
import type { RosterConfirmation } from './rosterImportApi';
import { useAuth } from '@/stores/auth';

const result: RosterConfirmation = { creados: 2, matriculados_existentes: 0, ya_matriculados: 0, omitidos: 0, credenciales_mostradas_una_vez: true,
  credenciales: [{ estudiante_id: 'a', nombre: 'Ana', email: 'ana@example.test', password_temporal: 'Ficticia-A' }, { estudiante_id: 'b', nombre: 'Luis', email: 'luis@example.test', password_temporal: 'Ficticia-B' }] };
beforeEach(() => { useAuth.setState({ user: { id: 'teacher' } as never, status: 'authenticated' }); });
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
