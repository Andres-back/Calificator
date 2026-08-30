import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'xl' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'uiverse-action border border-brand-700 bg-brand-700 text-white shadow-sm hover:border-brand-800 hover:bg-brand-800 active:bg-brand-900',
  secondary: 'border border-border bg-surface-2 text-fg hover:border-slate-400 hover:bg-surface dark:hover:border-slate-500',
  tertiary: 'border border-transparent text-fg hover:bg-surface-2',
  outline: 'border border-border bg-surface text-fg hover:border-slate-400 hover:bg-surface-2 dark:hover:border-slate-500',
  ghost: 'border border-transparent text-fg hover:bg-surface-2',
  danger: 'border border-rose-700 bg-rose-700 text-white shadow-sm hover:bg-rose-800',
  success: 'border border-emerald-700 bg-emerald-700 text-white shadow-sm hover:bg-emerald-800',
  link: 'h-auto border border-transparent px-0 text-interactive underline-offset-4 hover:underline',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
  xl: 'min-h-12 px-6 text-lg gap-3 rounded-xl',
  icon: 'h-11 w-11 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, loadingLabel, icon, fullWidth, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex items-center justify-center font-semibold transition-[background-color,border-color,color,box-shadow] duration-200',
        'select-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden="true" />}
      {!loading && icon ? <span className="grid h-5 w-5 shrink-0 place-items-center" aria-hidden="true">{icon}</span> : null}
      {loading && loadingLabel ? <span>{loadingLabel}</span> : children}
    </button>
  ),
);
Button.displayName = 'Button';
