import { Copy, GripVertical, Plus, Trash2, ArrowUp, ArrowDown, SlidersHorizontal, Sparkles } from 'lucide-react';

import { Button, Card, Field, Input, Textarea } from '@/components/ui';
import type { LearningCriterion, LearningCriterionLevel, LearningSource } from '@/types/api';
import { cn } from '@/lib/cn';

const DEFAULT_LEVELS: LearningCriterionLevel[] = [
  { nombre: 'Inicial', descripcion: 'Aún no presenta evidencia suficiente del aprendizaje.' },
  { nombre: 'En proceso', descripcion: 'Presenta parte de la evidencia con errores u omisiones.' },
  { nombre: 'Logrado', descripcion: 'Presenta la evidencia esperada de forma correcta.' },
  { nombre: 'Avanzado', descripcion: 'Además justifica, relaciona o transfiere lo aprendido.' },
];

// El wizard reutiliza esta fábrica; mantenerla junto al editor evita dos definiciones divergentes.
// eslint-disable-next-line react-refresh/only-export-components
export function emptyCriterion(index: number, weight = 100): LearningCriterion {
  return {
    stable_key: `criterio-${crypto.randomUUID()}`,
    orden: index,
    nombre: '',
    descripcion: '',
    evidencia_esperada: '',
    peso_porcentaje: weight,
    puntaje_maximo: null,
    niveles: DEFAULT_LEVELS.map((level) => ({ ...level })),
    source_refs: [],
    official_standard_refs: [],
  };
}

function reorder(items: LearningCriterion[]) {
  return items.map((item, index) => ({ ...item, orden: index + 1 }));
}

function distributeCriteriaWeights(items: LearningCriterion[]) {
  if (items.length === 0) return [];
  const units = Math.floor(10000 / items.length);
  let assigned = 0;
  return reorder(items).map((item, index) => {
    const itemUnits = index === items.length - 1 ? 10000 - assigned : units;
    assigned += itemUnits;
    return { ...item, peso_porcentaje: itemUnits / 100 };
  });
}

