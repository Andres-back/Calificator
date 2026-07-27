import { BookOpen, CheckSquare } from 'lucide-react';
import { Badge, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { DBAUnifiedItem } from '@/types/api';

export function DBASelector({
  items,
  selectedOfficial,
  selectedCustom,
  loading,
  error,
  onToggle,
  spacious = false,
}: {
  items: DBAUnifiedItem[] | undefined;
  selectedOfficial: string[];
  selectedCustom: string[];
  loading: boolean;
  error: boolean;
  onToggle: (item: DBAUnifiedItem) => void;
  spacious?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3" aria-label="Cargando DBA">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        No se pudieron cargar los DBA. Intenta nuevamente.
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
        <BookOpen className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
        No hay DBA disponibles para esta materia.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-2 overflow-y-auto rounded-xl border border-border bg-surface p-3',
        spacious ? 'max-h-[46vh]' : 'max-h-52',
      )}
      aria-label="Derechos Básicos de Aprendizaje"
    >
      {items.map((item) => {
        const selected = item.fuente === 'personalizado'
          ? selectedCustom.includes(item.id)
          : selectedOfficial.includes(item.id);
        return (
          <button
            key={`${item.fuente}-${item.id}`}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(item)}
            className={cn(
              'focus-ring flex min-h-12 w-full gap-3 rounded-xl border p-3 text-left transition-colors',
              selected
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                : 'border-transparent hover:border-brand-300 hover:bg-surface-2',
            )}
          >
            <CheckSquare
              className={cn('mt-0.5 h-6 w-6 shrink-0', selected ? 'text-brand-600' : 'text-muted')}
              fill={selected ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-base font-semibold text-fg">
                {item.codigo || 'DBA personalizado'}
                <Badge tone={item.fuente === 'personalizado' ? 'violet' : 'brand'}>
                  {item.fuente === 'personalizado' ? 'Personalizado' : 'MEN'}
                </Badge>
              </span>
              <span className="mt-1 block text-sm text-muted">
                {item.area} · Grado {item.grado}
              </span>
              <span className="mt-1 block text-sm leading-5 text-fg">{item.descripcion}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
