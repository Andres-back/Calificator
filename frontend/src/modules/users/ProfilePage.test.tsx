import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { useAuth } from '@/stores/auth';
import { AxiosError } from 'axios';

const mocks = vi.hoisted(() => ({ update: vi.fn(), fetchMe: vi.fn(), clear: vi.fn() }));
vi.mock('./api', () => ({ updateMyProfile: mocks.update }));
const teacher = { id: 't1', nombre: 'Docente', email: 'docente@example.com', rol: 'profesor', permissions: ['subjects.read'] };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue(teacher);
  mocks.fetchMe.mockResolvedValue(undefined);
  useAuth.setState({ user: teacher as never, status: 'authenticated', fetchMe: mocks.fetchMe, clearSession: mocks.clear });
});
function show() { return render(<MemoryRouter initialEntries={['/app/perfil']}><Routes><Route path="/app/perfil" element={<ProfilePage />} /><Route path="/login" element={<p>Nuevo inicio de sesión</p>} /></Routes></MemoryRouter>); }
it('sends only the changed name and refreshes effective identity', async () => {
  show(); const user = userEvent.setup();
  const name = screen.getByRole('textbox', { name: 'Nombre completo' });
  await user.clear(name); await user.type(name, 'Docente actualizada');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ nombre: 'Docente actualizada' }));
  expect(mocks.fetchMe).toHaveBeenCalledOnce();
  expect(mocks.clear).not.toHaveBeenCalled();
});
it('preserves the draft and session on an incorrect current password', async () => {
  mocks.update.mockRejectedValue(new AxiosError('Invalid', undefined, undefined, undefined, { status: 422, data: { detail: 'La contraseña actual no es correcta' } } as never));
  show(); const user = userEvent.setup();
  const email = screen.getByRole('textbox', { name: 'Correo de acceso' });
  await user.clear(email); await user.type(email, 'nuevo@example.com');
  await user.type(screen.getByLabelText('Contraseña actual'), 'Incorrecta');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual no es correcta');
  expect(email).toHaveValue('nuevo@example.com');
  expect(mocks.clear).not.toHaveBeenCalled();
  expect(mocks.fetchMe).not.toHaveBeenCalled();
});
it('validates confirmation locally and clears private session after a successful password change', async () => {
  show(); const user = userEvent.setup();
  await user.click(screen.getByText('Cambiar contraseña'));
  await user.type(screen.getByLabelText('Contraseña actual'), 'Original-Ficticia!');
  await user.type(screen.getByLabelText('Nueva contraseña'), 'Nueva-Ficticia!');
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Diferente-Ficticia!');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(mocks.update).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Las contraseñas no coinciden');
  await user.clear(screen.getByLabelText('Confirmar nueva contraseña'));
  await user.type(screen.getByLabelText('Confirmar nueva contraseña'), 'Nueva-Ficticia!');
  await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByText('Nuevo inicio de sesión')).toBeVisible();
  expect(mocks.clear).toHaveBeenCalledOnce();
  expect(mocks.fetchMe).not.toHaveBeenCalled();
});
