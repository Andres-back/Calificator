import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterPage } from './RegisterPage';

const auth = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('@/stores/auth', () => ({ useAuth: (selector: (state: unknown) => unknown) => selector(auth) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));

describe('RegisterPage', () => {
  beforeEach(() => { vi.clearAllMocks(); auth.register.mockResolvedValue({ rol: 'estudiante' }); });

  it('sends teacher intent without allowing a public role', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterPage /></MemoryRouter>);
    await user.type(screen.getByLabelText(/Nombre completo/), 'Ana Docente');
    await user.type(screen.getByLabelText(/Correo electrónico/), 'ana@example.com');
    await user.type(screen.getByLabelText(/^Contraseña/), 'Password123!');
    await user.type(screen.getByLabelText(/Confirmar contraseña/), 'Password123!');
    await user.click(screen.getByRole('checkbox', { name: /Solicitar acceso como docente/ }));
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));

    await waitFor(() => expect(auth.register).toHaveBeenCalledWith({
      nombre: 'Ana Docente',
      email: 'ana@example.com',
      password: 'Password123!',
      solicitar_docente: true,
    }));
    expect(auth.register.mock.calls[0][0]).not.toHaveProperty('rol');
  });
});
