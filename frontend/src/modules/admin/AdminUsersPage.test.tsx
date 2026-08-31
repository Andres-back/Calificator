import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminRolesPage } from './AdminRolesPage';
import { useAuth } from '@/stores/auth';

const api = vi.hoisted(() => ({
  createAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  getAdminUsers: vi.fn(),
  getUserDeletionImpact: vi.fn(),
  resolveTeacherRequest: vi.fn(),
  updateAdminUser: vi.fn(),
}));
const authorizationApi = vi.hoisted(() => ({
  createAuthorizationRole: vi.fn(),
  deleteAuthorizationRole: vi.fn(),
  duplicateAuthorizationRole: vi.fn(),
  getAuthorizationAudit: vi.fn(),
  getAuthorizationRoles: vi.fn(),
  getPermissionModules: vi.fn(),
  updateAuthorizationRole: vi.fn(),
}));
vi.mock('./usersApi', () => api);
vi.mock('./authorizationApi', () => authorizationApi);
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

function renderRolesPage() {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminRolesPage /></QueryClientProvider>);
}

const customRole = {
  id: 'role-1', name: 'Auxiliar académico', description: 'Apoya recursos', active: true,
  is_system: false, version: 1, permission_keys: ['resources.read'], assigned_users: 0,
  created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z',
};

describe('AdminUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({
      user: {
        id: 'current-admin', nombre: 'Administrador', email: 'current@example.test',
        rol: 'admin', estado: 'activo', is_primary_admin: true,
        permissions: ['users.read', 'users.create', 'users.update', 'users.delete', 'roles.read'],
      },
      status: 'authenticated',
    });
    api.getAdminUsers.mockResolvedValue([pending]);
    api.createAdminUser.mockResolvedValue(pending);
    api.deleteAdminUser.mockResolvedValue(undefined);
    api.getUserDeletionImpact.mockResolvedValue({
      user_id: pending.id, can_hard_delete: false, action: 'deactivate',
      total_references: 2, references: { 'entregas.estudiante_id': 2 },
    });
    api.resolveTeacherRequest.mockResolvedValue({ ...pending, rol: 'profesor', solicitud_docente_estado: 'aprobada' });
    api.updateAdminUser.mockResolvedValue({ ...pending, rol: 'profesor' });
    authorizationApi.getAuthorizationRoles.mockResolvedValue([]);
    authorizationApi.getPermissionModules.mockResolvedValue([]);
    authorizationApi.getAuthorizationAudit.mockResolvedValue([]);
    authorizationApi.createAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.updateAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.duplicateAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.deleteAuthorizationRole.mockResolvedValue(undefined);
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

    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith('user-1', { rol: 'profesor', estado: 'activo', custom_role_id: null }));
    expect(api.getAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ limit: 25, offset: 0 }));
  });

  it('requires confirmation before reducing access', async () => {
    const user = userEvent.setup();
    api.getAdminUsers.mockImplementation((filters: { solicitud_docente_estado?: string }) => Promise.resolve(
      filters.solicitud_docente_estado ? [] : [admin],
    ));
    api.updateAdminUser.mockResolvedValue({ ...admin, estado: 'inactivo' });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Editar Admin Principal' }));
    const editor = screen.getByRole('dialog', { name: /Editar usuario/ });
    await user.selectOptions(within(editor).getByLabelText('Estado'), 'inactivo');
    await user.click(within(editor).getByRole('button', { name: /Guardar usuario/ }));
    expect(api.updateAdminUser).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('dialog', { name: /Confirmar reducción de acceso/ })).toBeVisible());

    await user.click(screen.getByRole('button', { name: 'Aplicar cambio' }));
    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith('admin-1', expect.objectContaining({ rol: 'admin', estado: 'inactivo' })));
  });

  it('creates a user from the administrative form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Crear usuario/ }));
    const dialog = screen.getByRole('dialog', { name: /Crear usuario/ });
    const textboxes = within(dialog).getAllByRole('textbox');
    await user.type(textboxes[0], 'Nuevo Usuario');
    await user.type(textboxes[1], 'nuevo@example.test');
    await user.type(dialog.querySelector('input[type="password"]')!, 'ClaveSegura2026!');
    await user.click(within(dialog).getByRole('button', { name: /Guardar usuario/ }));

    await waitFor(() => expect(api.createAdminUser).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Nuevo Usuario', email: 'nuevo@example.test', password: 'ClaveSegura2026!',
      rol: 'estudiante', estado: 'activo', custom_role_id: null,
    })));
  });

  it('shows impact before deactivating a referenced user', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Eliminar Ana Aspirante' }));
    const dialog = await screen.findByRole('dialog', { name: /Desactivar y preservar historial/ });
    expect(dialog).toHaveTextContent(/2 referencias/);
    await user.click(within(dialog).getByRole('button', { name: /Desactivar cuenta/ }));

    await waitFor(() => expect(api.deleteAdminUser).toHaveBeenCalled());
    expect(api.deleteAdminUser.mock.calls[0][0]).toBe('user-1');
  });

  it('assigns a custom role through a confirmed access change', async () => {
    const user = userEvent.setup();
    authorizationApi.getAuthorizationRoles.mockResolvedValue([{
      id: 'role-1', name: 'Auxiliar académico', description: null, active: true,
      is_system: false, version: 1, permission_keys: ['resources.read'],
      assigned_users: 0, created_at: '2026-08-30', updated_at: '2026-08-30',
    }]);
    renderPage();

    await user.selectOptions(await screen.findByLabelText('Rol personalizado'), 'role-1');
    await user.click(screen.getByRole('button', { name: /Guardar acceso/ }));
    const confirmation = await screen.findByRole('dialog', { name: /Confirmar reducción de acceso/ });
    await user.click(within(confirmation).getByRole('button', { name: 'Aplicar cambio' }));

    await waitFor(() => expect(api.updateAdminUser).toHaveBeenCalledWith('user-1', {
      rol: 'estudiante', estado: 'activo', custom_role_id: 'role-1',
    }));
  });
});

