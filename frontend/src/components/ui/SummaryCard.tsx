import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from './Badge';
import { Card } from './Card';

export type SemanticTone = 'brand' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const iconTones: Record<SemanticTone, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  neutral: 'bg-surface-2 text-secondary',
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  context,
  tone = 'neutral',
  status,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  context: string;
  tone?: SemanticTone;
  status?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', iconTones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {status && <Badge tone={tone === 'neutral' ? 'neutral' : tone}>{status}</Badge>}
      </div>
      <p className="mt-5 font-display text-2xl font-extrabold tabular-nums text-fg">{value}</p>
      <h3 className="mt-1 text-sm font-semibold text-fg">{label}</h3>
      <p className="mt-1 text-xs leading-5 text-secondary">{context}</p>
    </Card>
  );
}

export function ActionCard({
  to,
  icon: Icon,
  title,
  description,
  tone = 'brand',
  meta,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: SemanticTone;
  meta?: string;
}) {
  return (
    <Link to={to} className="focus-ring group block h-full rounded-lg">
      <Card interactive className="flex h-full items-start gap-3 p-4">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', iconTones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-secondary">{description}</span>
          {meta && <span className="mt-2 block text-xs font-semibold text-interactive">{meta}</span>}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Card>
    </Link>
  );
}

export function StatusCard(props: Parameters<typeof MetricCard>[0]) {
  return <MetricCard {...props} />;
}

export function ContentCard({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={cn('p-5 sm:p-6', className)}>
      <h2 className="section-title">{title}</h2>
      {description && <p className="supporting-text mt-1">{description}</p>}
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function AlertCard({ title, description, tone = 'warning', action }: { title: string; description: string; tone?: Exclude<SemanticTone, 'neutral'>; action?: ReactNode }) {
  return (
    <Card className={cn('flex flex-col gap-4 border-l-4 p-4 sm:flex-row sm:items-center', {
      'border-l-rose-600': tone === 'error',
      'border-l-amber-600': tone === 'warning',
      'border-l-sky-600': tone === 'info',
      'border-l-emerald-600': tone === 'success',
      'border-l-brand-600': tone === 'brand',
    })} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', iconTones[tone])}>
        <CircleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-fg">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-secondary">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </Card>
  );
}

export { EmptyState as EmptyStateCard } from './EmptyState';