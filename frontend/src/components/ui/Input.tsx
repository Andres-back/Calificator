import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const base =
  'w-full rounded-lg border border-border bg-surface text-fg placeholder:text-muted transition-[border-color,box-shadow] ' +
  'focus-ring focus-visible:border-interactive aria-[invalid=true]:border-error aria-[invalid=true]:ring-error/20 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-disabled disabled:opacity-100';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(base, 'h-11 px-3.5 text-sm', className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(base, 'min-h-[88px] resize-y px-3.5 py-2.5 text-sm', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(base, 'h-11 cursor-pointer px-3.5 text-sm', className)} {...props} />,
);
Select.displayName = 'Select';

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-fg">
        {label}
        {required && <span className="text-error" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (obligatorio)</span>}
      </span>
      {hint && <span className="block text-sm leading-5 text-secondary">{hint}</span>}
      {children}
      {error && <span className="field-error block" role="alert">{error}</span>}
    </label>
  );
}