import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, CheckCircle2, Layers3, Plus } from 'lucide-react';
import { Button, ConfirmDialog, Field, Input, Textarea } from '@/components/ui';
import type { EvaluationDocumentNode, EvaluationDocumentStructure } from '@/types/api';
import type { EditableQuestion } from './generationWizardModel';
import { addDocumentSection, addDocumentText, confirmDocumentReview, documentOrder,
  moveDocumentNode, questionDocumentPath, removeDocumentNode, updateDocumentNode } from './documentModel';

interface Props {
  document: EvaluationDocumentStructure;
  questions: EditableQuestion[];
  activeQuestionId: string | null;
  onSelectQuestion: (id: string | null) => void;
  onChange?: (document: EvaluationDocumentStructure) => void;
  onReviewKeys?: (document: EvaluationDocumentStructure) => void;
}

export function EvaluationDocumentOutline({ document, questions, activeQuestionId, onSelectQuestion, onChange, onReviewKeys }: Props) {
  const initialQuestion = document.nodos.find(node => node.pregunta_id === activeQuestionId);
  const initialParent = initialQuestion ? initialQuestion.padre_id : document.nodos.find(node => node.tipo === 'seccion')?.id ?? null;
  const [sectionId, setSectionId] = useState<string | null>(initialParent);
  const [error, setError] = useState<string | null>(null);
  const [expandedTextId, setExpandedTextId] = useState<string | null>(() => document.nodos.find(node => node.tipo === 'texto' && node.padre_id === (initialParent ?? sectionId))?.id ?? null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const previousQuestion = useRef(activeQuestionId);
  useEffect(() => {
    if (previousQuestion.current === activeQuestionId) return;
    previousQuestion.current = activeQuestionId;
    if (activeQuestionId) {
      const parent = document.nodos.find(node => node.pregunta_id === activeQuestionId)?.padre_id ?? null;
      setSectionId(parent);
      setExpandedTextId(document.nodos.find(node => node.tipo === 'texto' && node.padre_id === parent)?.id ?? null);
    }
  }, [activeQuestionId, document.nodos]);

  let ordered: EvaluationDocumentNode[];
  try { ordered = documentOrder(document); } catch {
    return <p role="alert" className="rounded-xl border border-amber-300 p-4">La organización necesita revisión. Conservamos tu edición; vuelve a cargar el documento original.</p>;
  }
  const sections = ordered.filter(node => node.tipo === 'seccion');
  const selected = document.nodos.find(node => node.id === sectionId);
  const byParent = new Map(document.nodos.map(node => [node.id, node.padre_id]));
  function belongs(parent: string | null) {
    const seen = new Set<string>();
    while (parent && parent !== sectionId && !seen.has(parent)) { seen.add(parent); parent = byParent.get(parent) ?? null; }
    return parent === sectionId;
  }
  const questionNodes = ordered.filter(node => node.tipo === 'pregunta' && belongs(node.padre_id));
  const texts = ordered.filter(node => node.tipo === 'texto' && node.padre_id === sectionId);

  function selectSection(id: string | null) {
    setSectionId(id); setError(null);
    setExpandedTextId(document.nodos.find(node => node.tipo === 'texto' && node.padre_id === id)?.id ?? null);
    const direct = ordered.find(node => node.tipo === 'pregunta' && node.padre_id === id);
    const descendants = new Set<string>(id ? [id] : []);
    for (const node of ordered) if (node.padre_id && descendants.has(node.padre_id)) descendants.add(node.id);
    const first = direct ?? ordered.find(node => node.tipo === 'pregunta' && descendants.has(node.id));
    // This question follows an explicit section choice; do not let the external
    // question-navigation effect replace the chosen parent with its subsection.
    previousQuestion.current = first?.pregunta_id ?? null;
    onSelectQuestion(previousQuestion.current);
  }

  function move(id: string, parent: string | null, position: number) {
    try { onChange?.(moveDocumentNode(document, id, parent, position)); setError(null); }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Revisa el destino del contenido.'); }
  }
  function controls(id: string) {
    const node = document.nodos.find(item => item.id === id)!;
    const siblings = ordered.filter(item => item.padre_id === node.padre_id);
    const position = siblings.findIndex(item => item.id === id);
    return onChange && <div className="mt-2 flex flex-wrap gap-2">
      <Button type="button" variant="outline" aria-label="Subir bloque" disabled={position <= 0} onClick={() => move(id, node.padre_id, position - 1)}><ArrowUp className="h-4 w-4" /> Subir</Button>
      <Button type="button" variant="outline" aria-label="Bajar bloque" disabled={position === siblings.length - 1} onClick={() => move(id, node.padre_id, position + 1)}><ArrowDown className="h-4 w-4" /> Bajar</Button>
      {node.tipo !== 'pregunta' && <Button type="button" variant="ghost" onClick={() => setRemoveId(id)}>Retirar {node.tipo === 'seccion' ? 'sección' : 'texto'}</Button>}
    </div>;
  }

  return <section aria-label="Organización de la evaluación" className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-3 sm:p-5">
    <div className="flex items-start gap-3"><Layers3 className="mt-1 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
      <div><h3 className="font-bold">Secciones y textos de apoyo</h3><p className="mt-1 text-sm leading-6 text-muted">Conserva la lectura, las actividades y las preguntas en el orden del documento.</p></div></div>
    <Field label="Sección actual"><select aria-label="Sección actual" className="focus-ring min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base"
      value={sectionId ?? ''} onChange={event => selectSection(event.target.value || null)}>
      <option value="">Contenido general</option>{sections.map(node => <option key={node.id} value={node.id}>{node.padre_id ? '↳ ' : ''}{[node.etiqueta_original, node.titulo].filter(Boolean).join(' · ')}</option>)}
    </select></Field>
    {onChange && selected?.tipo === 'seccion' && <div className="grid min-w-0 gap-3 sm:grid-cols-[6rem_1fr]">
      <Field label="Etiqueta"><Input aria-label="Etiqueta de la sección" value={selected.etiqueta_original ?? ''} maxLength={40}
        onChange={event => onChange(updateDocumentNode(document, selected.id, { etiqueta_original: event.target.value || null }))} /></Field>
      <Field label="Título de la sección"><Input aria-label="Título de la sección" value={selected.titulo ?? ''} maxLength={500}
        onChange={event => onChange(updateDocumentNode(document, selected.id, { titulo: event.target.value }))} /></Field>
    </div>}
    {selected && controls(selected.id)}
    {onChange && selected?.tipo === 'seccion' && <Field label="Ubicación de la sección"><select aria-label="Sección principal" value={selected.padre_id ?? ''}
      className="focus-ring min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base" onChange={event => {
        const parent = event.target.value || null; move(selected.id, parent, document.nodos.filter(node => node.padre_id === parent).length);
      }}><option value="">Sección principal</option>{sections.filter(node => node.id !== selected.id).map(node => <option key={node.id} value={node.id}>{node.titulo}</option>)}</select></Field>}
    {texts.map(node => <details key={node.id} open={expandedTextId === node.id} className="min-w-0 rounded-xl border border-border p-3">
      <summary onClick={event => { event.preventDefault(); setExpandedTextId(current => current === node.id ? null : node.id); }} className="focus-ring flex min-h-11 cursor-pointer items-center gap-2 font-semibold"><BookOpen className="h-4 w-4 shrink-0" />
        {{ lectura: 'Lectura de esta sección', instruccion: 'Indicaciones', actividad: 'Actividad sin nota', recuadro: 'Texto de apoyo' }[node.proposito ?? 'recuadro']}</summary>
      {onChange ? <Textarea aria-label={`Texto de ${node.proposito === 'lectura' ? 'lectura' : 'apoyo'}`} value={node.texto ?? ''} rows={8} maxLength={60000}
        className="min-h-44 text-base leading-7" onChange={event => onChange(updateDocumentNode(document, node.id, { texto: event.target.value }))} />
        : <p className="whitespace-pre-wrap break-words text-base leading-7">{node.texto}</p>}{controls(node.id)}
    </details>)}
    {questionNodes.length ? <div className="flex flex-wrap gap-2" aria-label="Preguntas de esta sección">
      {questionNodes.map(node => <Button key={node.id} type="button" variant={node.pregunta_id === activeQuestionId ? 'primary' : 'outline'}
        aria-pressed={node.pregunta_id === activeQuestionId} onClick={() => onSelectQuestion(node.pregunta_id!)}>
        Pregunta {node.etiqueta_original || questions.find(question => question.contenidoId === node.pregunta_id)?.numero}
      </Button>)}
    </div> : <p className="text-sm leading-6 text-muted">Esta sección no tiene preguntas calificables. Su lectura o actividad se conserva sin añadir puntos.</p>}
    {activeQuestionId && <p className="break-words text-xs font-semibold text-muted">{questionDocumentPath(document, activeQuestionId)}</p>}
    {onChange && activeQuestionId && <Field label="Mover pregunta a otra sección"><select aria-label="Sección de la pregunta" className="focus-ring min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-base"
      value={document.nodos.find(node => node.pregunta_id === activeQuestionId)?.padre_id ?? ''}
      onChange={event => { const node = document.nodos.find(item => item.pregunta_id === activeQuestionId)!; const parent = event.target.value || null;
        move(node.id, parent, document.nodos.filter(item => item.padre_id === parent).length); setSectionId(parent); }}>
      <option value="">Contenido general</option>{sections.map(node => <option key={node.id} value={node.id}>{node.titulo}</option>)}
    </select></Field>}
    {onChange && <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => { const next = addDocumentSection(document, 'Nueva sección'); onChange(next); setSectionId(next.nodos[next.nodos.length - 1].id); onSelectQuestion(null); }}><Plus className="h-4 w-4" /> Añadir sección</Button>
      <Button type="button" variant="outline" onClick={() => { const next = addDocumentSection(document, 'Nueva subsección', sectionId); onChange(next); setSectionId(next.nodos[next.nodos.length - 1].id); onSelectQuestion(null); }} disabled={!sectionId}>Añadir subsección</Button>
      {(['lectura', 'instruccion', 'actividad'] as const).map(purpose => <Button key={purpose} type="button" variant="outline" onClick={() => {
        const next = addDocumentText(document, sectionId, purpose); onChange(next); setExpandedTextId(next.nodos[next.nodos.length - 1].id);
      }}>Añadir {{ lectura: 'lectura', instruccion: 'indicaciones', actividad: 'actividad sin nota' }[purpose]}</Button>)}
    </div>}
    {document.revision?.avisos.length ? <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
      <p className="font-semibold">Antes de publicar, compara con el original.</p><ul className="ml-5 mt-1 list-disc">{document.revision.avisos.map((warning, index) => <li key={index}>{warning.mensaje}</li>)}</ul>
    </div> : null}
    {onChange && <label className="focus-within:ring-brand-400 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm leading-6">
      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0" checked={document.revision?.confirmado === true}
        onChange={event => {
          if (!event.target.checked) { onChange({ ...document, revision: { detectados: [], conservados: [], avisos: [], ...document.revision, estado: 'requiere_revision', confirmado: false } }); return; }
          try { const next = confirmDocumentReview(document, questions); if (onReviewKeys) onReviewKeys(next); else onChange(next); setError(null); }
          catch (issue) { setError(issue instanceof Error ? issue.message : 'Revisa el documento antes de confirmar.'); }
        }} />
      <span>Comparé las secciones y los textos con el original, comprobé que no faltan partes y revisé las respuestas correctas.</span>
    </label>}
    {document.revision?.confirmado && <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Organización revisada</p>}
    {error && <p role="alert" className="text-sm leading-6 text-rose-700 dark:text-rose-300">{error}</p>}
    <ConfirmDialog open={Boolean(removeId)} onClose={() => setRemoveId(null)} title="¿Retirar este contenido de la edición?"
      description="Se retirará de esta versión. El archivo original y las versiones anteriores se conservan. Una sección con preguntas debe vaciarse o reorganizarse primero."
      confirmLabel="Retirar contenido" tone="danger" onConfirm={() => {
        try { const next = removeDocumentNode(document, removeId!, 'Contenido retirado expresamente por el docente.'); onChange?.(next);
          if (removeId === sectionId) selectSection(null); setRemoveId(null); setError(null); }
        catch (issue) { setRemoveId(null); setError(issue instanceof Error ? issue.message : 'No se pudo retirar el contenido.'); }
      }} />
  </section>;
}
