import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/stores/auth';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  action,
  primaryAction,
  secondaryActions,
  backAction,
  breadcrumbs,
  eyebrow,
  badge,
}: {
  title: string;
  subtitle?: string;
  description?: string;
  action?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  backAction?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  badge?: ReactNode;
}) {
  const role = useAuth((state) => state.user?.rol);
  const isTeacher = role === 'profesor';
  const isStudent = role === 'estudiante';

  const supportingText = description ?? subtitle;
  const mainAction = primaryAction ?? action;

  return (
    <header className={cn(
      'relative isolate flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      isTeacher
        ? 'teacher-page-header overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/80 p-5 shadow-card dark:border-indigo-500/20 dark:from-surface dark:via-surface dark:to-indigo-950/40 sm:p-6'
        : isStudent
          ? 'student-page-header overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-white to-sky-50/85 p-5 shadow-card dark:border-sky-500/20 dark:from-surface dark:via-surface dark:to-sky-950/35 sm:p-6'
          : 'border-b border-border pb-5',
    )}>
      {isTeacher && <div className="absolute -right-16 -top-24 h-52 w-52 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />}
      {isTeacher && <div className="absolute -bottom-20 left-1/3 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" aria-hidden="true" />}
      {isStudent && <div className="absolute -right-12 -top-24 h-52 w-52 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />}
      {isStudent && <div className="absolute -bottom-20 left-1/4 h-36 w-36 rounded-full bg-violet-300/10 blur-3xl" aria-hidden="true" />}
      <div className="relative z-10 min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Migas de pan" className="mb-3 max-w-full overflow-x-auto pb-1">
            <ol className="flex min-w-max items-center gap-1 text-sm text-secondary">
              {breadcrumbs.map((item, index) => {
                const current = index === breadcrumbs.length - 1;
                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />}
                    {item.to && !current ? (
                      <Link className="focus-ring inline-flex min-h-10 items-center rounded px-2 font-medium hover:text-interactive" to={item.to}>
                        {item.label}
                      </Link>
                    ) : (
                      <span className={current ? 'max-w-[14rem] truncate font-semibold text-fg' : undefined} aria-current={current ? 'page' : undefined}>
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        {eyebrow && eyebrow.trim().toLocaleLowerCase() !== title.trim().toLocaleLowerCase() && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {supportingText && <p className="supporting-text mt-1.5 max-w-2xl">{supportingText}</p>}
      </div>
      {(mainAction || secondaryActions || backAction) && (
        <div className="relative z-10 flex w-full shrink-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
          {backAction}
          {secondaryActions}
          {mainAction}
        </div>
      )}
    </header>
  );
}