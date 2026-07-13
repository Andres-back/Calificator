import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const base =
  'w-full rounded-lg border border-border bg-surface text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] ' +
  'focus-ring focus-visible:border-brand-400 disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, 'h-11 px-3.5 text-sm', className)} {...props} />
  ),
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-[88px] px-3.5 py-2.5 text-sm resize-y', className)} {...props} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(base, 'h-11 px-3.5 text-sm cursor-pointer', className)} {...props} />
  ),
);
Select.displayName = 'Select';

export function Field({ label, hint, children, required }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-fg">
        {label}
        {required && <span className="text-brand-500"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
