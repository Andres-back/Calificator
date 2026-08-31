import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Check, Copy, Eye, History, KeyRound, Pencil, Plus, ShieldCheck, Trash2, UsersRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, Modal, QueryError, Skeleton } from '@/components/ui';
import { queryKeys } from '@/config/queryKeys';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import {
  createAuthorizationRole,
  deleteAuthorizationRole,
  duplicateAuthorizationRole,
  getAuthorizationRoles,
  getAuthorizationAudit,
  getPermissionModules,
  updateAuthorizationRole,
  type AuthorizationRole,
  type AuthorizationRoleWrite,
} from './authorizationApi';

interface RoleDraft {
  id?: string;
  name: string;
  description: string;
  active: boolean;
  permissionKeys: string[];
  version: number;
}

const emptyDraft: RoleDraft = {
  name: '',
  description: '',
  active: true,
  permissionKeys: [],
  version: 0,
};

const riskTone = (risk: string): 'error' | 'warning' | 'neutral' => risk === 'critical' ? 'error' : risk === 'sensitive' ? 'warning' : 'neutral';

export function AdminRolesPage() {
  const canManage = useAuth((state) => state.user?.permissions?.includes('roles.manage') ?? false);
  const queryClient = useQueryClient();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuthorizationRole | null>(null);
  const [detailRole, setDetailRole] = useState<AuthorizationRole | null>(null);

  const rolesQuery = useQuery({
    queryKey: [...queryKeys.authorization.roles(), includeArchived],
    queryFn: () => getAuthorizationRoles(includeArchived),
  });
  const modulesQuery = useQuery({
    queryKey: queryKeys.authorization.modules(),
    queryFn: getPermissionModules,
  });
  const auditQuery = useQuery({
    queryKey: ['admin', 'authorization', 'audit', detailRole?.id],
    queryFn: () => getAuthorizationAudit('authorization_role', detailRole!.id),
    enabled: Boolean(detailRole),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all });

  const saveMutation = useMutation({
    mutationFn: (values: AuthorizationRoleWrite) => draft?.id
      ? updateAuthorizationRole(draft.id, values)
      : createAuthorizationRole(values),
    onSuccess: () => {
      toast.success(draft?.id ? 'Rol actualizado. Los accesos nuevos ya están vigentes.' : 'Rol creado y listo para asignar.');
      setDraft(null);
      void refresh();
    },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const duplicateMutation = useMutation({
    mutationFn: duplicateAuthorizationRole,
    onSuccess: () => { toast.success('Se creó una copia editable del rol.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const archiveMutation = useMutation({
    mutationFn: (role: AuthorizationRole) => updateAuthorizationRole(role.id, {
      name: role.name,
      description: role.description,
      active: false,
      permission_keys: role.permission_keys,
      expected_version: role.version,
    }),
    onSuccess: () => { toast.success('Rol archivado.'); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAuthorizationRole,
    onSuccess: () => { toast.success('Rol eliminado.'); setDeleteTarget(null); void refresh(); },
    onError: (error) => toast.error(toApiError(error).detail),
  });

  const selected = useMemo(() => new Set(draft?.permissionKeys ?? []), [draft?.permissionKeys]);
  const permissions = useMemo(() => modulesQuery.data?.flatMap((module) => module.permissions) ?? [], [modulesQuery.data]);
  const togglePermission = (key: string) => {
    if (!draft) return;
    const next = new Set(draft.permissionKeys);
    if (next.has(key)) {
      next.delete(key);
      permissions.filter((permission) => permission.dependencies.includes(key)).forEach((permission) => next.delete(permission.key));
    } else {
      next.add(key);
      permissions.find((permission) => permission.key === key)?.dependencies.forEach((dependency) => next.add(dependency));
    }
    setDraft({ ...draft, permissionKeys: Array.from(next) });
  };
  const toggleModule = (keys: string[]) => {
    if (!draft) return;
    const next = new Set(draft.permissionKeys);
    const allSelected = keys.every((key) => next.has(key));
    keys.forEach((key) => allSelected ? next.delete(key) : next.add(key));
    setDraft({ ...draft, permissionKeys: Array.from(next) });
  };
  const openEdit = (role: AuthorizationRole) => setDraft({
    id: role.id,
    name: role.name,
    description: role.description ?? '',
    active: role.active,
    permissionKeys: role.permission_keys,
    version: role.version,
  });
  const save = () => {
    if (!draft?.name.trim()) return;
    saveMutation.mutate({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      active: draft.active,
      permission_keys: draft.permissionKeys,
      expected_version: draft.version,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-200 bg-gradient-to-br from-indigo-950 via-brand-800 to-sky-600 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge className="border-white/20 bg-white/15 text-white">Acceso modular</Badge>
            <h1 className="mt-3 font-display text-3xl font-extrabold">Roles y permisos</h1>
            <p className="mt-2 max-w-2xl text-indigo-50">Combina funciones de docencia, estudiantes y administración. Los permisos nunca reemplazan la propiedad de materias o evidencias.</p>
          </div>
          {canManage && <Button className="border-white/30 bg-white text-brand-900 hover:bg-indigo-50" onClick={() => setDraft({ ...emptyDraft })}>
            <Plus className="h-4 w-4" /> Crear rol
          </Button>}
        </div>
      </section>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"><ShieldCheck className="h-5 w-5" /></span>
          <div><p className="font-bold">Catálogo protegido</p><p className="text-sm text-muted">Solo puedes conceder capacidades que ya posees.</p></div>
        </div>
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold">
          <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className="h-5 w-5 accent-brand-600" /> Mostrar archivados
        </label>
      </Card>

      {rolesQuery.isLoading && <div className="grid gap-4 lg:grid-cols-2">{[1, 2].map((item) => <Skeleton key={item} className="h-60" />)}</div>}
      {rolesQuery.isError && <QueryError title="No pudimos cargar los roles" error={rolesQuery.error} onRetry={() => void rolesQuery.refetch()} />}
      {!rolesQuery.isLoading && !rolesQuery.isError && rolesQuery.data?.length === 0 && <EmptyState icon={KeyRound} title="Todavía no hay roles personalizados" description={canManage ? 'Crea el primero seleccionando únicamente las funciones necesarias.' : 'No hay roles disponibles para consultar.'} action={canManage ? <Button onClick={() => setDraft({ ...emptyDraft })}><Plus className="h-4 w-4" /> Crear rol</Button> : undefined} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {rolesQuery.data?.map((role) => (
          <Card key={role.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold">{role.name}</h2><Badge tone={role.active ? 'success' : 'neutral'}>{role.active ? 'Activo' : 'Archivado'}</Badge>{role.is_system && <Badge>Sistema</Badge>}</div><p className="mt-2 text-sm leading-6 text-secondary">{role.description || 'Sin descripción.'}</p></div>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><KeyRound className="h-5 w-5" /></span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge><Check className="mr-1 h-3.5 w-3.5" /> {role.permission_keys.length} capacidades</Badge>
              <Badge><UsersRound className="mr-1 h-3.5 w-3.5" /> {role.assigned_users} usuarios</Badge>
              <Badge>Versión {role.version}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button size="sm" variant="secondary" onClick={() => setDetailRole(role)}><Eye className="h-4 w-4" /> Ver detalle</Button>
              {canManage && <><Button size="sm" variant="secondary" onClick={() => openEdit(role)} disabled={role.is_system}><Pencil className="h-4 w-4" /> Editar</Button>
              <Button size="sm" variant="secondary" onClick={() => duplicateMutation.mutate(role.id)} loading={duplicateMutation.isPending}><Copy className="h-4 w-4" /> Duplicar</Button>
              {role.active && !role.is_system && <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate(role)} loading={archiveMutation.isPending}><Archive className="h-4 w-4" /> Archivar</Button>}
              {!role.is_system && role.assigned_users === 0 && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setDeleteTarget(role)}><Trash2 className="h-4 w-4" /> Eliminar</Button>}</>}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Editar rol' : 'Crear rol'} description="Selecciona módulos completos o capacidades individuales. La vista previa muestra exactamente lo que verá el usuario." className="max-w-5xl">
        {draft && <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Nombre<Input className="mt-2" value={draft.name} maxLength={100} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ej.: Auxiliar académico" /></label>
            <label className="text-sm font-semibold">Estado<select className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface px-3" value={draft.active ? 'active' : 'archived'} onChange={(event) => setDraft({ ...draft, active: event.target.value === 'active' })}><option value="active">Activo</option><option value="archived">Archivado</option></select></label>
          </div>
          <label className="block text-sm font-semibold">Descripción<textarea className="mt-2 min-h-24 w-full rounded-xl border border-border bg-surface p-3 font-normal" value={draft.description} maxLength={500} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Explica para quién es este rol." /></label>
          {modulesQuery.isLoading && <Skeleton className="h-72" />}
          {modulesQuery.isError && <QueryError title="No pudimos cargar los permisos" error={modulesQuery.error} onRetry={() => void modulesQuery.refetch()} />}
          <div className="grid gap-4 lg:grid-cols-2">
            {modulesQuery.data?.map((module) => {
              const keys = module.permissions.map((permission) => permission.key);
              const allSelected = keys.every((key) => selected.has(key));
              return <section key={module.module} className="rounded-2xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between gap-3"><div><h3 className="font-bold">{module.label}</h3><p className="text-xs text-muted">{module.permissions.filter((item) => selected.has(item.key)).length} de {module.permissions.length} seleccionadas</p></div><Button size="sm" variant={allSelected ? 'primary' : 'secondary'} onClick={() => toggleModule(keys)}>{allSelected ? 'Quitar todas' : 'Seleccionar todas'}</Button></div>
                <div className="mt-3 space-y-2">{module.permissions.map((permission) => <label key={permission.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-transparent p-2.5 hover:border-brand-200 hover:bg-surface"><input type="checkbox" checked={selected.has(permission.key)} onChange={() => togglePermission(permission.key)} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 font-semibold">{permission.label}<Badge tone={riskTone(permission.risk)}>{permission.risk === 'critical' ? 'Crítico' : permission.risk === 'sensitive' ? 'Sensible' : 'Normal'}</Badge></span><span className="mt-1 block text-xs leading-5 text-muted">{permission.description}</span>{permission.dependencies.length > 0 && <span className="mt-1 block text-xs font-semibold text-brand-700 dark:text-brand-300">Incluye automáticamente: {permission.dependencies.join(', ')}</span>}</span></label>)}</div>
              </section>;
            })}
          </div>
          <Card className="border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/20 dark:bg-brand-500/10"><p className="font-bold">Vista previa del acceso</p><p className="mt-1 text-sm text-secondary">El menú mostrará {draft.permissionKeys.length} capacidades. Las reglas de propiedad de materias, estudiantes y evidencias seguirán aplicándose.</p></Card>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setDraft(null)}>Cancelar</Button><Button onClick={save} loading={saveMutation.isPending} disabled={!draft.name.trim() || modulesQuery.isLoading}><ShieldCheck className="h-4 w-4" /> Guardar rol</Button></div>
        </div>}
      </Modal>

      <ConfirmDialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} title="Eliminar rol" description="Se eliminará definitivamente porque no tiene usuarios asignados. Esta acción conserva los eventos de auditoría." confirmLabel="Eliminar rol" tone="danger" loading={deleteMutation.isPending} />
      <Modal open={detailRole !== null} onClose={() => setDetailRole(null)} title={detailRole?.name ?? 'Detalle del rol'} description="Capacidades efectivas, usuarios asignados e historial sanitizado." className="max-w-3xl">
        {detailRole && <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Capacidades</p><p className="mt-1 text-2xl font-bold">{detailRole.permission_keys.length}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Usuarios</p><p className="mt-1 text-2xl font-bold">{detailRole.assigned_users}</p></Card><Card className="p-4"><p className="text-xs font-semibold uppercase text-muted">Versión</p><p className="mt-1 text-2xl font-bold">{detailRole.version}</p></Card></div>
          <section><h3 className="font-bold">Permisos incluidos</h3><div className="mt-2 flex flex-wrap gap-2">{detailRole.permission_keys.map((key) => <Badge key={key}>{key}</Badge>)}</div></section>
          <section><div className="flex items-center gap-2"><History className="h-4 w-4 text-brand-600" /><h3 className="font-bold">Historial</h3></div>{auditQuery.isLoading && <Skeleton className="mt-3 h-24" />}{auditQuery.isError && <QueryError title="No pudimos cargar el historial" error={auditQuery.error} onRetry={() => void auditQuery.refetch()} />}<div className="mt-3 space-y-2">{auditQuery.data?.map((event) => <div key={event.id} className="rounded-xl border border-border bg-surface-2 p-3"><p className="text-sm font-semibold">{event.event.split('_').join(' ')}</p><p className="mt-1 text-xs text-muted">{new Date(event.created_at).toLocaleString()} · Actor {event.actor_id?.slice(0, 8) ?? 'sistema'}</p></div>)}{!auditQuery.isLoading && auditQuery.data?.length === 0 && <p className="text-sm text-muted">Aún no hay eventos persistidos para este rol.</p>}</div></section>
        </div>}
      </Modal>
    </div>
  );
}
