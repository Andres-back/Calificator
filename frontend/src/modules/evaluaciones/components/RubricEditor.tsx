import { ArrowDown, ArrowUp, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Field, Input, Textarea } from '@/components/ui';
import { createBlankRubricCriterion, moveRubricCriterion, rebalanceRubricWeights, rubricWeightTotal, validateRubricCriteria, type EditableRubricCriterion } from './generationWizardModel';

export function RubricEditor({
  criteria,
  onChange,
  showValidation = true,
}: {
  criteria: EditableRubricCriterion[];
  onChange: (criteria: EditableRubricCriterion[]) => void;
  showValidation?: boolean;
}) {
  const totalWeight = rubricWeightTotal(criteria);
  const error = showValidation ? validateRubricCriteria(criteria) : null;

  function updateCriterion(index: number, criterionPatch: Partial<EditableRubricCriterion>) {
    onChange(criteria.map((criterion, currentIndex) => (
      currentIndex === index ? { ...criterion, ...criterionPatch } : criterion
    )));
  }

  return (
    <section aria-label="Editor de rúbrica" className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-500/30 dark:bg-violet-500/10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold">Rúbrica editable</h4>
            <Badge tone={error ? 'warning' : 'success'}>Peso total: {totalWeight} %</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted">Ajusta qué evaluar y cuánto pesa cada criterio. Los pesos deben sumar 100 %.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onChange(rebalanceRubricWeights(criteria))} disabled={!criteria.length}>
            <ListChecks className="h-4 w-4" /> Distribuir pesos
          </Button>
          <Button type="button" variant="outline" onClick={() => onChange(createBlankRubricCriterion(criteria))}>
            <Plus className="h-4 w-4" /> Agregar criterio
          </Button>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">{error}</p>}

      <div role="list" aria-label="Criterios editables" className="mt-4 space-y-3">
        {criteria.map((criterion, index) => (
          <article role="listitem" key={`rubric-${index}`} className="rounded-xl border border-violet-200 bg-surface p-4 dark:border-violet-500/20">
            <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-100">{index + 1}</span>
              <p className="min-w-0 flex-1 font-bold">Criterio {index + 1}</p>
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(moveRubricCriterion(criteria, index, -1))} disabled={index === 0} aria-label={`Subir criterio ${index + 1}`}><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(moveRubricCriterion(criteria, index, 1))} disabled={index === criteria.length - 1} aria-label={`Bajar criterio ${index + 1}`}><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onChange(criteria.filter((_, currentIndex) => currentIndex !== index))} aria-label={`Eliminar criterio ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <Field label="Nombre" required>
                <Input value={criterion.nombre} onChange={(event) => updateCriterion(index, { nombre: event.target.value })} aria-label={`Nombre del criterio ${index + 1}`} className="min-h-12 text-base" />
              </Field>
              <Field label="Peso porcentual" required>
                <Input type="number" min={0.01} max={100} step={0.01} value={criterion.peso_porcentaje} onChange={(event) => updateCriterion(index, { peso_porcentaje: Number(event.target.value) })} aria-label={`Peso del criterio ${index + 1}`} className="min-h-12 text-base" />
              </Field>
            </div>
            <Field label="Descripción" hint="Opcional, pero ayuda a que la calificación sea transparente.">
              <Textarea value={criterion.descripcion} onChange={(event) => updateCriterion(index, { descripcion: event.target.value })} aria-label={`Descripción del criterio ${index + 1}`} className="min-h-20 text-base" />
            </Field>

            {Object.keys(criterion.niveles).length > 0 && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3">
                <p className="text-sm font-bold">Descriptores de desempeño</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {Object.entries(criterion.niveles).map(([level, description]) => (
                    <Field key={level} label={level}>
                      <Textarea
                        value={description}
                        onChange={(event) => updateCriterion(index, { niveles: { ...criterion.niveles, [level]: event.target.value } })}
                        aria-label={`Descripción del nivel ${level} del criterio ${index + 1}`}
                        className="min-h-20 text-base"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
