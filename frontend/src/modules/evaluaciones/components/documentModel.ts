import type { EvaluationDocumentNode, EvaluationDocumentStructure } from '@/types/api';
import type { EditableQuestion } from './generationWizardModel';

type Document = EvaluationDocumentStructure;
type Node = EvaluationDocumentNode;

export function documentOrder(document: Document): Node[] {
  if (!Array.isArray(document.nodos) || !document.nodos.length || document.nodos.length > 5000) throw new Error('Revisa los bloques del documento.');
  const known = new Map(document.nodos.map(node => [node.id, node]));
  if (known.size !== document.nodos.length) throw new Error('Hay bloques repetidos en el documento.');
  const children = new Map<string | null, Node[]>();
  for (const node of document.nodos) {
    if (!node.id || !Number.isInteger(node.orden) || node.orden < 0) throw new Error('Revisa el orden de las secciones.');
    const parent = node.padre_id ?? null;
    if (parent !== null && known.get(parent)?.tipo !== 'seccion') throw new Error('Falta una sección del documento.');
    const siblings = children.get(parent) ?? [];
    if (siblings.some(item => item.orden === node.orden)) throw new Error('Dos bloques tienen la misma posición.');
    siblings.push(node); children.set(parent, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.orden - b.orden);
  const result: Node[] = [];
  const pending = [...(children.get(null) ?? [])].reverse().map(node => ({ node, depth: 1 }));
  const seen = new Set<string>();
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (seen.has(node.id) || depth > 8) throw new Error('Revisa la jerarquía o profundidad del documento.');
    seen.add(node.id); result.push(node);
    pending.push(...[...(children.get(node.id) ?? [])].reverse().map(child => ({ node: child, depth: depth + 1 })));
  }
  if (seen.size !== known.size) throw new Error('La jerarquía del documento contiene un ciclo.');
  return result;
}

