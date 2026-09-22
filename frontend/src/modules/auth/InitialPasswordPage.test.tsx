import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitialPasswordPage } from './InitialPasswordPage';
import { useAuth } from '@/stores/auth';
import { routes } from '@/config/routes';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, post: mocks.post } };
});
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.setState({
    user: { id: 'student-1', nombre: 'Alumno', email: 'alumno@example.test', rol: 'estudiante', estado: 'activo', debe_cambiar_password: true },
    status: 'authenticated',
    fetchMe: vi.fn().mockResolvedValue(undefined),
  });
});

describe('InitialPasswordPage', () => {
  it('saves a personal password before entering the app', async () => {
    mocks.post.mockResolvedValue({ data: {} });
    render(<MemoryRouter initialEntries={[routes.initialPassword]}><Routes><Route path={routes.initialPassword} element={<InitialPasswordPage />} /><Route path={routes.app} element={<p>Panel estudiantil</p>} /></Routes></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Nueva contraseña'), 'NuevaClave123!');
    await userEvent.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave123!');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y entrar' }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith('/auth/initial-password', { password: 'NuevaClave123!', password_confirmation: 'NuevaClave123!' }));
    expect(await screen.findByText('Panel estudiantil')).toBeInTheDocument();
  });
});
