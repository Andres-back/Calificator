import { expect, it } from 'vitest';
import { evaluationToWizardState } from './generationWizardModel';
import { documentEvaluation, documentId } from '@/test/fixtures/documentEvaluation';
import { compileSectionScores, enableSectionScoring, restoreSectionScores } from './sectionScoring';

it('compiles exact budgets without changing base weights or applying a second formula', () => {
  const state = evaluationToWizardState(documentEvaluation());
  const document = enableSectionScoring(state.estructuraDocumento!, state.questions);
  document.puntuacion_secciones!.presupuestos = { [documentId(10)]: '3,25', [documentId(20)]: '1.75' };
  const compiled = compileSectionScores(document, state.questions, 5);
  expect(compiled.map(question => question.puntaje)).toEqual([3.25, 1.75]);
  expect(document.puntuacion_secciones!.pesos_base).toEqual({ [documentId(1)]: '2', [documentId(2)]: '3' });
  expect(compileSectionScores(document, compiled, 5)).toEqual(compiled);
  expect(restoreSectionScores(document, compiled, 5)).toEqual(state.questions);
});

it('rejects missing or overlapping groups and impossible amounts', () => {
  const state = evaluationToWizardState(documentEvaluation());
  const document = enableSectionScoring(state.estructuraDocumento!, state.questions);
  document.puntuacion_secciones!.presupuestos = { [documentId(10)]: '5' };
  expect(() => compileSectionScores(document, state.questions, 5)).toThrow(/pregunta/i);
  document.puntuacion_secciones!.presupuestos = { [documentId(10)]: '2', [documentId(20)]: '4' };
  expect(() => compileSectionScores(document, state.questions, 5)).toThrow(/sumar/i);
  document.puntuacion_secciones!.presupuestos = { [documentId(10)]: '0.001', [documentId(20)]: '4.999' };
  expect(() => compileSectionScores(document, state.questions, 5)).toThrow(/decimal/i);
});

it('uses stable largest remainders in canonical order even when visible nodes move', () => {
  const state = evaluationToWizardState(documentEvaluation());
  state.questions = [1, 2, 3].map((number, index) => ({ ...state.questions[0], numero: number,
    clientId: `q${number}`, contenidoId: documentId(number), puntaje: index === 2 ? 1.68 : 1.66 }));
  const document = { schema_version: 1 as const, nodos: [state.estructuraDocumento!.nodos[0],
    ...state.questions.map((q, index) => ({ id: documentId(60 + index), tipo: 'pregunta' as const,
      orden: 2 - index, padre_id: documentId(10), pregunta_id: q.contenidoId }))] };
  const next = enableSectionScoring(document, state.questions);
  Object.keys(next.puntuacion_secciones!.pesos_base).forEach(id => { next.puntuacion_secciones!.pesos_base[id] = '1'; });
  expect(compileSectionScores(next, state.questions, 5).map(q => q.puntaje)).toEqual([1.67, 1.67, 1.66]);
});
