import { useState, type KeyboardEvent } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/* ───────────────── TagInput (chips de texto) ───────────────── */
const CHIP_COLORS = [
  'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-200 dark:border-brand-500/30',
  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-500/30',
  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30',
  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
  'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/15 dark:text-pink-200 dark:border-pink-500/30',
];

export function TagInput({
  value,
  onChange,
  placeholder,
  uppercase,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  uppercase?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const parts = raw.split(/[,\n]/).map((s) => (uppercase ? s.trim().toUpperCase() : s.trim())).filter(Boolean);
    if (parts.length) onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (draft.trim()) add(draft); }
    else if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div className="flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-2 transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/40">
      {value.map((tag, i) => (
        <motion.span
          key={tag + i}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm font-semibold', CHIP_COLORS[i % CHIP_COLORS.length])}
        >
          {tag}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="focus-ring grid min-h-10 min-w-10 place-items-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100" aria-label={`Eliminar ${tag}`}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => draft.trim() && add(draft)}
        placeholder={value.length === 0 ? placeholder : 'Añadir…'}
        className="min-w-[120px] flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted/70"
      />
    </div>
  );
}

/* ───────────────── Stepper numérico ───────────────── */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label={`Reducir ${label ?? 'valor'}`} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border transition hover:border-brand-300 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50">
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <div className="flex-1 text-center">
          <span className="font-display text-2xl font-extrabold text-gradient">{value}</span>
          {label && <span className="ml-1 text-xs text-muted">{label}</span>}
        </div>
        <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label={`Aumentar ${label ?? 'valor'}`} className="focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border transition hover:border-brand-300 hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full rounded-full bg-brand-gradient" animate={{ width: `${pct}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} />
      </div>
    </div>
  );
}

/* ───────────────── Segmented control ───────────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          role="radio"
          aria-checked={value === o.value}
          className={cn(
            'focus-ring relative min-h-11 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition',
            value === o.value ? 'border-brand-400 text-brand-700 dark:text-brand-200' : 'border-border text-muted hover:border-brand-200',
          )}
        >
          {value === o.value && (
            <motion.span layoutId="seg-active" className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/15" transition={{ type: 'spring', stiffness: 320, damping: 28 }} />
          )}
          <span className="relative flex items-center justify-center gap-1.5">{o.icon}{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ───────────────── OptionChips (multi-selección) ───────────────── */
export function OptionChips({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
}) {
  const toggle = (v: string) => (value.includes(v) ? onChange(value.filter((x) => x !== v)) : onChange([...value, v]));
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            aria-pressed={on}
            className={cn(
              'focus-ring min-h-11 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
              on ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-border bg-surface text-muted hover:border-brand-300 hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
