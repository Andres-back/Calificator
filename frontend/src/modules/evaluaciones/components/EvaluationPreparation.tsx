import { useState, type RefObject } from 'react';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import { MateriaSelect } from '@/modules/materias/MateriaSelect';
import type { DBAUnifiedItem, Materia } from '@/types/api';
import { DBASelector } from './DBASelector';
import { MAX_QUESTIONS, MIN_QUESTIONS, QUESTION_TYPES, resizeQuestionCounts, totalQuestionCount, type WizardState } from './generationWizardModel';
import { MODALITY_OPTIONS, TYPE_COPY } from './generationWizardOptions';

export function EvaluationPreparation({ state, materias, fixedContext, expanded, onExpandedChange, onPatch, onTopicChange, onMateriaChange, onToggleCriterion, criteria, referenceInputRef, extracting, onReferenceFile }: {
  state: WizardState;
  materias: Materia[];
  fixedContext: boolean;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  onPatch: (patch: Partial<WizardState>) => void;
  onTopicChange: (topic: string) => void;
  onMateriaChange: (id: string) => void;
  onToggleCriterion: (item: DBAUnifiedItem) => void;
  criteria: { items: DBAUnifiedItem[] | undefined; loading: boolean; error: boolean };
  referenceInputRef: RefObject<HTMLInputElement>;
  extracting: boolean;
  onReferenceFile: (file: File | undefined) => void;
}) {
  const [criterionText, setCriterionText] = useState('');
  const materia = materias.find(item => item.id === state.materiaId);
  const total = totalQuestionCount(state.counts);
  const generated = Boolean(state.generatedEvaluationId);
  const selected = state.useDba ? state.dbaIds.length + state.dbaPersonalizadoIds.length : 0;
  const summary = [
    ...QUESTION_TYPES.filter(type => state.counts[type] > 0).map(type => `${state.counts[type]} ${TYPE_COPY[type].label.toLocaleLowerCase('es')}`),
    selected ? `${selected} criterios seleccionados` : 'Sin criterios seleccionados',
    state.useRubric ? 'Con rúbrica' : '',
    state.referenceText.trim() || state.referenceFile ? 'Con material' : '',
    state.fechaLimiteEntrega ? `Entrega: ${state.fechaLimiteEntrega.replace('T', ' ')}` : '',
  ].filter(Boolean).join(' · ');
  const addCriterion = () => {
    const value = criterionText.trim();
    if (value && !state.rubricCriteria.includes(value)) onPatch({ rubricCriteria: [...state.rubricCriteria, value] });
    setCriterionText('');
  };

  return <section aria-labelledby="wizard-step-title" className="space-y-4">
    <h3 id="wizard-step-title" className="text-lg font-bold">Prepara tu evaluación</h3>
    {fixedContext || materias.length === 1 ? <p className="break-words text-sm text-muted"><strong className="text-fg">{materia?.nombre ?? 'Materia seleccionada'}</strong>{materia?.grado || materia?.area ? <span className="block">{[materia?.grado ? `Grado ${materia.grado}` : '', materia?.area ? `Área: ${materia.area}` : ''].filter(Boolean).join(' · ')}</span> : null}</p>
      : <Field label="Materia" required><MateriaSelect value={state.materiaId} materias={materias} onChange={onMateriaChange} /></Field>}
    <Field label="¿Qué quieres evaluar?" required><Textarea data-prepare-field="topic" autoFocus value={state.descripcion} onChange={event => onTopicChange(event.target.value)} className="min-h-20 text-base" maxLength={2000} placeholder="Ejemplo: resolver sumas de fracciones y explicar el procedimiento" /></Field>
    {state.nombre && <p className="break-words text-xs text-muted">Nombre: <strong>{state.nombre}</strong></p>}
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">Cantidad de preguntas</legend>
      <div className="flex flex-wrap gap-2">
        {[5, 10].map(count => <Button key={count} type="button" variant={total === count ? 'primary' : 'outline'} aria-pressed={total === count} disabled={generated} onClick={() => onPatch({ counts: resizeQuestionCounts(state.counts, count) })}>{count} preguntas</Button>)}
        <Button type="button" variant="outline" onClick={() => onExpandedChange(true)}>Personalizar cantidad</Button>
      </div>
      {generated && <p className="text-xs text-muted">Para cambiar la cantidad o los tipos, edita las preguntas en Revisar.</p>}
    </fieldset>
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold">¿Cómo responderá el grupo?</legend>
      <div className="grid grid-cols-2 gap-2">
        {MODALITY_OPTIONS.filter(option => option.value !== 'mixta').map(option => <label key={option.value} className={cn('focus-within:ring-2 focus-within:ring-focus flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border p-3', state.modalidad === option.value ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-border bg-surface')}>
          <input type="radio" name="modalidad" value={option.value} checked={state.modalidad === option.value} onChange={() => onPatch({ modalidad: option.value })} className="h-5 w-5 shrink-0 accent-brand-600" />
          <span className="text-sm font-semibold">{option.label}</span>
        </label>)}
      </div>
      {state.modalidad === 'mixta' && <p className="text-sm font-semibold text-brand-700 dark:text-brand-200">Modalidad mixta seleccionada</p>}
    </fieldset>
    <details open={expanded} onToggle={event => onExpandedChange(event.currentTarget.open)} className="group rounded-xl border border-border bg-surface">
      <summary className="focus-ring flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl p-3 font-semibold"><span>Personalizar</span><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 group-open:rotate-180" /></summary>
      <div className="space-y-5 border-t border-border p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre de la evaluación"><Input data-prepare-field="name" value={state.nombre} maxLength={200} onChange={event => onPatch({ nombre: event.target.value, nombreAutomatico: false })} className="min-h-12 text-base" /></Field>
          <Field label="Nota máxima"><Input data-prepare-field="scale" type="number" min={0.1} step={0.1} value={state.notaMaxima} onChange={event => onPatch({ notaMaxima: Number(event.target.value) })} className="min-h-12 text-base" /></Field>
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border p-3"><input type="radio" name="modalidad" value="mixta" checked={state.modalidad === 'mixta'} onChange={() => onPatch({ modalidad: 'mixta' })} className="h-5 w-5 shrink-0 accent-brand-600" /><span><strong className="block text-sm">Mixta</strong><span className="text-xs text-muted">Combina preguntas en papel y en línea.</span></span></label>
        <section className="space-y-3" aria-label="Tipos de preguntas">
          <h4 className="font-semibold">Tipos de preguntas · {total} en total</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {QUESTION_TYPES.map(type => <div key={type} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-border p-2">
              <span className="min-w-0 break-words text-sm">{TYPE_COPY[type].label}</span>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="outline" size="icon" disabled={generated || !state.counts[type]} aria-label={`Quitar una pregunta de ${TYPE_COPY[type].label}`} onClick={() => onPatch({ counts: { ...state.counts, [type]: Math.max(0, state.counts[type] - 1) } })}><Minus className="h-4 w-4" /></Button>
                <span className="min-w-6 text-center font-semibold tabular-nums">{state.counts[type]}</span>
                <Button type="button" variant="outline" size="icon" disabled={generated || total >= MAX_QUESTIONS} aria-label={`Agregar una pregunta de ${TYPE_COPY[type].label}`} onClick={() => onPatch({ counts: { ...state.counts, [type]: state.counts[type] + 1 } })}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>)}
          </div>
          <p className="text-xs text-muted">Entre {MIN_QUESTIONS} y {MAX_QUESTIONS} preguntas. Revisa el reparto antes de generar.</p>
        </section>
        <label className="flex min-h-12 cursor-pointer items-start gap-3"><input type="checkbox" checked={state.useDba} onChange={event => onPatch({ useDba: event.target.checked, ...(!event.target.checked ? { dbaIds: [], dbaPersonalizadoIds: [] } : {}) })} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" /><span><strong className="block text-sm">Usar criterios de aprendizaje</strong><span className="text-xs text-muted">Solo se tendrán en cuenta los que elijas.</span></span></label>
        {state.useDba && <DBASelector items={criteria.items} selectedOfficial={state.dbaIds} selectedCustom={state.dbaPersonalizadoIds} loading={criteria.loading} error={criteria.error} onToggle={onToggleCriterion} spacious />}
        <label className="flex min-h-12 cursor-pointer items-start gap-3"><input type="checkbox" checked={state.useRubric} onChange={event => onPatch({ useRubric: event.target.checked })} className="mt-1 h-5 w-5 shrink-0 accent-brand-600" /><span><strong className="block text-sm">Evaluar con rúbrica</strong><span className="text-xs text-muted">Puedes indicar criterios o revisar los propuestos por la IA.</span></span></label>
        {state.useRubric && <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row"><Input value={criterionText} onChange={event => setCriterionText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCriterion(); } }} aria-label="Nuevo criterio de rúbrica" className="min-h-12 text-base" placeholder="Ejemplo: explicar y justificar el procedimiento" /><Button type="button" variant="outline" disabled={!criterionText.trim()} onClick={addCriterion}>Agregar criterio</Button></div>
          {state.rubricCriteria.map((criterion, index) => <div key={`${criterion}-${index}`} className="flex items-center gap-2 rounded-xl bg-surface-2 p-2"><span className="min-w-0 flex-1 break-words text-sm">{criterion}</span><Button type="button" size="icon" variant="ghost" aria-label={`Eliminar criterio ${criterion}`} onClick={() => onPatch({ rubricCriteria: state.rubricCriteria.filter((_, position) => position !== index) })}><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>}
        <section className="space-y-3" aria-label="Material de referencia">
          <h4 className="font-semibold">Material de referencia <span className="text-xs font-normal text-muted">Opcional</span></h4>
          <input ref={referenceInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => onReferenceFile(event.target.files?.[0])} aria-label="Seleccionar material de referencia" className="sr-only" />
          <Button type="button" variant="outline" disabled={extracting} onClick={() => referenceInputRef.current?.click()}>Añadir foto o PDF</Button>
          {extracting && <p role="status" className="text-sm text-muted">Leyendo el material…</p>}
          {state.referenceFile && <div className="flex min-w-0 flex-wrap items-center gap-2"><span className="min-w-0 flex-1 break-all text-xs">{state.referenceFile.name}{state.referenceFile.needsReselection ? ' · Vuelve a seleccionarlo' : ''}</span><Button type="button" variant="ghost" disabled={extracting} onClick={() => { onPatch({ referenceFile: null, referenceText: '' }); if (referenceInputRef.current) referenceInputRef.current.value = ''; }}>Quitar material</Button></div>}
          <Field label="Texto de referencia y contenido extraído" hint={`${state.referenceText.length}/12000 caracteres`}><Textarea value={state.referenceText} onChange={event => onPatch({ referenceText: event.target.value })} className="min-h-28 text-base" maxLength={12000} /></Field>
        </section>
        <Field label="Fecha límite de entrega" hint="Opcional. Al vencer, quien no haya entregado recibirá 0."><Input data-prepare-field="deadline" type="datetime-local" value={state.fechaLimiteEntrega} onChange={event => onPatch({ fechaLimiteEntrega: event.target.value })} className="min-h-12 text-base" /></Field>
        <Field label="Indicaciones adicionales para la IA" hint="Opcional"><Textarea value={state.instruccionesAdicionales} onChange={event => onPatch({ instruccionesAdicionales: event.target.value })} className="min-h-24 text-base" maxLength={2000} /></Field>
      </div>
    </details>
    <p aria-label="Resumen de preparación" className="break-words text-xs leading-5 text-muted">{summary}</p>
  </section>;
}