export function LearningCriteriaEditor({
  value,
  onChange,
  readOnly = false,
  sources = [],
}: {
  value: LearningCriterion[];
  onChange: (value: LearningCriterion[]) => void;
  readOnly?: boolean;
  sources?: LearningSource[];
}) {
  const total = value.reduce((sum, item) => sum + Number(item.peso_porcentaje || 0), 0);
  const validTotal = Math.abs(total - 100) < 0.01;
  const fieldsComplete = value.length > 0 && value.every((item) =>
    item.nombre.trim().length >= 2
    && item.descripcion.trim().length >= 3
    && item.evidencia_esperada.trim().length >= 3,
  );
  const update = (index: number, changes: Partial<LearningCriterion>) => onChange(
    value.map((item, position) => position === index ? { ...item, ...changes } : item),
  );
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(reorder(next));
  };
  const remove = (index: number) => onChange(distributeCriteriaWeights(value.filter((_item, position) => position !== index)));
  const duplicate = (index: number) => {
    const source = value[index];
    const copy: LearningCriterion = {
      ...source,
      id: undefined,
      stable_key: `criterio-${crypto.randomUUID()}`,
      nombre: `${source.nombre || 'Criterio'} (copia)`,
      niveles: source.niveles.map((level) => ({ ...level })),
    };
    const next = [...value];
    next.splice(index + 1, 0, copy);
    onChange(distributeCriteriaWeights(next));
  };

  return (
    <div className="space-y-4 pb-24">
      {!value.length && !readOnly && (
        <Card className="p-6 text-center">
          <p className="font-semibold">Aún no hay criterios</p>
          <p className="mt-1 text-sm text-muted">Agrega el aprendizaje que quieres observar en el trabajo del estudiante.</p>
          <Button className="mt-4" onClick={() => onChange([emptyCriterion(1)])}>
            <Plus className="h-4 w-4" /> Agregar criterio
          </Button>
        </Card>
      )}

      {value.map((criterion, index) => (
        <Card key={criterion.stable_key} className="overflow-hidden border-indigo-100 dark:border-indigo-500/20">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2/70 px-4 py-3 sm:px-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-100">{index + 1}</span>
            <GripVertical className="hidden h-5 w-5 text-muted sm:block" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate font-semibold">{criterion.nombre || `Criterio ${index + 1}`}</p>
            {!readOnly && (
              <div className="flex w-full justify-end gap-1 sm:w-auto">
                <Button size="icon" variant="ghost" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Mover criterio arriba"><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(index, 1)} disabled={index === value.length - 1} aria-label="Mover criterio abajo"><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => duplicate(index)} aria-label="Duplicar criterio"><Copy className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" className="text-rose-600" onClick={() => remove(index)} aria-label="Eliminar criterio"><Trash2 className="h-4 w-4" /></Button>
              </div>
            )}
          </div>

          <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <Field label="Nombre del criterio" required>
                <Input
                  value={criterion.nombre}
                  onChange={(event) => update(index, { nombre: event.currentTarget.value })}
                  placeholder="Ej. Aplica correctamente el procedimiento"
                  disabled={readOnly}
                />
              </Field>
            </div>
            <Field label="¿Qué aprendizaje observable esperas?" required>
              <Textarea
                value={criterion.descripcion}
                onChange={(event) => update(index, { descripcion: event.currentTarget.value })}
                placeholder="Describe una acción visible, no una cualidad vaga."
                rows={4}
                disabled={readOnly}
              />
            </Field>
            <Field label="¿Qué evidencia debe mostrar el estudiante?" required>
              <Textarea
                value={criterion.evidencia_esperada}
                onChange={(event) => update(index, { evidencia_esperada: event.currentTarget.value })}
                placeholder="Ej. Operaciones ordenadas, resultado y una justificación breve."
                rows={4}
                disabled={readOnly}
              />
            </Field>
          </div>

          <details className="group border-t border-border px-4 py-4 sm:px-5">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg font-semibold text-brand-700 dark:text-brand-200">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="flex-1">Configuración avanzada</span>
              <span className="text-sm text-muted">Peso {Number(criterion.peso_porcentaje).toFixed(2)} %</span>
            </summary>
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <Field label="Peso en la actividad" required hint="Puedes ajustarlo manualmente o distribuir todos los criterios automáticamente.">
                <div className="relative max-w-xs">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={criterion.peso_porcentaje}
                    onChange={(event) => update(index, { peso_porcentaje: Number(event.currentTarget.value) })}
                    className="pr-10"
                    disabled={readOnly}
                  />
                  <span className="pointer-events-none absolute right-3 top-3 text-sm text-muted">%</span>
                </div>
              </Field>
              {sources.length > 0 && (
              <fieldset className="mb-4 rounded-xl border border-border p-3">
                <legend className="px-1 text-sm font-semibold">Material que respalda este criterio</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sources.map((source) => {
                    const reference = (criterion.source_refs ?? []).find((item) => item.source_id === source.id);
                    return <div key={source.id} className="rounded-lg bg-surface-2 p-2 text-sm">
                      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={Boolean(reference)} disabled={readOnly} onChange={(event) => update(index, { source_refs: event.currentTarget.checked ? [...(criterion.source_refs ?? []), { source_id: source.id }] : (criterion.source_refs ?? []).filter((item) => item.source_id !== source.id) })} /><span className="min-w-0 truncate" title={source.display_name}>{source.display_name}</span></label>
                      {reference && (source.page_count ?? 1) > 1 && <Field label="Página que aporta evidencia"><Input type="number" min={1} max={source.page_count ?? undefined} value={reference.pagina ?? ''} disabled={readOnly} onChange={(event) => update(index, { source_refs: (criterion.source_refs ?? []).map((item) => item.source_id === source.id ? { ...item, pagina: event.currentTarget.value ? Number(event.currentTarget.value) : null } : item) })} /></Field>}
                    </div>;
                  })}
                </div>
              </fieldset>
              )}
              <div>
                <p className="mb-3 text-sm font-semibold">Niveles de desempeño</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {criterion.niveles.map((level, levelIndex) => (
                    <div key={`${criterion.stable_key}-${levelIndex}`} className="rounded-xl border border-border bg-surface-2/50 p-3">
                      <Input
                        value={level.nombre}
                        onChange={(event) => update(index, {
                          niveles: criterion.niveles.map((item, position) => position === levelIndex ? { ...item, nombre: event.currentTarget.value } : item),
                        })}
                        className="mb-2 font-semibold"
                        aria-label={`Nombre del nivel ${levelIndex + 1}`}
                        disabled={readOnly}
                      />
                      <Textarea
                        value={level.descripcion}
                        onChange={(event) => update(index, {
                          niveles: criterion.niveles.map((item, position) => position === levelIndex ? { ...item, descripcion: event.currentTarget.value } : item),
                        })}
                        rows={4}
                        aria-label={`Descripción del nivel ${levelIndex + 1}`}
                        disabled={readOnly}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </Card>
      ))}

      {!readOnly && value.length > 0 && (
        <Button variant="outline" onClick={() => onChange(distributeCriteriaWeights([...value, emptyCriterion(value.length + 1, 0)]))}>
          <Plus className="h-4 w-4" /> Agregar otro criterio
        </Button>
      )}

      <div className="sticky bottom-3 z-10 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold">Distribución total</span>
              <span className={cn('font-bold', validTotal ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300')}>{total.toFixed(2)} %</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className={cn('h-full rounded-full transition-all', validTotal ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${Math.min(100, Math.max(0, total))}%` }} /></div>
          </div>
          {!readOnly && value.length > 1 && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange(distributeCriteriaWeights(value))}>
              <Sparkles className="h-4 w-4" /> Distribuir automáticamente
            </Button>
          )}
          <p className="w-full text-xs text-muted sm:w-auto">{!validTotal ? 'Ajusta los pesos hasta llegar a 100 %' : fieldsComplete ? 'Lista para aprobación' : 'Completa los campos obligatorios'}</p>
        </div>
      </div>
    </div>
  );
}
