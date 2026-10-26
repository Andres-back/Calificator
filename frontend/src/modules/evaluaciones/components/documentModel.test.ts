import { describe, expect, it } from 'vitest';
import { documentEvaluation, documentId } from '@/test/fixtures/documentEvaluation';
import { evaluationToWizardState, loadWizardDraft, moveQuestion, persistWizardDraft,
  questionsToUpdatePayload, reconcileVisualQuestions } from './generationWizardModel';
import { addDocumentSection, confirmDocumentReview, documentOrder, moveDocumentNode,
  questionDocumentPath, removeDocumentNode, updateDocumentNode, validateDocument } from './documentModel';

describe('document model', () => {
  it('keeps the document, canonical question numbers and separate keys when opening and saving', () => {
    const evaluation = documentEvaluation();
    const state = evaluationToWizardState(evaluation);
    expect(state.estructuraDocumento).toEqual(evaluation.estructura_documento);
    expect(state.questions.map(question => question.numero)).toEqual([7, 2]);
    const saved = questionsToUpdatePayload(state.questions);
    expect(saved.respuestas_esperadas).toEqual(expect.arrayContaining([
      expect.objectContaining({ numero: 7, respuesta: 'Con agua y temperatura adecuada.' }),
      expect.objectContaining({ numero: 2, respuesta: 'Agua y nutrientes.' }),
    ]));
    expect(validateDocument(state.estructuraDocumento!, state.questions)).toBeNull();
  });

  it('does not renumber existing identities when generic helpers reorder their array', () => {
    const state = evaluationToWizardState(documentEvaluation());
    const next = reconcileVisualQuestions(state, moveQuestion(state.questions, 0, 1));
    expect(next.questions?.find(question => question.contenidoId === documentId(1))?.numero).toBe(7);
    expect(next.questions?.find(question => question.contenidoId === documentId(2))?.numero).toBe(2);
    expect(next.estructuraDocumento).toBeDefined();
    expect(validateDocument(next.estructuraDocumento!, next.questions!)).toBeNull();
  });

  it('edits only the chosen text and invalidates review without mutating the query cache', () => {
    const state = evaluationToWizardState(documentEvaluation());
    const previous = JSON.stringify(state.estructuraDocumento);
    const next = updateDocumentNode(state.estructuraDocumento!, documentId(11), { texto: 'Lectura corregida y completa.' });
    expect(next.nodos.find(node => node.id === documentId(11))?.texto).toBe('Lectura corregida y completa.');
    expect(next.revision?.confirmado).toBe(false);
    expect(JSON.stringify(state.estructuraDocumento)).toBe(previous);
    expect(confirmDocumentReview(next, state.questions).revision?.confirmado).toBe(true);
  });

  it('moves a question without changing its identity, label or answer and rejects a cycle', () => {
    const state = evaluationToWizardState(documentEvaluation());
    const next = moveDocumentNode(state.estructuraDocumento!, documentId(12), documentId(20), 1);
    expect(questionDocumentPath(next, documentId(1))).toBe('Reflexionamos');
    expect(next.nodos.find(node => node.id === documentId(12))?.etiqueta_original).toBe('1');
    expect(validateDocument(next, state.questions)).toBeNull();
    expect(() => moveDocumentNode(next, documentId(20), documentId(20), 0)).toThrow();
  });

  it('adds an ungraded section and retains it through a scoped draft', () => {
    const state = evaluationToWizardState(documentEvaluation());
    const next = addDocumentSection(state.estructuraDocumento!, 'Actividad compartida');
    expect(documentOrder(next).filter(node => node.tipo === 'seccion')).toHaveLength(3);
    expect(state.questions).toHaveLength(2);
    persistWizardDraft(localStorage, 'document-owner', { ...state, estructuraDocumento: next }, 1000, 'document-evaluation');
    expect(loadWizardDraft(localStorage, 'document-owner', 1001, 'subject')).toBeNull();
    // Edit drafts use the evaluation-scoped recovery key, not another new-exam draft.
    persistWizardDraft(localStorage, 'document-owner', { ...state, estructuraDocumento: next }, 1000);
    expect(loadWizardDraft(localStorage, 'document-owner', 1001, 'subject')?.estructuraDocumento).toEqual(next);
    expect(loadWizardDraft(localStorage, 'other-owner', 1001, 'subject')).toBeNull();
  });

  it('rejects orphaned questions, duplicate references and corrupted hierarchy', () => {
    const state = evaluationToWizardState(documentEvaluation());
    expect(validateDocument(state.estructuraDocumento!, state.questions.slice(1))).toMatch(/pregunta/i);
    const wrong = structuredClone(state.estructuraDocumento!);
    wrong.nodos[4].pregunta_id = documentId(1);
    expect(validateDocument(wrong, state.questions)).toMatch(/pregunta/i);
    wrong.nodos[0].padre_id = documentId(10);
    expect(() => documentOrder(wrong)).toThrow();
  });

  it('records reviewed removal without losing the original inventory or leaving an orphan', () => {
    const state = evaluationToWizardState(documentEvaluation());
    const doc = state.estructuraDocumento!;
    doc.nodos[1].fuente_ids = ['source-reading'];
    doc.revision = { detectados: ['source-reading'], conservados: ['source-reading'], avisos: [], estado: 'completa', confirmado: true };
    const next = removeDocumentNode(doc, documentId(11), 'Retirado expresamente por el docente.');
    expect(next.revision?.detectados).toEqual(['source-reading']);
    expect(next.revision?.exclusiones).toEqual([{ elemento_id: 'source-reading', motivo: 'Retirado expresamente por el docente.', confirmado: true }]);
    expect(confirmDocumentReview(next, state.questions).revision?.confirmado).toBe(true);
    expect(() => removeDocumentNode(doc, documentId(10), 'Retirar')).toThrow(/preguntas/i);
    expect(doc.nodos).toHaveLength(5);
  });

  it('does not restore malformed document drafts as a flat evaluation', () => {
    const state = evaluationToWizardState(documentEvaluation());
    state.estructuraDocumento!.nodos[0].padre_id = documentId(10);
    persistWizardDraft(localStorage, 'bad-doc-owner', state, 1000);
    expect(loadWizardDraft(localStorage, 'bad-doc-owner', 1001, 'subject')).toBeNull();
  });
});
