import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Library, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, EducationalIcon, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { listMateriaResources } from '@/modules/herramientas/api';
import { ResourceCardActions } from '@/modules/herramientas/components/ResourceActions';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from '@/modules/herramientas/meta';
import { formatDate } from '@/lib/dates';
import { useAuth } from '@/stores/auth';
import { canUseStaffSurfaces } from '@/lib/authorization';
import { resourceLinkClass, resourceState } from '@/modules/herramientas/resourcePresentationModel';
import { useMateriaContext } from './MateriaContext';

export function MateriaRecursos() {
  const { materia } = useMateriaContext();
  const user = useAuth((state) => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const staffView = canUseStaffSurfaces(user);
  const canCreateResource = permissions.has('resources.create');
  const canManageResource = ['resources.update', 'resources.assign', 'resources.delete'].some((permission) => permissions.has(permission));
  const resourcesQuery = useQuery({
    queryKey: ['materia-resources', materia.id, user?.id],
    queryFn: () => listMateriaResources(materia.id),
    enabled: Boolean(materia.id),
  });

  const resources = resourcesQuery.data ?? [];

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50 p-5 dark:border-sky-500/30 dark:from-sky-500/10 dark:to-indigo-500/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-600 text-white"><Library className="h-5 w-5" /></div>
          <div>
            <h2 className="font-display text-xl font-extrabold">{staffView ? 'Recursos del salón' : 'Material para repasar'}</h2>
            <details className="mt-1"><summary className="focus-ring min-h-11 cursor-pointer content-center rounded-lg text-sm font-semibold text-muted">Acerca de los recursos</summary><p className="mt-1 text-sm text-muted">
              {canManageResource || canCreateResource
                ? 'Aquí aparecen desde el borrador los recursos creados para esta materia. Decide cuándo serán apoyo o actividad.'
                : staffView ? 'Consulta los recursos disponibles en esta materia.' : 'Consulta los recursos que tu docente preparó para ayudarte a practicar.'}
            </p></details>
          </div>
        </div>
        {canCreateResource && (
          <Link to="/app/herramientas/nuevo" className={resourceLinkClass}><Plus className="h-4 w-4" /> Crear recurso</Link>
        )}
      </section>

      <QueryState
        isLoading={resourcesQuery.isLoading}
        isError={resourcesQuery.isError}
        error={resourcesQuery.error}
        onRetry={() => void resourcesQuery.refetch()}
        isEmpty={!resourcesQuery.isLoading && resources.length === 0}
        loading={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-52" />)}</div>}
        empty={(
          <EmptyState
            icon={BookOpenCheck}
            title={canManageResource || canCreateResource ? 'Aún no hay recursos en esta materia' : 'Tu docente aún no ha publicado recursos'}
            description={canManageResource || canCreateResource ? 'Crea un recurso seleccionando esta materia; aparecerá aquí como borrador y también en tu biblioteca.' : 'Cuando haya una guía o práctica disponible aparecerá aquí.'}
            action={canCreateResource ? <Link to="/app/herramientas" className={resourceLinkClass}>Abrir mi biblioteca</Link> : undefined}
          />
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const state = resourceState(resource);
            const origin = { resourceOrigin: { accountId: user?.id, path: `/app/materias/${materia.id}/recursos` } };
            const meta = TOOL_BY_TIPO[resource.tipo];
            const destination = staffView ? `/app/herramientas/${resource.id}` : `/app/recursos/${resource.id}`;
            return (
              <Card key={resource.id} className="flex h-full flex-col overflow-hidden p-0">
                <Link to={destination} state={origin} className="focus-ring flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10"><EducationalIcon name={TOOL_EDUCATIONAL_ICON[resource.tipo]} className="h-14 w-14" /></div>
                    <Badge tone={state.tone}>{state.label}</Badge>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{meta?.label ?? resource.tipo}</p>
                  <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold">{resource.titulo}</h3>
                  <p className="mt-2 text-xs text-muted">
                    Actualizado {formatDate(resource.updated_at ?? resource.created_at)}
                  </p>
                </Link>
                <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                  <Link to={destination} state={origin} className={`${resourceLinkClass} flex-1`}>Ver recurso</Link>
                  <ResourceCardActions id={resource.id} title={resource.titulo} destination={destination} origin={origin} canManage={canManageResource} />
                </div>
              </Card>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
}
