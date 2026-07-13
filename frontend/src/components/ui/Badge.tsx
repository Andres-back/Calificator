import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone =
  | 'brand'
  | 'violet'
  | 'green'
  | 'amber'
  | 'rose'
  | 'neutral'
  | 'sky'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30',
  violet: 'bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-300 dark:border-violet-500/30',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  neutral: 'bg-surface-2 text-muted border-border',
  sky: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
  // Aliases semánticos (mismo color, nombre por intención)
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  error: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
};

export function Badge({ tone = 'brand', className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Mapea el estado de una evaluación/calificación a un tono de Badge coherente en toda la app. */
export const statusTone: Record<string, Tone> = {
  borrador: 'neutral',
  publicada: 'sky',
  en_calificacion: 'amber',
  pendiente_revision: 'amber',
  pendiente: 'amber',
  cerrada: 'neutral',
  confirmada: 'success',
  sugerida: 'amber',
  ajustada: 'brand',
  activa: 'success',
  archivada: 'neutral',
};
