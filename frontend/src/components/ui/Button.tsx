import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'uiverse-action border border-brand-600 bg-brand-600 text-white shadow-sm hover:border-brand-700 hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-border bg-surface-2 text-fg hover:border-slate-300 hover:bg-surface dark:hover:border-slate-600',
  outline:
    'border border-border bg-surface text-fg hover:border-slate-300 hover:bg-surface-2 dark:hover:border-slate-600',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'text-white bg-rose-600 hover:bg-rose-500 shadow-sm hover:shadow-md active:translate-y-0',
  success: 'text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm hover:shadow-md active:translate-y-0',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-lg',
  icon: 'h-10 w-10 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors duration-200 focus-ring',
        'disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="relative h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
