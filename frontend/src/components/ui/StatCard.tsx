import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { EducationalIcon, type EducationalIconName } from './EducationalIcon';
import { cn } from '@/lib/cn';

export type StatTone = 'info' | 'success' | 'warning' | 'error' | 'brand' | 'neutral';

const ICON_TONES: Record<StatTone, string> = {
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  error: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  neutral: 'bg-surface-2 text-muted',
};

interface StatCardProps {
  icon?: LucideIcon;
  brandIcon?: EducationalIconName;
  label: string;
  value: string | number;
  tone?: StatTone;
  size?: 'sm' | 'md';
  iconClassName?: string;
}

export function StatCard({ icon: Icon, brandIcon, label, value, tone = 'neutral', size = 'md', iconClassName }: StatCardProps) {
  const s = size === 'sm'
    ? { iconWrap: 'h-9 w-9', iconInner: 'h-4 w-4', brandInner: 'h-8 w-8', value: 'text-xl', label: 'text-xs', gap: 'gap-3', pad: 'p-4' }
    : { iconWrap: 'h-14 w-14', iconInner: 'h-6 w-6', brandInner: 'h-12 w-12', value: 'text-2xl', label: 'text-sm', gap: 'gap-4', pad: 'p-5' };

  return (
    <Card className={`flex items-center ${s.gap} ${s.pad}`}>
      <span className={cn('grid place-items-center rounded-xl', s.iconWrap, brandIcon ? 'bg-white/90 shadow-sm ring-1 ring-border dark:bg-white/10' : ICON_TONES[tone], iconClassName)}>
        {brandIcon ? <EducationalIcon name={brandIcon} className={s.brandInner} /> : Icon ? <Icon className={s.iconInner} /> : null}
      </span>
      <div>
        <p className={`font-display font-extrabold ${s.value}`}>{value}</p>
        <p className={`text-muted ${s.label}`}>{label}</p>
      </div>
    </Card>
  );
}
