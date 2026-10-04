import { useState } from 'react';
import { BookOpen, CheckSquare } from 'lucide-react';
import { Badge, Input, Skeleton } from '@/components/ui';
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
  const [search, setSearch] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const query = normalize(search.trim());
  const filtered = (items ?? []).filter((item) => normalize([
    item.codigo, item.descripcion, item.evidencias_aprendizaje,
  ].join(' ')).includes(query)).sort((a, b) => Number(b.fuente === 'personalizado') - Number(a.fuente === 'personalizado'));
  const selectedCount = selectedOfficial.length + selectedCustom.length;

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Cargando criterios de aprendizaje">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
        No se pudieron cargar los criterios de aprendizaje. Puedes continuar sin ellos o intentarlo nuevamente.
      </div>
    );
  }

  if (!items?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-center text-muted">
        <BookOpen className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
        No hay criterios de aprendizaje disponibles. Puedes crearlos en la sección de criterios de esta materia o continuar sin seleccionarlos.
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Criterios de aprendizaje">
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por descripción o código"
        aria-label="Buscar criterios de aprendizaje"
        className="min-h-12 text-base"
      />
      <p className="text-sm text-muted" role="status">{selectedCount} seleccionados · {filtered.length} disponibles{query ? ' en esta búsqueda' : ''}</p>
      <div className={cn('space-y-2 sm:rounded-xl sm:border sm:border-border sm:bg-surface sm:p-2 sm:overflow-y-auto', spacious ? 'sm:max-h-[46vh]' : 'sm:max-h-64')}>
      {!filtered.length && <p className="p-3 text-sm text-muted">No hay coincidencias. Prueba otra palabra; tu selección se conserva.</p>}
      {filtered.map((item) => {
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
                {item.codigo || 'Criterio de la materia'}
                <Badge tone={item.fuente === 'personalizado' ? 'violet' : 'brand'}>
                  {item.fuente === 'personalizado' ? 'Del docente' : 'Oficial · MEN'}
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
    </div>
  );
}
