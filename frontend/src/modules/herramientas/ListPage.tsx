import { useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search, Wrench } from 'lucide-react';
import { Badge, Button, Card, EducationalIcon, EmptyState, QueryState, Skeleton } from '@/components/ui';
import { listMaterials } from './api';
import { TOOL_BY_TIPO, TOOL_EDUCATIONAL_ICON } from './meta';
import { filterResources, mergeResourcePages, resourceLinkClass, resourceState } from './resourcePresentationModel';
import { routes } from '@/config/routes';
import { formatDate } from '@/lib/dates';
import { useAuth } from '@/stores/auth';
import { ResourceCardActions } from './components/ResourceActions';

const PAGE_SIZE = 50;
export function ListPage() {
  const user = useAuth(state => state.user);
  const permissions = new Set(user?.permissions ?? []);
  const [params, setParams] = useSearchParams();
  const latestParams = useRef(new URLSearchParams(params));
  useEffect(() => { latestParams.current = new URLSearchParams(params); }, [params]);
  const account = useRef(user?.id);
  useEffect(() => {
    if (account.current !== user?.id) { account.current = user?.id; latestParams.current = new URLSearchParams(); setParams({}, { replace: true }); }
  }, [user?.id, setParams]);
  const location = useLocation();
  const query = params.get('q') ?? '';
  const subject = params.get('materia') ?? '';
  const type = params.get('tipo') ?? '';
  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(latestParams.current);
    if (value) next.set(key, value); else next.delete(key);
    latestParams.current = next;
    setParams(next, { replace: true });
  };
  const materialsQuery = useInfiniteQuery({
    queryKey: ['materials', user?.id],
    queryFn: ({ pageParam }) => listMaterials(undefined, { limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    enabled: Boolean(user?.id && permissions.has('resources.read')),
    getNextPageParam: (lastPage, pages) => lastPage.length === PAGE_SIZE ? pages.reduce((sum, page) => sum + page.length, 0) : undefined,
  });
  const materials = useMemo(() => mergeResourcePages(materialsQuery.data?.pages ?? []), [materialsQuery.data]);
  const filtered = useMemo(() => filterResources(materials, { query, subject, type }), [materials, query, subject, type]);
  const subjects = [...new Map(materials.filter(item => item.materia_id).map(item => [item.materia_id!, item.materia_nombre ?? 'Materia'])).entries()];
  const types = [...new Set(materials.map(item => item.tipo))];
  const origin = { resourceOrigin: { accountId: user?.id, path: location.pathname + location.search } };
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="font-display text-xl font-extrabold sm:text-2xl">Recursos didácticos</h1>
      {permissions.has('resources.create') && <Link to="/app/herramientas/nuevo" className={resourceLinkClass}><Plus className="h-4 w-4" /> Crear material</Link>}
    </header>
    <section aria-label="Buscar y filtrar recursos" className="space-y-2">
      <label className="relative block">
        <Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
        <input type="search" aria-label="Buscar recursos" value={query} onChange={event => changeFilter('q', event.target.value)} placeholder="Buscar título, materia o tipo" className="focus-ring min-h-11 w-full rounded-xl border border-border bg-surface py-2 pl-10 pr-3 text-base" />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Materia" value={subject} onChange={event => changeFilter('materia', event.target.value)} className="focus-ring min-h-11 min-w-0 rounded-xl border border-border bg-surface px-2 text-base">
          <option value="">Todas las materias</option><option value="none">Sin materia</option>
          {subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <select aria-label="Tipo de recurso" value={type} onChange={event => changeFilter('tipo', event.target.value)} className="focus-ring min-h-11 min-w-0 rounded-xl border border-border bg-surface px-2 text-base">
          <option value="">Todos los tipos</option>
          {types.map(value => <option key={value} value={value}>{TOOL_BY_TIPO[value]?.label ?? value}</option>)}
        </select>
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p role="status">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</p>
        {(query || subject || type) && <Button variant="ghost" onClick={() => setParams({})}>Limpiar filtros</Button>}
      </div>
    </section>
    <QueryState isLoading={materialsQuery.isLoading} isError={materialsQuery.isError && !materials.length} error={materialsQuery.error} onRetry={() => void materialsQuery.refetch()} isEmpty={!materials.length}
      loading={<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48" />)}</div>}
      empty={<EmptyState icon={Wrench} title="Sin material todavía" description="Los recursos que prepares aparecerán aquí." />}>
      {!filtered.length ? <EmptyState icon={Wrench} title="No encontramos recursos" description="Prueba otro término o limpia los filtros." /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(material => {
            const state = resourceState(material);
            const href = `/app/herramientas/${material.id}`;
            return <Card key={material.id} className="flex min-w-0 flex-col p-4">
              <div className="flex items-start gap-3">
                <EducationalIcon name={TOOL_EDUCATIONAL_ICON[material.tipo]} className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1"><p className="text-xs text-muted">{TOOL_BY_TIPO[material.tipo]?.label ?? material.tipo}</p><h2 className="mt-1 break-words font-bold"><Link to={href} state={origin} className="focus-ring rounded">{material.titulo}</Link></h2></div>
              </div>
              <div className="mt-2"><Badge tone={state.tone}>{state.label}</Badge></div>
              <p className="mt-2 text-xs text-muted">{material.materia_nombre ?? 'Sin materia'} · {formatDate(material.created_at)}</p>
              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                <Link to={href} state={origin} className={`${resourceLinkClass} flex-1 bg-brand-600 text-white hover:bg-brand-700`}>Ver recurso</Link>
                {permissions.has('resources.assign') && (!material.evaluacion_id || permissions.has('evaluations.read')) && <Link to={material.evaluacion_id && material.materia_id ? routes.materiaEvaluaciones(material.materia_id) : `${href}?action=assign`} state={origin} className={resourceLinkClass}>{material.evaluacion_id ? 'Abrir actividad' : material.asignacion_tipo === 'apoyo' ? 'Administrar' : 'Asignar'}</Link>}
                <ResourceCardActions id={material.id} title={material.titulo} destination={href} origin={origin} canManage={['resources.update', 'resources.assign', 'resources.create', 'resources.delete'].some(permission => permissions.has(permission))} />
              </div>
            </Card>;
          })}
        </div>}
    </QueryState>
    {materialsQuery.hasNextPage && <div className="space-y-2 text-center">
      <p className="text-sm text-muted">La búsqueda y los filtros se aplican a los {materials.length} recursos cargados. Carga más para ampliar los resultados.</p>
      <Button variant="outline" onClick={() => void materialsQuery.fetchNextPage()} disabled={materialsQuery.isFetchingNextPage} loading={materialsQuery.isFetchingNextPage}>Cargar más</Button>
    </div>}
    {materialsQuery.isFetchNextPageError && <div role="alert" className="text-sm text-rose-600">No pudimos cargar más recursos. Los anteriores siguen disponibles. Intenta «Cargar más» de nuevo.</div>}
    <details className="rounded-xl border border-border bg-surface p-3">
      <summary className="focus-ring min-h-11 cursor-pointer content-center rounded font-semibold">Resumen y ayuda</summary>
      <div className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
        {([
          ['Materiales cargados', materials.length, 'resources'],
          ['Interactivos', materials.filter(item => TOOL_BY_TIPO[item.tipo]?.interactive).length, 'interactive-games'],
          ['Borradores antiguos', materials.filter(item => TOOL_BY_TIPO[item.tipo]?.category === 'Evaluación').length, 'archived-drafts'],
          ['PDF disponibles', materials.length, 'pdf-ready'],
        ] as const).map(([label, count, icon]) => <div key={label} className="flex items-center gap-2"><EducationalIcon name={icon} className="h-10 w-10" /><p className="text-sm">{label}<strong className="block">{count}</strong></p></div>)}
      </div>
      <div className="flex items-center gap-2 text-sm"><EducationalIcon name="prepare-evaluation" className="h-10 w-10 shrink-0" /><p>Las evaluaciones se crean y califican dentro de la materia.</p></div>
      {permissions.has('evaluations.read') && <Link to={routes.materiasPara('evaluar')} className={`${resourceLinkClass} mt-2`}>Ir a Evaluaciones</Link>}
    </details>
  </div>;
}
