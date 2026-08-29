import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, EducationalIcon, Skeleton } from '@/components/ui';
import { getBandejaDocente } from '@/modules/calificaciones/api';
import { routes } from '@/config/routes';
import type { BandejaDocenteItem } from '@/types/api';

const reasonLabels: Record<string, string> = {
  nota: 'Nota',
  respuesta: 'Respuesta',
  evidencia: 'Evidencia',
  retroalimentacion: 'Retroalimentación',
  otro: 'Revisión general',
};

function CaseList({
  title,
  description,
  items,
  emptyText,
  total,
  kind,
}: {
  title: string;
  description: string;
  items: BandejaDocenteItem[];
  emptyText: string;
  total: number;
  kind: 'claim' | 'pending';
}) {
  const brandIcon = kind === 'claim' ? 'student-claim' : 'pending-reviews';
  const tone = kind === 'claim' ? 'amber' : 'brand';

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10">
            <EducationalIcon name={brandIcon} className="h-12 w-12" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold sm:text-lg">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
          </div>
        </div>
        <Badge tone={tone}>{total}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center px-5 py-7 text-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-fg">{emptyText}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <Link
              key={item.tipo + '-' + item.id}
              to={routes.calificacionesRevision(item.evaluacion_id, item.calificacion_id)}
              className="focus-ring group flex min-h-20 items-center gap-3 px-4 py-3 transition hover:bg-surface-2 sm:px-5"
              aria-label={'Revisar ' + item.estudiante_nombre + ' en ' + item.evaluacion_nombre}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-extrabold text-brand-700 dark:text-brand-300">
                {item.estudiante_nombre.trim().charAt(0).toUpperCase() || 'E'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="truncate text-sm font-bold text-fg">{item.estudiante_nombre}</span>
                  {kind === 'claim' && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                      {reasonLabels[item.motivo ?? 'otro'] ?? reasonLabels.otro}
                    </span>
                  )}
                  {kind === 'pending' && item.estado === 'requiere_revision' && (
                    <span className="text-[11px] font-bold text-rose-600 dark:text-rose-300">Requiere atención</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {item.evaluacion_nombre} · {item.materia_nombre}
                </span>
                {item.descripcion && (
                  <span className="mt-1 block truncate text-xs text-muted">{item.descripcion}</span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeacherInbox() {
  const inboxQuery = useQuery({
    queryKey: ['bandeja-docente'],
    queryFn: getBandejaDocente,
    refetchInterval: 45_000,
  });

  if (inboxQuery.isLoading) {
    return (
      <Card className="space-y-4 p-5" aria-label="Cargando bandeja docente">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </Card>
    );
  }

  if (inboxQuery.isError || !inboxQuery.data) {
    return (
      <Card className="flex items-center gap-3 border-amber-200 p-4 dark:border-amber-500/30">
        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">No pudimos actualizar la bandeja</p>
          <button type="button" onClick={() => inboxQuery.refetch()} className="mt-1 text-xs font-semibold text-brand-600">
            Intentar de nuevo
          </button>
        </div>
      </Card>
    );
  }

  const inbox = inboxQuery.data;
  const claims = Array.isArray(inbox.reclamos) ? inbox.reclamos : [];
  const pending = Array.isArray(inbox.pendientes) ? inbox.pendientes : [];
  const openClaims = Number.isFinite(inbox.reclamos_abiertos)
    ? inbox.reclamos_abiertos
    : claims.length;
  const pendingReviews = Number.isFinite(inbox.pendientes_revision)
    ? inbox.pendientes_revision
    : pending.length;
  const total = openClaims + pendingReviews;

  return (
    <section aria-labelledby="teacher-inbox-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            <Inbox className="h-4 w-4" aria-hidden="true" /> Atención docente
          </p>
          <h2 id="teacher-inbox-title" className="mt-1 font-display text-2xl font-bold">Bandeja de revisión</h2>
          <p className="mt-1 text-sm text-muted">Reclamos de estudiantes y notas que todavía necesitan tu decisión.</p>
        </div>
        <Badge tone={total > 0 ? 'warning' : 'success'}>
          {total > 0
            ? total + ' caso' + (total === 1 ? '' : 's') + ' pendiente' + (total === 1 ? '' : 's')
            : 'Todo al día'}
        </Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <CaseList
          title="Reclamos y solicitudes"
          description="Solicitudes de revisión enviadas por estudiantes."
          items={claims}
          total={openClaims}
          emptyText="No tienes reclamos abiertos"
          kind="claim"
        />
        <CaseList
          title="Entregas por revisar"
          description="Notas sugeridas o casos marcados para revisión."
          items={pending}
          total={pendingReviews}
          emptyText="No tienes entregas pendientes"
          kind="pending"
        />
      </div>
    </section>
  );
}