export function validateDocument(document: Document, questions: EditableQuestion[]): string | null {
  try {
    const ordered = documentOrder(document);
    const questionIds = new Set(questions.map(question => question.contenidoId));
    const references = ordered.filter(node => node.tipo === 'pregunta').map(node => node.pregunta_id);
    if (questionIds.has(undefined) || questionIds.size !== questions.length
      || new Set(references).size !== references.length || references.length !== questionIds.size
      || references.some(id => !id || !questionIds.has(id))) return 'Cada pregunta debe aparecer una sola vez en su sección.';
    if (new Set(questions.map(question => question.numero)).size !== questions.length) return 'Revisa los identificadores académicos de las preguntas.';
    for (const node of ordered) {
      if (node.tipo === 'seccion' && (!node.titulo?.trim() || node.titulo.length > 500)) return 'Escribe un título de sección de hasta 500 caracteres.';
      if (node.tipo === 'texto' && (!node.texto?.trim() || node.texto.length > 60000)) return 'Revisa el texto de apoyo: no puede estar vacío ni superar 60.000 caracteres.';
      if ((node.etiqueta_original?.length ?? 0) > 40) return 'La etiqueta de una pregunta o sección es demasiado larga.';
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Revisa la organización del documento.';
  }
}

export function pendingDocumentReview(document: Document, scoringChanged = false): Document {
  return { ...document,
    ...(scoringChanged && document.puntuacion_secciones ? { puntuacion_secciones: { ...document.puntuacion_secciones, confirmado: false } } : {}),
    revision: { detectados: [], conservados: [], avisos: [], ...document.revision,
      estado: 'requiere_revision', confirmado: false } };
}

export function updateDocumentNode(document: Document, id: string,
  patch: Partial<Pick<Node, 'titulo' | 'texto' | 'proposito' | 'etiqueta_original'>>): Document {
  return pendingDocumentReview({ ...document, nodos: document.nodos.map(node => node.id === id ? { ...node, ...patch } : node) });
}

export function confirmDocumentReview(document: Document, questions: EditableQuestion[]): Document {
  const error = validateDocument(document, questions);
  if (error) throw new Error(error);
  const represented = new Set(document.nodos.flatMap(node => node.fuente_ids ?? []));
  if (document.revision?.conservados.some(id => !represented.has(id))) throw new Error('Todavía hay texto de origen sin una sección. Conserva su contenido antes de confirmar.');
  const exclusions = document.revision?.exclusiones ?? [];
  if (new Set(exclusions.map(item => item.elemento_id)).size !== exclusions.length
    || exclusions.some(item => !item.confirmado || item.motivo.trim().length < 3
      || !document.revision?.detectados.includes(item.elemento_id) || document.revision.conservados.includes(item.elemento_id))) throw new Error('Revisa el contenido que retiraste expresamente.');
  const excluded = new Set(exclusions.map(item => item.elemento_id));
  if (document.revision?.detectados.some(id => !document.revision?.conservados.includes(id) && !excluded.has(id))) throw new Error('Hay contenido de origen pendiente de conservar.');
  return { ...document, revision: { detectados: [], conservados: [], ...document.revision,
    avisos: [], estado: 'completa', confirmado: true } };
}

export function addDocumentSection(document: Document, title: string, parent: string | null = null): Document {
  const next = pendingDocumentReview({ ...document, nodos: [...document.nodos, {
    id: crypto.randomUUID(), padre_id: parent, tipo: 'seccion', titulo: title,
    orden: Math.max(-1, ...document.nodos.filter(node => node.padre_id === parent).map(node => node.orden)) + 1,
  }] });
  documentOrder(next);
  return next;
}

export function addDocumentText(document: Document, parent: string | null, purpose: NonNullable<Node['proposito']>): Document {
  return pendingDocumentReview({ ...document, nodos: [...document.nodos, { id: crypto.randomUUID(), padre_id: parent,
    tipo: 'texto', proposito: purpose, texto: 'Escribe aquí el texto completo.',
    orden: Math.max(-1, ...document.nodos.filter(node => node.padre_id === parent).map(node => node.orden)) + 1 }] });
}

export function moveDocumentNode(document: Document, id: string, parent: string | null, position: number): Document {
  const moving = document.nodos.find(node => node.id === id);
  if (!moving) throw new Error('El bloque ya no está disponible.');
  const next = document.nodos.map(node => ({ ...node }));
  const oldSiblings = next.filter(node => node.padre_id === moving.padre_id && node.id !== id).sort((a, b) => a.orden - b.orden);
  oldSiblings.forEach((node, index) => { node.orden = index; });
  const target = next.find(node => node.id === id)!;
  const newSiblings = next.filter(node => node.padre_id === parent && node.id !== id).sort((a, b) => a.orden - b.orden);
  target.padre_id = parent;
  newSiblings.splice(Math.max(0, Math.min(position, newSiblings.length)), 0, target);
  newSiblings.forEach((node, index) => { node.orden = index; });
  const result = pendingDocumentReview({ ...document, nodos: next }, parent !== moving.padre_id);
  documentOrder(result);
  return result;
}

/** Deliberate removal only; original source inventory stays immutable and reviewable. */
export function removeDocumentNode(document: Document, id: string, reason: string): Document {
  if (reason.trim().length < 3) throw new Error('Confirma que deseas retirar este contenido.');
  const removed = new Set([id]);
  for (const node of documentOrder(document)) if (node.padre_id && removed.has(node.padre_id)) removed.add(node.id);
  if (document.nodos.some(node => removed.has(node.id) && node.tipo === 'pregunta')) throw new Error('Retira o mueve primero las preguntas de esta sección.');
  const nodos = document.nodos.filter(node => !removed.has(node.id));
  if (!nodos.length) throw new Error('Conserva al menos una parte del documento.');
  return excludeRemovedSources(document, nodos, reason);
}

function excludeRemovedSources(document: Document, nodos: Node[], reason: string): Document {
  const retained = new Set(nodos.flatMap(node => node.fuente_ids ?? []));
  const removed = new Set(document.nodos.flatMap(node => node.fuente_ids ?? []).filter(id => !retained.has(id)));
  return pendingDocumentReview({ ...document, nodos, revision: { detectados: [], estado: 'requiere_revision', confirmado: false, ...document.revision,
    conservados: (document.revision?.conservados ?? []).filter(id => !removed.has(id)),
    exclusiones: [...(document.revision?.exclusiones ?? []).filter(item => !removed.has(item.elemento_id)),
      ...[...removed].map(elemento_id => ({ elemento_id, motivo: reason, confirmado: true }))],
    avisos: (document.revision?.avisos ?? []).filter(warning => !removed.has(warning.elemento_id ?? '') && nodos.some(node => node.id === warning.nodo_id || !warning.nodo_id)),
  } }, true);
}

export function createQuestionDocument(questions: EditableQuestion[], reading?: string) {
  const section = crypto.randomUUID();
  const local = questions.map(question => ({ ...question, contenidoId: question.contenidoId || crypto.randomUUID() }));
  const nodos: Node[] = [{ id: section, padre_id: null, orden: 0, tipo: 'seccion', titulo: 'Preguntas' }];
  if (reading?.trim()) nodos.push({ id: crypto.randomUUID(), padre_id: section, orden: 0, tipo: 'texto', proposito: 'lectura', texto: reading });
  local.forEach(question => nodos.push({ id: crypto.randomUUID(), padre_id: section, orden: nodos.length,
    tipo: 'pregunta', pregunta_id: question.contenidoId, etiqueta_original: String(question.numero) }));
  return { questions: local, estructuraDocumento: pendingDocumentReview({ schema_version: 1, nodos }) };
}

export function questionDocumentPath(document: Document, questionId: string): string {
  const byId = new Map(document.nodos.map(node => [node.id, node]));
  const path: string[] = [];
  let parent = document.nodos.find(node => node.pregunta_id === questionId)?.padre_id;
  const visited = new Set<string>();
  while (parent) {
    if (visited.has(parent)) throw new Error('Revisa la jerarquía de secciones.');
    visited.add(parent);
    const node = byId.get(parent);
    if (!node) break;
    path.unshift([node.etiqueta_original, node.titulo].filter(Boolean).join(' · '));
    parent = node.padre_id;
  }
  return path.join(' / ');
}

export function reconcileDocumentQuestions(document: Document, previous: EditableQuestion[], incoming: EditableQuestion[], duplicateFrom?: string) {
  const old = new Map(previous.filter(question => question.contenidoId).map(question => [question.contenidoId!, question]));
  let nextNumber = Math.max(0, ...previous.map(question => question.numero));
  const questions = incoming.map(question => {
    const id = question.contenidoId || crypto.randomUUID();
    return { ...question, contenidoId: id, numero: old.get(id)?.numero ?? ++nextNumber };
  });
  const ids = new Set(questions.map(question => question.contenidoId));
  const retained = document.nodos.filter(node => node.tipo !== 'pregunta' || ids.has(node.pregunta_id ?? ''));
  const represented = new Set(retained.filter(node => node.tipo === 'pregunta').map(node => node.pregunta_id));
  const parent = document.nodos.find(node => node.pregunta_id === duplicateFrom)?.padre_id
    ?? [...retained].reverse().find(node => node.tipo === 'pregunta')?.padre_id ?? null;
  for (const question of questions) {
    if (represented.has(question.contenidoId)) continue;
    const labels = new Set(retained.filter(node => node.padre_id === parent && node.tipo === 'pregunta').map(node => node.etiqueta_original));
    let label = 1; while (labels.has(String(label))) label += 1;
    retained.push({ id: crypto.randomUUID(), padre_id: parent, tipo: 'pregunta', pregunta_id: question.contenidoId,
      etiqueta_original: String(label), orden: Math.max(-1, ...retained.filter(node => node.padre_id === parent).map(node => node.orden)) + 1 });
  }
  const changed = incoming.length !== previous.length || questions.some(question => !old.has(question.contenidoId));
  let next = changed ? excludeRemovedSources(document, retained, 'Pregunta retirada expresamente por el docente.') : { ...document, nodos: retained };
  if (changed && next.puntuacion_secciones) next = { ...next, puntuacion_secciones: { ...next.puntuacion_secciones,
    pesos_base: Object.fromEntries(questions.map(question => [question.contenidoId,
      document.puntuacion_secciones?.pesos_base[question.contenidoId] ?? String(question.puntaje)])), ajustes: {}, confirmado: false } };
  const byId = new Map(questions.map(question => [question.contenidoId, question]));
  const ordered = documentOrder(next).filter(node => node.tipo === 'pregunta').map(node => byId.get(node.pregunta_id!)!);
  return { questions: ordered, estructuraDocumento: next };
}
