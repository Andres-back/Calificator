import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

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
  const reduceMotion = useReducedMotion();
  const supportingText = description ?? subtitle;
  const mainAction = primaryAction ?? action;

  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Migas de pan" className="mb-3 max-w-full overflow-x-auto pb-1">
            <ol className="flex min-w-max items-center gap-1 text-sm text-secondary">
              {breadcrumbs.map((item, index) => {
                const current = index === breadcrumbs.length - 1;
                return (
                  <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />}
                    {item.to && !current ? (
                      <Link className="focus-ring rounded px-1 py-0.5 font-medium hover:text-interactive" to={item.to}>
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
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {supportingText && <p className="supporting-text mt-1.5 max-w-2xl">{supportingText}</p>}
      </div>
      {(mainAction || secondaryActions || backAction) && (
        <div className="flex w-full shrink-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">
          {backAction}
          {secondaryActions}
          {mainAction}
        </div>
      )}
    </motion.header>
  );
}