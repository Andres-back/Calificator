import { ArrowRight, ChevronDown, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge, Card, RichContent } from '@/components/ui';
import type { BoletinItem } from '@/types/api';

/** Presentación de una nota propia; no consulta datos ni concede permisos. */
export function StudentResultCard({ item }: { item: BoletinItem }) {
  const confirmed = item.nota_confirmada != null;
  const processing = item.estado === 'en_calificacion' || item.estado === 'procesando';
  const status = confirmed ? 'Nota publicada' : processing ? 'Calificando' : 'Pendiente de revisión docente';
  const date = item.fecha ? new Date(item.fecha) : null;
  return (
    <Card className="min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-display text-lg font-bold leading-snug">{item.evaluacion_nombre}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <Badge tone={confirmed ? 'success' : 'warning'}>{status}</Badge>
            {date && !Number.isNaN(date.getTime()) && <time dateTime={item.fecha ?? undefined}>{date.toLocaleDateString()}</time>}
          </div>
        </div>
        {confirmed && (
          <div className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-center text-brand-800 dark:bg-brand-500/15 dark:text-brand-100">
            <p className="font-display text-2xl font-extrabold tabular-nums">{Number(item.nota_confirmada).toFixed(1)}</p>
            <p className="text-xs text-muted">/ {Number(item.nota_maxima).toFixed(1)}</p>
          </div>
        )}
      </div>
      {confirmed ? (
        <Link to={`/app/evaluaciones/${encodeURIComponent(item.evaluacion_id)}/resolver#mi-resultado`} className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200 dark:hover:bg-brand-500/20">
          Ver explicación de mi nota <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>
      ) : <p className="mt-3 text-sm leading-6 text-muted">{processing ? 'Tu entrega se está calificando. La nota aparecerá cuando tu docente la publique.' : 'La nota aparecerá cuando tu docente termine de revisarla y la publique.'}</p>}
      {confirmed && item.feedback && (
        <details className="group mt-3 border-t border-border pt-1">
          <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <MessageSquare className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
            <span className="min-w-0 flex-1">Retroalimentación del docente</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="min-w-0 rounded-xl bg-surface-2 p-3 text-sm leading-6"><RichContent content={item.feedback} variant="feedback" /></div>
        </details>
      )}
    </Card>
  );
}
