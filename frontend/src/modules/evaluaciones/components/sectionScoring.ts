import type { EvaluationDocumentStructure } from '@/types/api';
import { documentOrder, pendingDocumentReview } from './documentModel';
import type { EditableQuestion } from './generationWizardModel';

/** Fixed integers, not binary floating-point, match the server's exact decimal contract. */
function units(value: string | number, decimals: number): bigint {
  const text = String(value).trim().replace(',', '.');
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(text)) throw new Error(`Usa un número positivo con hasta ${decimals} decimales.`);
  const [whole, fraction = ''] = text.split('.');
  const result = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0'));
  if (result <= 0n) throw new Error('Los puntos deben ser mayores que cero.');
  return result;
}
export function sectionGroups(document: EvaluationDocumentStructure) {
  const nodes = documentOrder(document), byId = new Map(nodes.map(node => [node.id, node]));
  const groups = new Map(Object.keys(document.puntuacion_secciones?.presupuestos ?? {}).map(id => [id, [] as string[]]));
  if ([...groups.keys()].some(id => byId.get(id)?.tipo !== 'seccion')) throw new Error('Elige secciones de este documento.');
  for (const node of nodes.filter(item => item.tipo === 'pregunta')) {
    let parent = node.padre_id;
    const matched: string[] = [];
    while (parent) { if (groups.has(parent)) matched.push(parent); parent = byId.get(parent)?.padre_id ?? null; }
    if (matched.length !== 1) throw new Error('Cada pregunta debe estar en una sola sección con puntaje, sin sumar padre y subsección a la vez.');
    groups.get(matched[0])!.push(node.pregunta_id!);
  }
  if ([...groups.values()].some(ids => !ids.length)) throw new Error('Una sección sin preguntas no recibe puntos.');
  return groups;
}

export function enableSectionScoring(document: EvaluationDocumentStructure, questions: EditableQuestion[]) {
  const byId = new Map(document.nodos.map(node => [node.id, node]));
  const totals: Record<string, bigint> = {};
  for (const question of questions) {
    let parent = document.nodos.find(node => node.pregunta_id === question.contenidoId)?.padre_id;
    if (!parent) throw new Error('Ubica primero todas las preguntas dentro de una sección.');
    while (byId.get(parent)?.padre_id) parent = byId.get(parent)!.padre_id!;
    totals[parent] = (totals[parent] ?? 0n) + units(question.puntaje, 6);
  }
  const budgets = Object.fromEntries(Object.entries(totals).map(([id, value]) => [id, String(Number(value) / 1000000)]));
  return pendingDocumentReview({ ...document, puntuacion_secciones: { modo: 'por_seccion', presupuestos: budgets,
    pesos_base: Object.fromEntries(questions.map(q => [q.contenidoId!, String(q.puntaje)])), confirmado: false } });
}

export function compileSectionScores(document: EvaluationDocumentStructure, questions: EditableQuestion[], maximum: number) {
  const scoring = document.puntuacion_secciones;
  if (!scoring) return questions;
  const ids = new Set(questions.map(q => q.contenidoId!));
  if (ids.size !== questions.length || ids.has(undefined as never) || Object.keys(scoring.pesos_base).length !== ids.size
    || Object.keys(scoring.pesos_base).some(id => !ids.has(id))) throw new Error('Revisa los pesos base de las preguntas actuales.');
  const groups = sectionGroups(document);
  if ([...groups.values()].flat().length !== ids.size) throw new Error('El reparto debe cubrir todas las preguntas.');
  const budgets = Object.fromEntries(Object.entries(scoring.presupuestos).map(([id, value]) => [id, units(value, 2)]));
  if (Object.values(budgets).reduce((a, b) => a + b, 0n) !== units(maximum, 2)) throw new Error('Las secciones deben sumar exactamente la nota máxima.');
  const numbers = new Map(questions.map(q => [q.contenidoId!, q.numero]));
  const values = new Map<string, bigint>();
  const adjustments = scoring.ajustes ?? {};
  if (Object.keys(adjustments).length && (Object.keys(adjustments).length !== ids.size || Object.keys(adjustments).some(id => !ids.has(id)))) throw new Error('Los ajustes internos deben incluir todas las preguntas.');
  for (const [group, unordered] of groups) {
    const qids = [...unordered].sort((a, b) => numbers.get(a)! - numbers.get(b)!);
    if (Object.keys(adjustments).length) {
      qids.forEach(id => values.set(id, units(adjustments[id], 2)));
      if (qids.reduce((total, id) => total + values.get(id)!, 0n) !== budgets[group]) throw new Error('Los ajustes de cada sección deben sumar su puntaje.');
    } else {
      const weights = qids.map(id => units(scoring.pesos_base[id], 6));
      const total = weights.reduce((a, b) => a + b, 0n);
      const floors = weights.map(weight => budgets[group] * weight / total);
      const ranking = weights.map((weight, index) => ({ index, remainder: budgets[group] * weight % total }))
        .sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
      const remaining = Number(budgets[group] - floors.reduce((a, b) => a + b, 0n));
      ranking.slice(0, remaining).forEach(({ index }) => { floors[index] += 1n; });
      if (floors.some(value => value <= 0n)) throw new Error('El puntaje es demasiado pequeño para dar al menos 0,01 a cada pregunta.');
      qids.forEach((id, index) => values.set(id, floors[index]));
    }
  }
  return questions.map(q => ({ ...q, puntaje: Number(values.get(q.contenidoId!)!) / 100 }));
}

export function restoreSectionScores(document: EvaluationDocumentStructure, questions: EditableQuestion[], maximum: number) {
  const base = document.puntuacion_secciones?.pesos_base;
  if (!base || Object.keys(base).length !== questions.length || questions.some(q => !base[q.contenidoId!])) throw new Error('Revisa las preguntas actuales antes de restaurar los puntos base.');
  const sum = Object.values(base).reduce((total, value) => total + units(value, 6), 0n);
  if (sum !== units(maximum, 6)) throw new Error('Los puntos base no coinciden con esta escala. Revisa el reparto.');
  return questions.map(q => ({ ...q, puntaje: Number(base[q.contenidoId!]) }));
}
