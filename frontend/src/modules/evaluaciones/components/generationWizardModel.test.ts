import { describe, expect, it } from 'vitest';
import {
  createEmptyWizardState,
  discardWizardDraft,
  duplicateQuestion,
  loadWizardDraft,
  MAX_REFERENCE_FILE_BYTES,
  moveQuestion,
  persistWizardDraft,
  totalQuestionCount,
  validateQuestion,
  validateReferenceFile,
  validateStep,
  WIZARD_TTL_MS,
  wizardStorageKey,
  type EditableQuestion,
} from './generationWizardModel';

function validQuestion(overrides: Partial<EditableQuestion> = {}): EditableQuestion {
  return {
    clientId: 'question-1',
    numero: 1,
    tipo: 'opcion_multiple',
    enunciado: '¿Cuál es la respuesta correcta?',
    opciones: ['A', 'B', 'C'],
    respuestaEsperada: 'A',
    puntaje: 1,
    modalidadRespuesta: 'online',
    dbaIds: ['dba-1'],
    expanded: true,
    ...overrides,
  };
}

describe('generation wizard model', () => {
  it('calculates quantities and validates navigation step by step', () => {
    const state = createEmptyWizardState();
    expect(totalQuestionCount(state.counts)).toBe(3);
    expect(validateStep(state, 1)).toMatch(/materia/i);

    state.materiaId = 'materia-1';
    state.nombre = 'Evaluación';
    expect(validateStep(state, 1)).toBeNull();
    expect(validateStep(state, 2)).toMatch(/DBA/i);

    state.dbaIds = ['dba-1'];
    state.counts = { opcion_multiple: 31, abierta: 0, verdadero_falso: 0, completar: 0 };
    expect(validateStep(state, 3)).toMatch(/entre 3 y 30/i);
  });

  it('requires both response sections before confirming a mixed evaluation', () => {
    const state = createEmptyWizardState('materia-1');
    state.nombre = 'Evaluación mixta';
    state.modalidad = 'mixta';
    state.dbaIds = ['dba-1'];
    state.generatedEvaluationId = 'evaluation-1';
    state.questions = [
      validQuestion(),
      validQuestion({ clientId: 'question-2', numero: 2 }),
    ];

    expect(validateStep(state, 5)).toMatch(/online.*papel|papel.*online/i);
    state.questions[1].modalidadRespuesta = 'fisica';
    expect(validateStep(state, 5)).toBeNull();
  });

  it('persists a versioned user draft without binary file contents and recovers it', () => {
    const state = createEmptyWizardState('materia-1');
    state.nombre = 'Borrador';
    state.step = 4;
    state.referenceFile = {
      name: 'guia.pdf',
      type: 'application/pdf',
      size: 400,
      lastModified: 123,
    };

    persistWizardDraft(localStorage, 'profesor-1', state, 1_000);
    const raw = localStorage.getItem(wizardStorageKey('profesor-1')) ?? '';

    expect(raw).toContain('"version":3');
    expect(raw).toContain('"userId":"profesor-1"');
    expect(raw).toContain('"needsReselection":true');
    expect(raw).not.toContain('data:');
    expect(loadWizardDraft(localStorage, 'profesor-1', 1_001)).toMatchObject({
      nombre: 'Borrador',
      step: 4,
      referenceFile: { name: 'guia.pdf', needsReselection: true },
    });
  });

  it('discards expired, incompatible and user-selected drafts', () => {
    const state = createEmptyWizardState('materia-1');
    state.nombre = 'Expirado';
    persistWizardDraft(localStorage, 'profesor-1', state, 100);

    expect(loadWizardDraft(localStorage, 'profesor-1', 100 + WIZARD_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem(wizardStorageKey('profesor-1'))).toBeNull();

    localStorage.setItem(wizardStorageKey('profesor-1'), JSON.stringify({
      version: 999,
      userId: 'profesor-1',
      savedAt: Date.now(),
      state,
    }));
    expect(loadWizardDraft(localStorage, 'profesor-1')).toBeNull();

    persistWizardDraft(localStorage, 'profesor-1', state);
    discardWizardDraft(localStorage, 'profesor-1');
    expect(localStorage.getItem(wizardStorageKey('profesor-1'))).toBeNull();
  });

  it('validates files before accepting metadata', () => {
    expect(validateReferenceFile({ name: 'guia.pdf', type: 'application/pdf', size: 10 })).toBeNull();
    expect(validateReferenceFile({ name: 'foto.png', type: 'image/png', size: 10 })).toBeNull();
    expect(validateReferenceFile({ name: 'notas.txt', type: 'text/plain', size: 10 })).toMatch(/PDF o una imagen/i);
    expect(validateReferenceFile({ name: 'grande.pdf', type: 'application/pdf', size: MAX_REFERENCE_FILE_BYTES + 1 })).toMatch(/10 MB/i);
    expect(validateReferenceFile({ name: 'vacio.pdf', type: 'application/pdf', size: 0 })).toMatch(/vacío/i);
  });

  it('validates and edits generated questions without drag and drop', () => {
    expect(validateQuestion(validQuestion())).toBeNull();
    expect(validateQuestion(validQuestion({ enunciado: '' }))).toMatch(/enunciado/i);
    expect(validateQuestion(validQuestion({ puntaje: 0 }))).toMatch(/puntaje/i);
    expect(validateQuestion(validQuestion({ opciones: ['A', 'a', 'C'] }))).toMatch(/repetirse/i);
    expect(validateQuestion(validQuestion({ respuestaEsperada: 'Z' }))).toMatch(/respuesta correcta/i);
    expect(validateQuestion(validQuestion({ opciones: ['A', 'B'] }))).toMatch(/tres opciones/i);
    expect(validateQuestion(validQuestion({ tipo: 'abierta', opciones: [], respuestaEsperada: '' }))).toMatch(/respuesta esperada/i);

    const questions = [validQuestion(), validQuestion({ clientId: 'question-2', numero: 2, enunciado: 'Segunda' })];
    const duplicated = duplicateQuestion(questions, 0);
    expect(duplicated).toHaveLength(3);
    expect(duplicated[1].enunciado).toContain('(copia)');
    expect(duplicated.map((question) => question.numero)).toEqual([1, 2, 3]);

    const moved = moveQuestion(questions, 1, -1);
    expect(moved[0].clientId).toBe('question-2');
    expect(moved.map((question) => question.numero)).toEqual([1, 2]);
  });
});
