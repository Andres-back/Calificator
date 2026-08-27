import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';

const api = vi.hoisted(() => ({ getAdminUsers: vi.fn(), resolveTeacherRequest: vi.fn(), updateAdminUser: vi.fn() }));
vi.mock('./usersApi', () => api);
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const pending = {
  id: 'user-1', nombre: 'Ana Aspirante', email: 'ana@example.com', rol: 'estudiante',
  estado: 'activo', solicitud_docente_estado: 'pendiente', created_at: '2026-08-24', updated_at: '2026-08-24',
};

const admin = {
  ...pending, id: 'admin-1', nombre: 'Admin Principal', email: 'admin@example.com', rol: 'admin',
  solicitud_docente_estado: null,
};

function renderPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminUsersPage /></QueryClientProvider>);
}

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getAdminUsers.mockResolvedValue([pending]);
    api.resolveTeacherRequest.mockResolvedValue({ ...pending, rol: 'profesor', solicitud_docente_estado: 'aprobada' });
    api.updateAdminUser.mockResolvedValue({ ...pending, rol: 'profesor' });
  });

  it('approves a pending teacher request from the admin inbox', async () => {
    const user = userEvent.setup();
    renderPage();
    expect((await screen.findAllByText('Ana Aspirante')).length).toBeGreaterThan(0);
    await user.type(screen.getByPlaceholderText('Ej.: identidad docente validada'), 'Identidad validada');
    await user.click(screen.getByRole('button', { name: /Aprobar docente/ }));
    await waitFor(() => expect(api.resolveTeacherRequest).toHaveBeenCalledWith('user-1', {
      decision: 'aprobar', motivo: 'Identidad validada',
    }));
  });

  it('updates a user role and requests a paginated user list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('button', { name: /Guardar/ });
    await user.selectOptions(screen.getByLabelText('Rol'), 'profesor');
    await user.click(screen.getByRole('button', { name: /Guardar/ }));

    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith('user-1', { rol: 'profesor', estado: 'activo' }));
    expect(api.getAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
  });

  it('requires confirmation before reducing access', async () => {
    const user = userEvent.setup();
    api.getAdminUsers.mockImplementation((filters: { solicitud_docente_estado?: string }) => Promise.resolve(
      filters.solicitud_docente_estado ? [] : [admin],
    ));
    api.updateAdminUser.mockResolvedValue({ ...admin, estado: 'inactivo' });
    renderPage();

    await user.selectOptions(await screen.findByLabelText('Estado'), 'inactivo');
    await user.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(api.updateAdminUser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('dialog', { name: /Confirmar reducción de acceso/ })).toBeVisible());

    await user.click(screen.getByRole('button', { name: 'Aplicar cambio' }));
    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith('admin-1', { rol: 'admin', estado: 'inactivo' }));
  });
});
