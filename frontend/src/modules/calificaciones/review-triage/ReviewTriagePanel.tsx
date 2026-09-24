import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import type { ReviewTriageItem, ReviewTriageLevel, ReviewTriageSummary } from './buildReviewTriage';

type Props = {
  summary: ReviewTriageSummary;
  selectedComponentId?: string;
  onSelectComponent: (componentId: string, level: ReviewTriageLevel, position: number) => void;
  analyticsContext?: { evaluacionId: string; calificacionId: string };
};

function componentLabel(item: ReviewTriageItem): string {
  const prefix = item.component.tipo === 'pregunta' ? 'Pregunta' : 'Criterio';
  return `${prefix} ${item.component.numero ?? item.component.orden + 1}`;
}

export function ReviewTriagePanel({ summary, selectedComponentId, onSelectComponent, analyticsContext }: Props) {
  const selectedIndex = summary.exceptions.findIndex((item) => item.component.id === selectedComponentId);
  const nextIndex = selectedIndex < 0 || selectedIndex + 1 >= summary.exceptions.length ? 0 : selectedIndex + 1;
  const next = summary.exceptions[nextIndex];
  const evaluationId = analyticsContext?.evaluacionId;
  const gradeId = analyticsContext?.calificacionId;

  useEffect(() => {
    if (!evaluationId || !gradeId) return;
    trackEvent('grading_triage_opened', {
      evaluacion_id: evaluationId,
      calificacion_id: gradeId,
      metadata_json: {
        safe_count: summary.counts.safe,
        attention_count: summary.counts.attention,
        blocked_count: summary.counts.blocked,
        global_blocked: summary.globalBlockers.length > 0,
      },
    });
  }, [evaluationId, gradeId, summary.counts.attention, summary.counts.blocked, summary.counts.safe, summary.globalBlockers.length]);

  const select = (item: ReviewTriageItem, position: number) => {
    onSelectComponent(item.component.id, item.level, position);
    if (analyticsContext) {
      trackEvent('grading_triage_navigated', {
        evaluacion_id: analyticsContext.evaluacionId,
        calificacion_id: analyticsContext.calificacionId,
        metadata_json: { target_level: item.level, position, total_exceptions: summary.exceptions.length },
      });
    }
  };

  return (
    <Card className="space-y-4 border-brand-200 p-4 dark:border-brand-500/30" aria-labelledby="review-triage-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">Revisión asistida</p>
        <h3 id="review-triage-title" className="mt-1 font-display text-lg font-bold">Revisa primero las excepciones</h3>
        <p className="mt-1 text-sm text-muted">Estas señales priorizan tu revisión; no cambian ni publican la nota.</p>
      </div>

      <div className="grid grid-cols-3 gap-2" aria-label="Resumen de revisión">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10 sm:p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-100 sm:text-base">{summary.counts.safe} {summary.counts.safe === 1 ? 'segura' : 'seguras'}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-3">
          <TriangleAlert className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-100 sm:text-base">{summary.counts.attention} por revisar</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 dark:border-rose-500/30 dark:bg-rose-500/10 sm:p-3">
          <ShieldAlert className="h-5 w-5 text-rose-700 dark:text-rose-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-100 sm:text-base">{summary.counts.blocked} {summary.counts.blocked === 1 ? 'bloqueada' : 'bloqueadas'}</p>
        </div>
      </div>

      {summary.globalBlockers.length > 0 && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
          <p className="font-bold">Comprueba la evaluación completa</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">{summary.globalBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>
        </div>
      )}

      {summary.exceptions.length > 0 ? (
        <>
          <Button fullWidth className="min-h-12 sm:w-auto" onClick={() => next && select(next, nextIndex + 1)}>
            {selectedIndex < 0 ? 'Revisar primera excepción' : selectedIndex < summary.exceptions.length - 1 ? 'Siguiente excepción' : 'Volver a la primera excepción'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <ol className="max-h-56 space-y-2 overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible" aria-label="Excepciones detectadas">
            {summary.exceptions.map((item, index) => (
              <li key={item.component.id}>
                <button
                  type="button"
                  onClick={() => select(item, index + 1)}
                  aria-current={selectedComponentId === item.component.id ? 'step' : undefined}
                  className="focus-ring flex min-h-11 w-full items-start justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">{componentLabel(item)} · {item.component.titulo}</span>
                    <span className="mt-1 block text-xs text-muted">{item.reasons.map((reason) => reason.label).join(' · ')}</span>
                  </span>
                  <span className={item.level === 'blocked' ? 'shrink-0 text-xs font-bold text-rose-700 dark:text-rose-300' : 'shrink-0 text-xs font-bold text-amber-700 dark:text-amber-300'}>
                    {item.level === 'blocked' ? 'Bloqueada' : 'Atención'}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
          <p className="font-bold">No detectamos señales de incertidumbre en las respuestas.</p>
          <p className="mt-1">La priorización no reemplaza tu criterio: revisa una muestra y confirma la nota cuando estés conforme.</p>
        </div>
      )}

      {summary.safe.length > 0 && (
        <details className="rounded-xl border border-border bg-surface-2 p-3">
          <summary className="focus-ring cursor-pointer rounded-lg font-semibold">Ver respuestas seguras ({summary.safe.length})</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {summary.safe.map((item, index) => (
              <button key={item.component.id} type="button" onClick={() => select(item, index + 1)} className="focus-ring min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-left text-sm font-semibold hover:border-brand-300">
                {componentLabel(item)} · {item.component.titulo}
              </button>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}
