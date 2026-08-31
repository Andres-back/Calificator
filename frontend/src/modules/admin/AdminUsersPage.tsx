import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, UserRoundCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, QueryError, Skeleton } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { User, UserRole, UserStatus } from '@/types/api';
import { createAdminUser, deleteAdminUser, getAdminUsers, getUserDeletionImpact, resolveTeacherRequest, updateAdminUser, type AdminUserWrite, type UserFilters } from './usersApi';
import { getAuthorizationRoles } from './authorizationApi';

const roleLabel: Record<UserRole, string> = { admin: 'Administrador', profesor: 'Docente', estudiante: 'Estudiante' };
const roleRank: Record<UserRole, number> = { admin: 3, profesor: 2, estudiante: 1 };

export function AdminUsersPage() {
  const currentUser = useAuth((state) => state.user);
  const permissions = new Set(currentUser?.permissions ?? []);
  const canCreate = permissions.has('users.create');
  const canUpdate = permissions.has('users.update');
  const canDelete = permissions.has('users.delete');
  const canReadRoles = permissions.has('roles.read');
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [drafts, setDrafts] = useState<Record<string, { rol: UserRole; estado: UserStatus; custom_role_id: string | null }>>({});
  const [motives, setMotives] = useState<Record<string, string>>({});
  const [pendingUpdate, setPendingUpdate] = useState<{ user: User; values: AdminUserWrite } | null>(null);
  const [editor, setEditor] = useState<{ user?: User; nombre: string; email: string; password: string; rol: UserRole; estado: UserStatus; custom_role_id: string | null; is_primary_admin: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ user: User; canHardDelete: boolean; references: number } | null>(null);
  const usersQuery = useQuery({ queryKey: ['admin-users', filters, page], queryFn: () => getAdminUsers({ ...filters, limit: pageSize, offset: page * pageSize }) });
  const pendingQuery = useQuery({
    queryKey: ['admin-users', 'pending-teacher-requests'],
    queryFn: () => getAdminUsers({ solicitud_docente_estado: 'pendiente', limit: 100 }),
  });
  const rolesQuery = useQuery({ queryKey: ['admin-authorization-roles'], queryFn: () => getAuthorizationRoles(false), enabled: canReadRoles });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  useEffect(() => setPage(0), [filters.q, filters.rol, filters.estado, filters.solicitud_docente_estado]);
  const decision = useMutation({
    mutationFn: ({ user, value }: { user: User; value: 'aprobar' | 'rechazar' }) => resolveTeacherRequest(user.id, { decision: value, motivo: motives[user.id]?.trim() || undefined }),
    onSuccess: (_data, variables) => { toast.success(variables.value === 'aprobar' ? 'Solicitud aprobada y rol docente asignado.' : 'Solicitud rechazada; la cuenta continúa como estudiante.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const update = useMutation({
    mutationFn: ({ user, values }: { user: User; values: AdminUserWrite }) => updateAdminUser(user.id, values),
    onSuccess: () => { setPendingUpdate(null); setEditor(null); toast.success('Usuario actualizado.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const buildEditorPayload = (values: NonNullable<typeof editor>): AdminUserWrite => {
    const payload: AdminUserWrite = { nombre: values.nombre.trim(), email: values.email.trim(), rol: values.rol, estado: values.estado, custom_role_id: values.custom_role_id };
    if (values.user && currentUser?.is_primary_admin) payload.is_primary_admin = values.is_primary_admin;
    if (values.password.trim()) payload.password = values.password;
    return payload;
  };
  const saveEditor = useMutation({
    mutationFn: async (values: NonNullable<typeof editor>) => {
      const payload = buildEditorPayload(values);
      return values.user ? updateAdminUser(values.user.id, payload) : createAdminUser({ ...payload, nombre: values.nombre.trim(), email: values.email.trim(), password: values.password });
    },
    onSuccess: () => { toast.success(editor?.user ? 'Cuenta actualizada.' : 'Cuenta creada.'); setEditor(null); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const remove = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => { toast.success(deleteTarget?.canHardDelete ? 'Cuenta eliminada.' : 'Cuenta desactivada; su historial fue preservado.'); setDeleteTarget(null); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const pending = pendingQuery.data ?? [];
  const draftFor = (user: User) => drafts[user.id] ?? { rol: user.rol, estado: user.estado, custom_role_id: user.custom_role_id ?? null };
  const reducesAccess = (user: User, values: AdminUserWrite) => (
    (values.rol !== undefined && roleRank[values.rol] < roleRank[user.rol])
    || (user.estado === 'activo' && values.estado === 'inactivo')
    || (values.custom_role_id !== undefined && values.custom_role_id !== (user.custom_role_id ?? null))
    || (user.is_primary_admin === true && values.is_primary_admin === false)
  );
  const saveUser = (user: User, values: AdminUserWrite) => {
    if (reducesAccess(user, values)) setPendingUpdate({ user, values });
    else update.mutate({ user, values });
  };
  const submitEditor = () => {
    if (!editor) return;
    const payload = buildEditorPayload(editor);
    if (editor.user && reducesAccess(editor.user, payload)) {
      setPendingUpdate({ user: editor.user, values: payload });
      return;
    }
    saveEditor.mutate(editor);
  };
  const openCreate = () => setEditor({ nombre: '', email: '', password: '', rol: 'estudiante', estado: 'activo', custom_role_id: null, is_primary_admin: false });
  const openEdit = (user: User) => setEditor({ user, nombre: user.nombre, email: user.email, password: '', rol: user.rol, estado: user.estado, custom_role_id: user.custom_role_id ?? null, is_primary_admin: Boolean(user.is_primary_admin) });
  const prepareDelete = async (user: User) => {
    try {
      const impact = await getUserDeletionImpact(user.id);
      setDeleteTarget({ user, canHardDelete: impact.can_hard_delete, references: impact.total_references });
    } catch (error) { toast.error(toApiError(error).detail); }
  };


  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-800 via-brand-600 to-sky-600 p-6 text-white shadow-lg sm:p-8">
        <Badge className="border-white/20 bg-white/15 text-white">Administración</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Usuarios y roles</h1>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><p className="mt-2 max-w-2xl text-brand-50">Aprueba solicitudes docentes y administra accesos sin perder el historial académico.</p>{canCreate && <Button className="border-white/30 bg-white text-brand-900 hover:bg-brand-50" onClick={openCreate}><Plus className="h-4 w-4" /> Crear usuario</Button>}</div>
      </section>

      {pendingQuery.isLoading && <Skeleton className="h-32" />}
      {pendingQuery.isError && <QueryError title="No pudimos cargar las solicitudes docentes" error={pendingQuery.error} onRetry={() => void pendingQuery.refetch()} />}
      {!pendingQuery.isLoading && !pendingQuery.isError && pending.length === 0 && <Card className="flex items-center gap-3 p-4 text-sm text-muted"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> No hay solicitudes docentes pendientes.</Card>}
      {pending.length > 0 && <section aria-labelledby="pending-title">
        <div className="mb-3 flex items-center justify-between"><h2 id="pending-title" className="font-display text-xl font-bold">Solicitudes docentes</h2><Badge tone="warning">{pending.length} pendiente{pending.length === 1 ? '' : 's'}</Badge></div>
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((user) => <Card key={user.id} className="p-5">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><UserRoundCheck className="h-5 w-5" /></span><div className="min-w-0"><p className="font-bold">{user.nombre}</p><p className="break-all text-sm text-muted">{user.email}</p></div></div>
            <label className="mt-4 block text-sm font-semibold">Motivo de la decisión (opcional)<textarea maxLength={500} value={motives[user.id] ?? ''} onChange={(e) => setMotives({ ...motives, [user.id]: e.target.value })} className="mt-2 min-h-20 w-full rounded-xl border border-border bg-surface p-3 font-normal text-fg focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Ej.: identidad docente validada" /></label>
            {canUpdate ? <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={() => decision.mutate({ user, value: 'aprobar' })} disabled={decision.isPending}><CheckCircle2 className="h-4 w-4" /> Aprobar docente</Button><Button variant="secondary" onClick={() => decision.mutate({ user, value: 'rechazar' })} disabled={decision.isPending}><XCircle className="h-4 w-4" /> Rechazar</Button></div> : <p className="mt-4 text-sm text-muted">Puedes consultar la solicitud, pero necesitas permiso para modificar usuarios.</p>}
          </Card>)}
        </div>
      </section>}

      <section aria-labelledby="users-title">
        <div className="mb-3"><h2 id="users-title" className="font-display text-xl font-bold">Todos los usuarios</h2><p className="text-sm text-muted">Busca, filtra y modifica rol o estado.</p></div>
        <Card className="mb-4 grid gap-3 p-4 lg:grid-cols-5">
          <div className="relative lg:col-span-2"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" /><Input aria-label="Buscar usuarios" className="pl-10" placeholder="Nombre o correo" value={filters.q ?? ''} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></div>
          <select aria-label="Filtrar por rol" className="min-h-11 rounded-lg border border-border bg-surface px-3" value={filters.rol ?? ''} onChange={(e) => setFilters({ ...filters, rol: e.target.value as UserRole | '' })}><option value="">Todos los roles</option><option value="admin">Administradores</option><option value="profesor">Docentes</option><option value="estudiante">Estudiantes</option></select>
          <select aria-label="Filtrar por estado" className="min-h-11 rounded-lg border border-border bg-surface px-3" value={filters.estado ?? ''} onChange={(e) => setFilters({ ...filters, estado: e.target.value as UserStatus | '' })}><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select>
          <select aria-label="Filtrar por solicitud docente" className="min-h-11 rounded-lg border border-border bg-surface px-3" value={filters.solicitud_docente_estado ?? ''} onChange={(e) => setFilters({ ...filters, solicitud_docente_estado: e.target.value as UserFilters['solicitud_docente_estado'] })}><option value="">Todas las solicitudes</option><option value="pendiente">Pendientes</option><option value="aprobada">Aprobadas</option><option value="rechazada">Rechazadas</option></select>
        </Card>
        {usersQuery.isLoading ? <div className="grid gap-3">{[1,2,3].map((n) => <Skeleton key={n} className="h-28" />)}</div> : usersQuery.isError ? <QueryError title="No pudimos cargar los usuarios" error={usersQuery.error} onRetry={() => void usersQuery.refetch()} /> : usersQuery.data?.length === 0 ? <EmptyState icon={UserCog} title="No hay usuarios con estos filtros" /> : <div className="grid gap-3">
          {usersQuery.data?.map((user) => { const draft = draftFor(user); return <Card key={user.id} className="p-4"><div className="grid items-end gap-4 xl:grid-cols-[minmax(0,1fr)_11rem_13rem_auto]">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{user.nombre}</p><Badge tone={user.estado === 'activo' ? 'success' : 'neutral'}>{roleLabel[user.rol]}</Badge>{user.is_primary_admin && <Badge>Administrador principal</Badge>}{user.custom_role_name && <Badge tone="violet">{user.custom_role_name}</Badge>}{user.solicitud_docente_estado && <Badge tone={user.solicitud_docente_estado === 'pendiente' ? 'warning' : user.solicitud_docente_estado === 'aprobada' ? 'success' : 'neutral'}>Solicitud {user.solicitud_docente_estado}</Badge>}</div><p className="break-all text-sm text-muted">{user.email}</p></div>
            <label className="text-xs font-semibold text-muted">Rol<select className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" value={draft.rol} disabled={!canUpdate || user.id === currentUser?.id || user.is_primary_admin} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, rol: e.target.value as UserRole } })}>{Object.entries(roleLabel).filter(([value]) => value !== 'admin' || currentUser?.is_primary_admin).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-muted">Rol personalizado<select className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" value={draft.custom_role_id ?? ''} disabled={!canUpdate || !canReadRoles || user.id === currentUser?.id || user.is_primary_admin} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, custom_role_id: e.target.value || null } })}><option value="">Permisos del perfil</option>{user.custom_role_id && !rolesQuery.data?.some((role) => role.id === user.custom_role_id) && <option value={user.custom_role_id}>{user.custom_role_name ?? 'Rol asignado'}</option>}{rolesQuery.data?.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.permission_keys.length} permisos</option>)}</select></label>
            <div className="flex flex-wrap gap-2">{canUpdate && <><Button variant="secondary" onClick={() => saveUser(user, draft)} disabled={update.isPending || user.id === currentUser?.id || user.is_primary_admin}><ShieldCheck className="h-4 w-4" /> Guardar acceso</Button><Button variant="ghost" size="icon" aria-label={'Editar ' + user.nombre} onClick={() => openEdit(user)} disabled={user.id === currentUser?.id}><Pencil className="h-4 w-4" /></Button></>}{canDelete && <Button variant="ghost" size="icon" className="text-rose-600" aria-label={'Eliminar ' + user.nombre} onClick={() => void prepareDelete(user)} disabled={user.id === currentUser?.id || user.is_primary_admin}><Trash2 className="h-4 w-4" /></Button>}</div>
          </div></Card>; })}
        </div>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0 || usersQuery.isFetching}>Anterior</Button>
          <span className="text-sm font-semibold text-muted">Página {page + 1}</span>
          <Button variant="secondary" onClick={() => setPage((value) => value + 1)} disabled={(usersQuery.data?.length ?? 0) < pageSize || usersQuery.isFetching}>Siguiente</Button>
        </div>
      </section>
      <ConfirmDialog
        open={pendingUpdate !== null}
        onClose={() => setPendingUpdate(null)}
        onConfirm={() => pendingUpdate && update.mutate(pendingUpdate)}
        title="Confirmar reducción de acceso"
        description="Este cambio puede retirar permisos o impedir que el usuario inicie sesión. Su información académica se conservará."
        confirmLabel="Aplicar cambio"
        loading={update.isPending}
      />
      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor?.user ? 'Editar usuario' : 'Crear usuario'} description="El perfil conserva su contexto académico; el rol personalizado define los módulos disponibles." className="max-w-2xl">
        {editor && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Nombre<Input className="mt-2" value={editor.nombre} onChange={(e) => setEditor({ ...editor, nombre: e.target.value })} /></label><label className="text-sm font-semibold">Correo<Input className="mt-2" type="email" value={editor.email} onChange={(e) => setEditor({ ...editor, email: e.target.value })} /></label></div><label className="block text-sm font-semibold">{editor.user ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}<Input className="mt-2" type="password" value={editor.password} onChange={(e) => setEditor({ ...editor, password: e.target.value })} /></label><div className="grid gap-4 sm:grid-cols-3"><label className="text-sm font-semibold">Perfil<select className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={editor.rol} disabled={editor.is_primary_admin} onChange={(e) => setEditor({ ...editor, rol: e.target.value as UserRole })}>{Object.entries(roleLabel).filter(([value]) => value !== 'admin' || currentUser?.is_primary_admin).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm font-semibold">Estado<select className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={editor.estado} disabled={editor.is_primary_admin} onChange={(e) => setEditor({ ...editor, estado: e.target.value as UserStatus })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label><label className="text-sm font-semibold">Rol personalizado<select className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={editor.custom_role_id ?? ''} disabled={editor.is_primary_admin} onChange={(e) => setEditor({ ...editor, custom_role_id: e.target.value || null })}><option value="">Permisos del perfil</option>{rolesQuery.data?.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label></div>{currentUser?.is_primary_admin && editor.user && editor.user.id !== currentUser.id && <label className="flex min-h-12 items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"><input type="checkbox" className="mt-1 h-4 w-4" checked={editor.is_primary_admin} onChange={(e) => setEditor({ ...editor, is_primary_admin: e.target.checked, rol: e.target.checked ? 'admin' : editor.rol, estado: e.target.checked ? 'activo' : editor.estado, custom_role_id: e.target.checked ? null : editor.custom_role_id })} /><span><strong>Administrador principal</strong><span className="mt-1 block text-muted">Puede conceder permisos críticos y recuperar la administración. Debe permanecer al menos uno activo.</span></span></label>}<div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={submitEditor} loading={saveEditor.isPending || update.isPending} disabled={!editor.nombre.trim() || !editor.email.trim() || (!editor.user && editor.password.length < 8)}>Guardar usuario</Button></div></div>}
      </Modal>
      <ConfirmDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.user.id)} title={deleteTarget?.canHardDelete ? 'Eliminar cuenta' : 'Desactivar y preservar historial'} description={deleteTarget?.canHardDelete ? 'La cuenta no tiene relaciones académicas y se eliminará definitivamente.' : 'La cuenta tiene ' + (deleteTarget?.references ?? 0) + ' referencias. Se retirará el acceso, pero se conservarán materias, entregas, notas y auditoría.'} confirmLabel={deleteTarget?.canHardDelete ? 'Eliminar cuenta' : 'Desactivar cuenta'} tone="danger" loading={remove.isPending} />
    </div>
  );
}
