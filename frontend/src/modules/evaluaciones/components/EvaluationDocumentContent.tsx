import type { ReactNode } from 'react';
import type { EvaluationDocumentNode, EvaluationDocumentStructure, Evaluacion } from '@/types/api';
import { RichContent } from '@/components/ui';
import { documentOrder } from './documentModel';
import { EvaluationContentViewer } from './EvaluationContentViewer';

interface Props {
  document: EvaluationDocumentStructure;
  questions: Record<string, unknown>[];
  evaluationId: string;
  versionId?: string | null;
  visuals?: Evaluacion['contenido_visual'];
  renderQuestion?: (node: EvaluationDocumentNode, question: Record<string, unknown>) => ReactNode;
}

export function EvaluationDocumentContent({ document, questions, evaluationId, versionId, visuals, renderQuestion }: Props) {
  let ordered: EvaluationDocumentNode[];
  try { ordered = documentOrder(document); } catch {
    return <p role="alert" className="rounded-xl border border-amber-300 p-4">No pudimos comprobar las secciones. Pide al docente revisar el documento.</p>;
  }
  const byId = new Map(questions.map(question => [String(question.contenido_id), question]));
  const references = ordered.filter(node => node.tipo === 'pregunta').map(node => node.pregunta_id);
  if (new Set(references).size !== references.length || references.some(id => !id || !byId.has(id)) || references.length !== byId.size) {
    return <p role="alert" className="rounded-xl border border-amber-300 p-4">Las preguntas y las secciones no coinciden. Pide al docente revisar esta versión.</p>;
  }
  const blocks = new Map((visuals?.bloques ?? []).map(block => [block.id, block]));
  const placed = new Set(ordered.filter(node => node.tipo === 'material').map(node => node.bloque_id));
  if (ordered.some(node => node.tipo === 'material' && (!node.bloque_id || !blocks.has(node.bloque_id)))) {
    return <p role="alert" className="rounded-xl border border-amber-300 p-4">Falta material de una sección. Pide al docente revisar esta versión.</p>;
  }
  return <div aria-label="Documento de la evaluación" className="min-w-0 max-w-full space-y-4">
    {ordered.map(node => {
      if (node.tipo === 'seccion') {
        const title = [node.etiqueta_original, node.titulo].filter(Boolean).join(' · ');
        return node.padre_id
          ? <h3 key={node.id} id={`document-${node.id}`} className="scroll-mt-24 break-words border-l-4 border-brand-400 pl-3 pt-3 text-base font-bold">{title}</h3>
          : <h2 key={node.id} id={`document-${node.id}`} className="scroll-mt-24 break-words border-b border-border pb-2 pt-4 font-display text-lg font-bold">{title}</h2>;
      }
      if (node.tipo === 'texto') return <div key={node.id} className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
        {node.proposito && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{{ lectura: 'Lectura', instruccion: 'Indicaciones', actividad: 'Actividad compartida', recuadro: 'Texto de apoyo' }[node.proposito]}</p>}
        <p className="whitespace-pre-wrap break-words text-base leading-7">{node.texto}</p>
      </div>;
      if (node.tipo === 'material') return <EvaluationContentViewer key={node.id} evaluationId={evaluationId} versionId={versionId}
        content={{ schema_version: 1, bloques: [blocks.get(node.bloque_id!)!] }} />;
      const question = byId.get(node.pregunta_id!)!;
      if (renderQuestion) return <div key={node.id} className="min-w-0">{renderQuestion(node, question)}</div>;
      return <article key={node.id} id={`pregunta-${question.numero}`} className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Pregunta {node.etiqueta_original || String(question.numero)}</p>
        <RichContent content={String(question.enunciado ?? '')} variant="evaluation" />
        {visuals && <EvaluationContentViewer evaluationId={evaluationId} versionId={versionId}
          content={{ ...visuals, bloques: visuals.bloques.filter(block => !placed.has(block.id)) }} questionId={node.pregunta_id!} />}
        {Array.isArray(question.opciones) && question.opciones.length > 0 && <ul className="mt-3 space-y-2">{question.opciones.map((option, index) => <li key={index} className="break-words text-sm leading-6">{String(option)}</li>)}</ul>}
      </article>;
    })}
  </div>;
}
