import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { safeReviewBookReturn } from './reviewRoutes';

export interface ReviewContextNavigationProps {
  materiaId?: string;
  materiaName?: string;
  evaluationName?: string;
  studentName?: string;
  backHref?: string;
  onBack?: () => void;
  backLabel: string;
  bookHref?: string;
  /** Spec 176: notas de la evaluación que aún esperan la decisión del docente. */
  pendingCount?: number;
}

export function ReviewContextNavigation({ materiaId, materiaName, evaluationName, studentName, backHref,
  onBack, backLabel, bookHref, pendingCount }: ReviewContextNavigationProps) {
  const entries = [materiaName, evaluationName, studentName].filter((entry): entry is string => Boolean(entry));
  if (!entries.length) entries.push('Revisión');
  const book = safeReviewBookReturn(bookHref ?? null, materiaId ?? '');
  const backClass = 'focus-ring inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-surface-2';
  const arrow = <ArrowLeft data-review-back-arrow className="h-4 w-4 shrink-0" aria-hidden="true" />;
  return <nav aria-label="Ubicación de la revisión" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
    {onBack ? <button type="button" onClick={onBack} aria-label={backLabel} title={backLabel} className={backClass}>{arrow}<span className="hidden sm:inline">{backLabel}</span></button>
      : backHref ? <Link to={backHref} aria-label={backLabel} title={backLabel} className={backClass}>{arrow}<span className="hidden sm:inline">{backLabel}</span></Link> : null}
    <ol className="flex min-w-[min(100%,16rem)] flex-1 flex-wrap items-center gap-x-1 gap-y-1 text-xs leading-5 text-muted sm:text-sm">
      {entries.map((entry, index) => <li key={index} className="flex min-w-0 max-w-full items-start gap-1">
        {index > 0 && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
        <span title={entry} className={index === entries.length - 1 ? 'min-w-0 break-words font-semibold text-fg [overflow-wrap:anywhere] lg:line-clamp-1' : 'min-w-0 break-words [overflow-wrap:anywhere] lg:line-clamp-1'} aria-current={index === entries.length - 1 ? 'page' : undefined}>{entry}</span>
      </li>)}
    </ol>
    {typeof pendingCount === 'number' && pendingCount > 0 && <span data-testid="review-pending-count" className="inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-100"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />{pendingCount} por revisar</span>}
    {book && <Link to={book} className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-brand-700 hover:bg-surface-2 dark:text-brand-200 sm:text-sm">Libro de notas</Link>}
  </nav>;
}
