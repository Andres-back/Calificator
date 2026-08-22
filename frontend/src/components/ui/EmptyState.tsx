import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  icon: Icon,
  image,
  imageSize = 'md',
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  image?: string;
  /** md = 7rem default, lg = 12rem for hero-style empty states */
  imageSize?: 'md' | 'lg';
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const imageClass = imageSize === 'lg' ? 'mb-5 h-48 w-48 rounded-2xl object-contain' : 'mb-4 h-28 w-28 rounded-xl object-contain';
  return (
    <div className="empty-state flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      {image ? (
        <img src={image} alt="" className={imageClass} />
      ) : (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5 w-full sm:w-auto [&>a]:w-full [&>button]:w-full sm:[&>a]:w-auto sm:[&>button]:w-auto">{action}</div>}
    </div>
  );
}
