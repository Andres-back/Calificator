import { useQuery } from '@tanstack/react-query';
import { BookOpenCheck, Download, Library, Pencil, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { listMateriaResources, pdfUrl } from '@/modules/herramientas/api';
import { TOOL_BY_TIPO } from '@/modules/herramientas/meta';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { useMateriaContext } from './MateriaContext';

export function MateriaRecursos() {
  const { materia, canManageMateria } = useMateriaContext();
  const resourcesQuery = useQuery({
    queryKey: ['materia-resources', materia.id],
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
            <h2 className="font-display text-xl font-extrabold">{canManageMateria ? 'Recursos del salón' : 'Material para repasar'}</h2>
            <p className="mt-1 text-sm text-muted">
              {canManageMateria
                ? 'Publica guías, juegos y materiales que no requieren entrega ni generan nota.'
                : 'Consulta los recursos que tu docente preparó para ayudarte a practicar.'}
            </p>
          </div>
        </div>
        {canManageMateria && (
          <Link to="/app/herramientas/nuevo"><Button><Plus className="h-4 w-4" /> Crear recurso</Button></Link>
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
            title={canManageMateria ? 'Aún no hay recursos publicados' : 'Tu docente aún no ha publicado recursos'}
            description={canManageMateria ? 'Crea un recurso y asígnalo a esta materia como material de apoyo.' : 'Cuando haya una guía o práctica disponible aparecerá aquí.'}
            action={canManageMateria ? <Link to="/app/herramientas"><Button variant="outline">Abrir mi biblioteca</Button></Link> : undefined}
          />
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const meta = TOOL_BY_TIPO[resource.tipo];
            const Icon = meta?.icon ?? BookOpenCheck;
            const destination = canManageMateria ? `/app/herramientas/${resource.id}` : `/app/recursos/${resource.id}`;
            return (
              <Card key={resource.id} className="flex h-full flex-col overflow-hidden p-0">
                <Link to={destination} className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn('grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm', meta?.gradient ?? 'from-sky-500 to-indigo-600')}><Icon className="h-5 w-5" /></div>
                    <Badge tone={resource.publicado_estudiantes ? 'success' : 'neutral'}>{resource.publicado_estudiantes ? 'Visible' : 'Retirado'}</Badge>
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">{meta?.label ?? resource.tipo}</p>
                  <h3 className="mt-1 line-clamp-2 font-display text-lg font-bold">{resource.titulo}</h3>
                  <p className="mt-2 text-xs text-muted">Actualizado {formatDate(resource.updated_at ?? resource.created_at)}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
                  <Link to={destination} className="flex-1">
                    <Button size="sm" variant={canManageMateria ? 'outline' : 'primary'} className="w-full">
                      {canManageMateria ? <><Pencil className="h-4 w-4" /> Administrar</> : <><BookOpenCheck className="h-4 w-4" /> Abrir recurso</>}
                    </Button>
                  </Link>
                  <a href={pdfUrl(resource.id)} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost" title="Descargar PDF" aria-label={`Descargar ${resource.titulo}`}><Download className="h-4 w-4" /></Button>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
}