import { Button, Field, Input, Select } from '@/components/ui';
import { useState } from 'react';
import { compileScorePlan, formatAllocationScore as fmt, type ScoreGroup, type ScorePlan, type ScoreQuestion } from './scoreAllocation';

const names: Record<string, string> = { abierta: 'Abiertas', opcion_multiple: 'ABCD', verdadero_falso: 'Verdadero / falso', completar: 'Completar' };

function RangeBounds({ group, keys, index, update }: { group: ScoreGroup; keys: string[]; index: number; update: (keys: string[]) => void }) {
  const [start, setStart] = useState(group.claves.length ? String(keys.indexOf(group.claves[0]) + 1) : '');
  const [end, setEnd] = useState(group.claves.length ? String(keys.indexOf(group.claves[group.claves.length - 1]) + 1) : '');
  function change(from: string, to: string) {
    setStart(from); setEnd(to);
    const first = Number(from), last = Number(to);
    update(Number.isInteger(first) && first > 0 && Number.isInteger(last) && last >= first && last <= keys.length ? keys.slice(first - 1, last) : []);
  }
  return <><Field label="Desde posición"><Input aria-label={`Desde posición bloque ${index + 1}`} inputMode="numeric" value={start} onChange={e => change(e.target.value, end)} /></Field>
    <Field label="Hasta posición"><Input aria-label={`Hasta posición bloque ${index + 1}`} inputMode="numeric" value={end} onChange={e => change(start, e.target.value)} /></Field></>;
}

function regroup(mode: ScorePlan['modo'], questions: ScoreQuestion[], maximum: string): ScorePlan {
  if (mode === 'total' || mode === 'bloques') return { schema_version: 1, modo: mode, grupos: [{ id: 'total', titulo: mode === 'bloques' ? 'Bloque 1' : 'Todas las preguntas', claves: questions.map(q => q.clave), presupuesto: maximum, fijados: {} }] };
  const groups: Record<string, ScoreGroup> = {};
  for (const q of questions) {
    const id = mode === 'tipo' ? q.tipo : q.seccion_id || 'sin-seccion';
    groups[id] ??= { id, titulo: mode === 'tipo' ? names[id] || id : q.seccion_titulo || 'Sin sección', claves: [], presupuesto: '0', fijados: {} };
    groups[id].claves.push(q.clave);
    groups[id].presupuesto = String(Math.round((Number(groups[id].presupuesto) + Number(q.puntaje)) * 10000) / 10000);
  }
  return { schema_version: 1, modo: mode, grupos: Object.values(groups) };
}

