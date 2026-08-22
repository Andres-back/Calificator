import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'border border-brand-700 bg-brand-700 text-white shadow-sm hover:border-brand-800 hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'border border-border bg-surface-2 text-fg hover:border-slate-400 hover:bg-surface dark:hover:border-slate-500',
  outline:
    'border-2 border-border bg-surface text-fg hover:border-slate-400 hover:bg-surface-2 dark:hover:border-slate-500',
  ghost:
    'border-2 border-transparent text-fg hover:bg-surface-2',
  danger:
    'border border-rose-700 bg-rose-700 text-white shadow-sm hover:bg-rose-800',
};

export interface BotonGrandeProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const BotonGrande = forwardRef<HTMLButtonElement, BotonGrandeProps>(
  ({ className, variant = 'primary', loading, icon, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl px-6 text-lg font-semibold transition-[background-color,border-color,color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : icon ? (
        <span className="h-5 w-5 shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  ),
);

BotonGrande.displayName = 'BotonGrande';
