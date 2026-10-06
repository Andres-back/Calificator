import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import { describeReviewBlocker, type ReviewNoticeTarget, type ReviewTriageItem, type ReviewTriageLevel, type ReviewTriageSummary } from './buildReviewTriage';

type Props = {
  compact?: boolean;
  historical?: boolean;
  processing?: boolean;
  extraReasons?: string[];
  onReviewGeneral?: (target: ReviewNoticeTarget) => void;
  summary: ReviewTriageSummary;
  selectedComponentId?: string;
  onSelectComponent: (componentId: string, level: ReviewTriageLevel, position: number) => void;
  analyticsContext?: { evaluacionId: string; calificacionId: string };
};

function componentLabel(item: ReviewTriageItem): string {
  const prefix = item.component.tipo === 'pregunta' ? 'Pregunta' : 'Criterio';
  return `${prefix} ${item.component.numero ?? item.component.orden + 1}`;
}

export function ReviewTriagePanel({ summary, selectedComponentId, onSelectComponent, analyticsContext, compact = false, historical = false, processing = false, extraReasons = [], onReviewGeneral }: Props) {
  const rawReasons = [...new Set([...(summary.globalReasons ?? summary.globalBlockers), ...extraReasons].filter(Boolean))];
  const notices = [...new Map(rawReasons.map((raw) => {
    const notice = describeReviewBlocker(raw);
    // Unknown notices stay distinct; known equivalent messages can share a display row.
    return [notice.message === 'Hay un aviso que necesita revisión.' ? raw : notice.message, notice];
  })).values()];
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
        global_blocked: notices.length > 0,
      },
    });
  }, [evaluationId, gradeId, summary.counts.attention, summary.counts.blocked, summary.counts.safe, notices.length]);

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
    <Card className={`${compact ? 'space-y-2 p-3' : 'space-y-4 p-4'} border-brand-200 dark:border-brand-500/30`} aria-labelledby="review-triage-title">
      <div>
        {!compact && <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">Revisión asistida</p>}
        <h3 id="review-triage-title" className="mt-1 font-display text-base font-bold">{historical ? 'Avisos del análisis original' : summary.exceptions.length ? 'Revisa primero las excepciones' : notices.length ? 'Qué necesitas revisar' : 'Revisión de respuestas'}</h3>
        {historical && <p className="mt-1 text-sm text-muted">{processing ? 'La calificación sigue en proceso. Estos avisos pertenecen al análisis registrado, no a una nota definitiva.' : 'La nota ya tiene una decisión docente. Estos avisos conservan el análisis previo; no reabren la calificación.'}</p>}
        {!compact && <p className="mt-1 text-sm text-muted">Estas señales priorizan tu revisión; no cambian ni publican la nota.</p>}
      </div>

      <div className={compact ? 'flex flex-wrap gap-2 [&>div]:px-2 [&>div]:py-1 [&_svg]:hidden [&_p]:mt-0' : 'grid grid-cols-3 gap-2'} aria-label="Resumen de revisión">
        {(!compact || summary.counts.safe > 0) && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10 sm:p-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-emerald-900 dark:text-emerald-100 sm:text-base">{summary.counts.safe} sin alertas individuales</p>
        </div>}
        {(!compact || summary.counts.attention > 0) && <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-500/30 dark:bg-amber-500/10 sm:p-3">
          <TriangleAlert className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-amber-900 dark:text-amber-100 sm:text-base">{summary.counts.attention} por revisar</p>
        </div>}
        {(!compact || summary.counts.blocked > 0) && <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 dark:border-rose-500/30 dark:bg-rose-500/10 sm:p-3">
          <ShieldAlert className="h-5 w-5 text-rose-700 dark:text-rose-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-rose-900 dark:text-rose-100 sm:text-base">{summary.counts.blocked} {summary.counts.blocked === 1 ? 'bloqueada' : 'bloqueadas'}</p>
        </div>}
        {notices.length > 0 && <p className="self-center text-sm font-semibold text-amber-800 dark:text-amber-200">{notices.length} {notices.length === 1 ? 'aviso general' : 'avisos generales'}</p>}
      </div>

      {notices.length > 0 && (
        <div role={historical ? 'note' : 'alert'} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          {notices.map((notice, index) => <div key={index} className="space-y-1">
            <p className="font-semibold">{notice.message}</p>
            {!historical && <p>{notice.guidance}</p>}
            {onReviewGeneral && <Button variant="outline" className="mt-2 min-h-11" onClick={() => onReviewGeneral(notice.target)}>{notice.action}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>}
          </div>)}
          <details className="border-t border-amber-200 pt-1 dark:border-amber-500/30">
            <summary className="focus-ring flex min-h-11 cursor-pointer items-center font-semibold">Ver detalle de los avisos</summary>
            <ul className="list-disc space-y-1 pl-5 [overflow-wrap:anywhere]">{rawReasons.map((raw) => <li key={raw}>{raw}</li>)}</ul>
          </details>
        </div>
      )}

      {summary.exceptions.length > 0 ? (
        <>
          <Button fullWidth className="min-h-12 sm:w-auto" onClick={() => next && select(next, nextIndex + 1)}>
            {selectedIndex < 0 ? 'Revisar primera excepción' : selectedIndex < summary.exceptions.length - 1 ? 'Siguiente excepción' : 'Volver a la primera excepción'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <ol className="space-y-2" aria-label="Excepciones detectadas">
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
      ) : notices.length === 0 && summary.items.length > 0 && !historical ? (
        compact ? <p className="text-sm text-muted">No hay alertas individuales. Revisa una muestra antes de confirmar.</p> : <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
          <p className="font-bold">No detectamos señales de incertidumbre en las respuestas.</p>
          <p className="mt-1">La priorización no reemplaza tu criterio: revisa una muestra y confirma la nota cuando estés conforme.</p>
        </div>
      ) : null}

      {summary.safe.length > 0 && (!compact || summary.exceptions.length > 0) && (
        <details className="rounded-xl border border-border bg-surface-2 p-3">
          <summary className="focus-ring flex min-h-11 cursor-pointer items-center rounded-lg font-semibold">Ver respuestas sin alertas ({summary.safe.length})</summary>
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