export function ScorePlanEditor({ plan, questions, maximum, onChange, disabled = false }: {
  plan: ScorePlan; questions: ScoreQuestion[]; maximum: string; disabled?: boolean; onChange: (plan: ScorePlan) => void;
}) {
  const keys = questions.map(q => q.clave);
  let proposed: Record<string, string> = {}, error = '';
  try { proposed = compileScorePlan(plan, keys, maximum); }
  catch (issue) { error = issue instanceof Error ? issue.message : 'Revisa los puntos de cada bloque.'; }
  function update(index: number, patch: Partial<ScoreGroup>) {
    onChange({ ...plan, grupos: plan.grupos.map((group, i) => i === index ? { ...group, ...patch } : group) });
  }
  return <div className="min-w-0 space-y-4">
    <Field label="Forma de repartir"><Select disabled={disabled} value={plan.modo} onChange={e => onChange(regroup(e.target.value as ScorePlan['modo'], questions, maximum))}>
      <option value="total">Todas por igual (con valores fijados opcionales)</option><option value="tipo">Por tipo de pregunta</option>
      <option value="seccion" disabled={!questions.some(q => q.seccion_id)}>Por secciones del documento</option><option value="bloques">Por bloques de posiciones</option>
    </Select></Field>
    <p className="text-sm leading-6 text-muted">Los puntos del bloque son su valor total, no el valor de cada pregunta. Fijar una pregunta redistribuye únicamente lo que queda en su bloque. Cambiar la forma de repartir reinicia los valores fijados.</p>
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      <legend className="sr-only">Bloques de puntos</legend>
      {plan.grupos.map((group, index) => <section key={group.id} className="min-w-0 space-y-3 rounded-xl border border-border p-3 sm:p-4" aria-label={`Bloque ${index + 1}`}>
        <h3 className="break-words font-semibold">{group.titulo || `Bloque ${index + 1}`}</h3>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3">
          {plan.modo === 'bloques' && <RangeBounds group={group} keys={keys} index={index} update={claves => update(index, { claves, fijados: {} })} />}
          <Field label="Puntos del bloque"><Input aria-label={`Puntos del bloque ${index + 1}`} inputMode="decimal" value={group.presupuesto} onChange={e => update(index, { presupuesto: e.target.value })} /></Field>
        </div>
        <p className="break-words text-sm text-muted">Posiciones: {group.claves.map(key => keys.indexOf(key) + 1).join(', ') || 'Selecciona un intervalo válido'}. Fijado: {fmt(Object.values(group.fijados).reduce((sum, v) => sum + (Number(v.replace(',', '.')) || 0), 0))}; por repartir: {fmt(Number(group.presupuesto.replace(',', '.')) - Object.values(group.fijados).reduce((sum, v) => sum + (Number(v.replace(',', '.')) || 0), 0))}.</p>
        <div className="space-y-2">{questions.filter(q => group.claves.includes(q.clave)).map(q => {
          const position = keys.indexOf(q.clave) + 1, pinned = Object.prototype.hasOwnProperty.call(group.fijados, q.clave);
          return <div key={q.clave} className="grid min-w-0 gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_8rem]">
            <div className="min-w-0"><p className="break-words text-sm font-semibold">{position}. {q.titulo}</p><p className="text-sm text-muted">Actual: {fmt(q.puntaje)} → Propuesta: <strong data-testid={`proposal-${q.clave}`}>{proposed[q.clave] ? fmt(proposed[q.clave]) : '—'}</strong></p></div>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" aria-label={`Fijar posición ${position}`} checked={pinned} onChange={e => {
              const fixed = { ...group.fijados }; if (e.target.checked) fixed[q.clave] = proposed[q.clave] || q.puntaje; else delete fixed[q.clave]; update(index, { fijados: fixed });
            }} />Fijar</label>
            {pinned && <Input aria-label={`Valor fijado posición ${position}`} inputMode="decimal" value={group.fijados[q.clave]} onChange={e => update(index, { fijados: { ...group.fijados, [q.clave]: e.target.value } })} />}
          </div>;
        })}</div>
        {plan.modo === 'bloques' && plan.grupos.length > 1 && <Button type="button" variant="outline" onClick={() => onChange({ ...plan, grupos: plan.grupos.filter((_, i) => i !== index) })}>Quitar bloque {index + 1}</Button>}
      </section>)}
      {plan.modo === 'bloques' && plan.grupos.length < questions.length && <Button type="button" variant="outline" onClick={() => {
        const unused = keys.filter(key => !plan.grupos.some(g => g.claves.includes(key)));
        onChange({ ...plan, grupos: [...plan.grupos, { id: `bloque-${crypto.randomUUID()}`, titulo: `Bloque ${plan.grupos.length + 1}`, claves: unused, presupuesto: '', fijados: {} }] });
      }}>Añadir bloque</Button>}
    </fieldset>
    <p role="status" className="font-semibold">Asignado: {fmt(plan.grupos.reduce((sum, g) => sum + (Number(g.presupuesto.replace(',', '.')) || 0), 0))} de {fmt(maximum)} puntos.</p>
    {error ? <p role="alert" className="rounded-lg border border-amber-400 p-3 text-sm">{error}</p> : <p className="text-sm text-muted">Total exacto. Los últimos decimales se distribuyen por posición para no perder puntos.</p>}
  </div>;
}
