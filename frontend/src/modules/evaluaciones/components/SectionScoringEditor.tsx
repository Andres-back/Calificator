import { useState } from 'react';
import { Button, ConfirmDialog, Field, Input } from '@/components/ui';
import type { EvaluationDocumentStructure } from '@/types/api';
import type { EditableQuestion } from './generationWizardModel';
import { documentOrder, pendingDocumentReview } from './documentModel';
import { compileSectionScores, enableSectionScoring, restoreSectionScores } from './sectionScoring';

export function SectionScoringEditor({ document, questions, maximum, onChange }: {
  document: EvaluationDocumentStructure; questions: EditableQuestion[]; maximum: number;
  onChange: (document: EvaluationDocumentStructure, questions: EditableQuestion[], confirmed: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [disable, setDisable] = useState(false);
  const scoring = document.puntuacion_secciones;
  const sections = documentOrder(document).filter(node => node.tipo === 'seccion');
  let proposal: EditableQuestion[] | null = null, proposalError = '';
  if (scoring) try { proposal = compileSectionScores(document, questions, maximum); }
  catch (issue) { proposalError = issue instanceof Error ? issue.message : 'Revisa el reparto.'; }
  let displayProposal = proposal;
  if (!displayProposal && scoring) try { displayProposal = compileSectionScores({ ...document, puntuacion_secciones: { ...scoring, ajustes: {} } }, questions, maximum); }
  catch { /* Group and budget errors stay visible above the confirmation. */ }
  function update(patch: Partial<NonNullable<EvaluationDocumentStructure['puntuacion_secciones']>>) {
    onChange(pendingDocumentReview({ ...document, puntuacion_secciones: { ...scoring!, ...patch, confirmado: false } }), questions, false);
    setError('');
  }
  return <section className="min-w-0 space-y-3 rounded-xl border border-border p-3 sm:p-4" aria-label="Puntajes por sección">
    <label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" checked={Boolean(scoring)} onChange={event => {
      if (!event.target.checked) { setDisable(true); return; }
      try { onChange(enableSectionScoring(document, questions), questions, false); setError(''); }
      catch (issue) { setError(issue instanceof Error ? issue.message : 'Ubica las preguntas en sus secciones.'); }
    }} />Asignar puntaje por sección (opcional)</label>
    <p className="text-sm leading-6 text-muted">Sin activar esta opción, se conservan los puntos de cada pregunta. Al activarla, el reparto solo se aplica cuando lo confirmas; no se vuelve a multiplicar al calificar.</p>
    {scoring && <>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">{sections.map(section => {
        const included = Object.prototype.hasOwnProperty.call(scoring.presupuestos, section.id);
        return <div key={section.id} className="min-w-0 rounded-lg border border-border p-3">
          <label className="flex min-h-11 items-start gap-2 text-sm font-semibold"><input className="mt-1 shrink-0" type="checkbox" checked={included}
            onChange={event => { const presupuestos = { ...scoring.presupuestos }; if (event.target.checked) presupuestos[section.id] = ''; else delete presupuestos[section.id]; update({ presupuestos, ajustes: {} }); }} />
            <span className="break-words">{section.padre_id ? '↳ ' : ''}{section.titulo}</span></label>
          {included && <Field label="Puntos de esta sección"><Input aria-label={`Puntos de ${section.titulo}`} inputMode="decimal" value={scoring.presupuestos[section.id]}
            onChange={event => update({ presupuestos: { ...scoring.presupuestos, [section.id]: event.target.value }, ajustes: {} })} /></Field>}
        </div>;
      })}</div>
      <p role="status" className="text-sm font-semibold">Asignado: {Object.values(scoring.presupuestos).reduce((sum, value) => sum + (Number(value.replace(',', '.')) || 0), 0).toLocaleString('es', { maximumFractionDigits: 2 })} de {maximum} puntos.</p>
      {proposalError && <p role="status" className="text-sm leading-6 text-amber-800 dark:text-amber-200">{proposalError}</p>}
      {displayProposal && <details className="rounded-lg border border-border p-3"><summary className="focus-ring min-h-11 cursor-pointer py-2 font-semibold">Ver y ajustar puntos por pregunta</summary>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{displayProposal.map(question => <Field key={question.contenidoId} label={`Pregunta ${document.nodos.find(node => node.pregunta_id === question.contenidoId)?.etiqueta_original ?? question.numero}: ${question.enunciado.slice(0, 90)}`}>
          <Input aria-label={`Ajuste interno ${question.numero}`} inputMode="decimal" value={scoring.ajustes?.[question.contenidoId!] ?? question.puntaje}
            onChange={event => update({ ajustes: { ...Object.fromEntries(displayProposal!.map(q => [q.contenidoId!, String(q.puntaje)])), ...scoring.ajustes, [question.contenidoId!]: event.target.value } })} />
        </Field>)}</div></details>}
      <Button type="button" variant="outline" disabled={!proposal} onClick={() => {
        const normalized = { ...scoring, confirmado: true,
          presupuestos: Object.fromEntries(Object.entries(scoring.presupuestos).map(([id, value]) => [id, value.replace(',', '.')])),
          ajustes: Object.fromEntries(Object.entries(scoring.ajustes ?? {}).map(([id, value]) => [id, value.replace(',', '.')])),
        };
        onChange(pendingDocumentReview({ ...document, puntuacion_secciones: normalized }), proposal!, true);
      }}>Confirmar reparto de puntos</Button>
      {scoring.confirmado && <p className="text-sm text-emerald-700 dark:text-emerald-300">Reparto aplicado a las preguntas. Se conservará al guardar esta versión.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <ConfirmDialog open={disable} onClose={() => setDisable(false)} title="¿Volver a los puntajes base?" description="Verifica que deseas recuperar los valores que tenían las preguntas antes del reparto. No cambia notas anteriores."
      confirmLabel="Restaurar puntajes base" onConfirm={() => {
        try { const restored = restoreSectionScores(document, questions, maximum); onChange(pendingDocumentReview({ ...document, puntuacion_secciones: null }), restored, true); setError(''); }
        catch (issue) { setError(issue instanceof Error ? issue.message : 'Revisa los valores base.'); }
        setDisable(false);
      }} />
  </section>;
}
