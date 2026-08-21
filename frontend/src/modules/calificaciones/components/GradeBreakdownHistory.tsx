import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui';
import { getGradeBreakdownHistory } from '../api';

export function GradeBreakdownHistory({ calificacionId }: { calificacionId: string }) {
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ['grade-breakdown-history', calificacionId],
    queryFn: () => getGradeBreakdownHistory(calificacionId),
    enabled: open,
  });

  return (
    <section className="rounded-xl border border-border">
      <button
        type="button"
        className="focus-ring flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" />Historial del cálculo</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {history.isLoading ? <Skeleton className="h-16" /> : history.isError ? (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">No fue posible consultar el historial. Intenta de nuevo.</p>
          ) : history.data?.length ? history.data.map((version) => (
            <article key={version.id} className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-fg">Versión {version.version} {version.activo ? '· vigente' : ''}</p>
                <p className="text-xs text-muted">Origen: {version.origen} · {version.actor_nombre ? `Por ${version.actor_nombre} · ` : ''}{new Date(version.created_at).toLocaleString('es-CO')}</p>
              </div>
              <strong className="text-fg">Nota {Number(version.nota_final).toFixed(2)}</strong>
            </article>
          )) : <p className="p-2 text-sm text-muted">Aún no hay versiones anteriores.</p>}
        </div>
      )}
    </section>
  );
}
