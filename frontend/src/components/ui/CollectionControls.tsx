import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string;
  icon: ReactNode;
  tone?: 'neutral' | 'danger';
}

export function IconButton({ icon, tone = 'neutral', className, title, ...props }: IconButtonProps) {
  return <Button size="icon" variant="ghost" title={title ?? props['aria-label']} className={cn(tone === 'danger' && 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10', className)} {...props}>{icon}</Button>;
}

export type ActionMenuItem = { label: string; icon?: ReactNode; href?: string; onSelect?: () => void | Promise<void>; tone?: 'neutral' | 'danger' };

export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const itemClass = (tone: ActionMenuItem['tone']) => cn('focus-ring flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold transition-colors', tone === 'danger' ? 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10' : 'text-fg hover:bg-surface-2');
  return (
    <div ref={rootRef} className="relative shrink-0">
      <IconButton aria-label={label} aria-haspopup="menu" aria-expanded={open} icon={<MoreHorizontal className="h-5 w-5" aria-hidden="true" />} onClick={() => setOpen((current) => !current)} />
      {open && <div role="menu" className="absolute bottom-full right-0 z-50 mb-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
        {items.map((item) => item.href ? (
          <a key={item.label} role="menuitem" href={item.href} target="_blank" rel="noreferrer" className={itemClass(item.tone)} onClick={() => setOpen(false)}>{item.icon}<span>{item.label}</span></a>
        ) : (
          <button key={item.label} type="button" role="menuitem" className={itemClass(item.tone)} onClick={() => { setOpen(false); void item.onSelect?.(); }}>{item.icon}<span>{item.label}</span></button>
        ))}
      </div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (value: T) => void; options: ReadonlyArray<{ value: T; label: string }>; ariaLabel: string }) {
  return <div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label={ariaLabel}>
    {options.map((option) => <button key={option.value} type="button" role="radio" aria-checked={value === option.value} onClick={() => onChange(option.value)} className={cn('focus-ring min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors', value === option.value ? 'bg-surface text-brand-700 shadow-sm dark:text-brand-300' : 'text-muted hover:text-fg')}>{option.label}</button>)}
  </div>;
}

export function CollectionToolbar<T extends string>({ query, onQueryChange, placeholder, resultCount, value, onChange, options, ariaLabel }: { query: string; onQueryChange: (value: string) => void; placeholder: string; resultCount: number; value: T; onChange: (value: T) => void; options: ReadonlyArray<{ value: T; label: string }>; ariaLabel: string }) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
    <label className="relative block min-w-0 flex-1 lg:max-w-md"><span className="sr-only">Buscar recursos</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" /><input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="focus-ring h-11 w-full rounded-xl border border-border bg-surface-2 pl-10 pr-3 text-sm text-fg placeholder:text-muted" /></label>
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"><span className="shrink-0 text-sm font-semibold text-muted" aria-live="polite">{resultCount} resultado{resultCount === 1 ? '' : 's'}</span><SegmentedControl value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} /></div>
  </div>;
}
