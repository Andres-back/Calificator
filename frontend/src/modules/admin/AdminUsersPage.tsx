import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search, ShieldCheck, UserCog, UserRoundCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, QueryError, Skeleton } from '@/components/ui';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import type { User, UserRole, UserStatus } from '@/types/api';
import { getAdminUsers, resolveTeacherRequest, updateAdminUser, type UserFilters } from './usersApi';

const roleLabel: Record<UserRole, string> = { admin: 'Administrador', profesor: 'Docente', estudiante: 'Estudiante' };

export function AdminUsersPage() {
  const currentUser = useAuth((state) => state.user);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [drafts, setDrafts] = useState<Record<string, { rol: UserRole; estado: UserStatus }>>({});
  const [motives, setMotives] = useState<Record<string, string>>({});
  const [pendingUpdate, setPendingUpdate] = useState<{ user: User; values: { rol: UserRole; estado: UserStatus } } | null>(null);
  const usersQuery = useQuery({ queryKey: ['admin-users', filters, page], queryFn: () => getAdminUsers({ ...filters, limit: pageSize, offset: page * pageSize }) });
  const pendingQuery = useQuery({
    queryKey: ['admin-users', 'pending-teacher-requests'],
    queryFn: () => getAdminUsers({ solicitud_docente_estado: 'pendiente', limit: 100 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  useEffect(() => setPage(0), [filters.q, filters.rol, filters.estado, filters.solicitud_docente_estado]);
  const decision = useMutation({
    mutationFn: ({ user, value }: { user: User; value: 'aprobar' | 'rechazar' }) => resolveTeacherRequest(user.id, { decision: value, motivo: motives[user.id]?.trim() || undefined }),
    onSuccess: (_data, variables) => { toast.success(variables.value === 'aprobar' ? 'Solicitud aprobada y rol docente asignado.' : 'Solicitud rechazada; la cuenta continúa como estudiante.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const update = useMutation({
    mutationFn: ({ user, values }: { user: User; values: { rol: UserRole; estado: UserStatus } }) => updateAdminUser(user.id, values),
    onSuccess: () => { setPendingUpdate(null); toast.success('Usuario actualizado.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const pending = pendingQuery.data ?? [];
  const draftFor = (user: User) => drafts[user.id] ?? { rol: user.rol, estado: user.estado };
  const saveUser = (user: User, values: { rol: UserRole; estado: UserStatus }) => {
    const reducesAccess = (user.rol === 'admin' && values.rol !== 'admin')
      || (user.estado === 'activo' && values.estado === 'inactivo');
    if (reducesAccess) setPendingUpdate({ user, values });
    else update.mutate({ user, values });
  };


  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-800 via-brand-600 to-sky-600 p-6 text-white shadow-lg sm:p-8">
        <Badge className="border-white/20 bg-white/15 text-white">Administración</Badge>
        <h1 className="mt-3 font-display text-3xl font-extrabold">Usuarios y roles</h1>
        <p className="mt-2 max-w-2xl text-brand-50">Aprueba solicitudes docentes y administra accesos sin perder el historial académico.</p>
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
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><Button onClick={() => decision.mutate({ user, value: 'aprobar' })} disabled={decision.isPending}><CheckCircle2 className="h-4 w-4" /> Aprobar docente</Button><Button variant="secondary" onClick={() => decision.mutate({ user, value: 'rechazar' })} disabled={decision.isPending}><XCircle className="h-4 w-4" /> Rechazar</Button></div>
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
          {usersQuery.data?.map((user) => { const draft = draftFor(user); return <Card key={user.id} className="p-4"><div className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{user.nombre}</p><Badge tone={user.estado === 'activo' ? 'success' : 'neutral'}>{roleLabel[user.rol]}</Badge>{user.solicitud_docente_estado && <Badge tone={user.solicitud_docente_estado === 'pendiente' ? 'warning' : user.solicitud_docente_estado === 'aprobada' ? 'success' : 'neutral'}>Solicitud {user.solicitud_docente_estado}</Badge>}</div><p className="break-all text-sm text-muted">{user.email}</p></div>
            <label className="text-xs font-semibold text-muted">Rol<select className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" value={draft.rol} disabled={user.id === currentUser?.id} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, rol: e.target.value as UserRole } })}>{Object.entries(roleLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-muted">Estado<select className="mt-1 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-fg" value={draft.estado} disabled={user.id === currentUser?.id} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, estado: e.target.value as UserStatus } })}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
            <Button variant="secondary" onClick={() => saveUser(user, draft)} disabled={update.isPending || user.id === currentUser?.id}><ShieldCheck className="h-4 w-4" /> Guardar</Button>
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
    </div>
  );
}
