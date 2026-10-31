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
}

export function ReviewContextNavigation({ materiaId, materiaName, evaluationName, studentName, backHref,
  onBack, backLabel, bookHref }: ReviewContextNavigationProps) {
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
        <span className={index === entries.length - 1 ? 'min-w-0 break-words font-semibold text-fg [overflow-wrap:anywhere]' : 'min-w-0 break-words [overflow-wrap:anywhere]'} aria-current={index === entries.length - 1 ? 'page' : undefined}>{entry}</span>
      </li>)}
    </ol>
    {book && <Link to={book} className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-semibold text-brand-700 hover:bg-surface-2 dark:text-brand-200 sm:text-sm">Libro de notas</Link>}
  </nav>;
}