describe('AdminRolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({
      user: {
        id: 'current-admin', nombre: 'Administrador', email: 'current@example.test',
        rol: 'admin', estado: 'activo', is_primary_admin: true,
        permissions: ['roles.read', 'roles.manage'],
      },
      status: 'authenticated',
    });
    authorizationApi.getAuthorizationRoles.mockResolvedValue([customRole]);
    authorizationApi.getPermissionModules.mockResolvedValue([{
      module: 'resources', label: 'Recursos', permissions: [
        { key: 'resources.read', module: 'resources', action: 'read', label: 'Ver recursos', description: 'Consultar materiales.', risk: 'normal', sort_order: 1, dependencies: [] },
        { key: 'resources.create', module: 'resources', action: 'create', label: 'Crear recursos', description: 'Generar materiales.', risk: 'normal', sort_order: 2, dependencies: ['resources.read'] },
      ],
    }]);
    authorizationApi.getAuthorizationAudit.mockResolvedValue([]);
    authorizationApi.createAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.updateAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.duplicateAuthorizationRole.mockResolvedValue(customRole);
    authorizationApi.deleteAuthorizationRole.mockResolvedValue(undefined);
  });

  it('adds required dependencies when selecting a capability', async () => {
    const user = userEvent.setup();
    renderRolesPage();
    await user.click(await screen.findByRole('button', { name: /Crear rol/ }));
    const dialog = screen.getByRole('dialog', { name: /Crear rol/ });
    await user.type(within(dialog).getByPlaceholderText('Ej.: Auxiliar académico'), 'Diseñador escolar');
    await user.click(within(dialog).getByRole('checkbox', { name: /Crear recursos/ }));

    expect(within(dialog).getByRole('checkbox', { name: /Ver recursos/ })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: /Guardar rol/ }));
    await waitFor(() => expect(authorizationApi.createAuthorizationRole).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Diseñador escolar', permission_keys: expect.arrayContaining(['resources.read', 'resources.create']),
    })));
  });

  it('keeps a read-only administrator out of mutations and shows sanitized detail', async () => {
    const user = userEvent.setup();
    useAuth.setState({
      user: {
        id: 'reader-admin', nombre: 'Auditor', email: 'auditor@example.test',
        rol: 'admin', estado: 'activo', permissions: ['roles.read'],
      },
      status: 'authenticated',
    });
    authorizationApi.getAuthorizationAudit.mockResolvedValue([{
      id: 'audit-1', actor_id: 'actor-123456', event: 'authorization_role_updated',
      entity_type: 'authorization_role', entity_id: 'role-1', metadata: {},
      created_at: '2026-08-30T12:30:00Z',
    }]);
    renderRolesPage();

    await screen.findByText('Auxiliar académico');
    expect(screen.queryByRole('button', { name: /Crear rol/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ver detalle/ }));
    const dialog = screen.getByRole('dialog', { name: 'Auxiliar académico' });
    expect(within(dialog).getByText('resources.read')).toBeVisible();
    expect(await within(dialog).findByText('authorization role updated')).toBeVisible();
  });
});
