import { describe, expect, it, vi } from 'vitest';
import type { Evaluacion } from '@/types/api';
import {
  updateQuestionVisual, reconcileVisualQuestions, loadVisualEditDraft,
  createEmptyWizardState,
  createBlankQuestion,
  criteriaWithoutRubric,
  discardWizardDraft,
  evaluationToEditableQuestions,
  evaluationToWizardState,
  questionsToUpdatePayload,
  duplicateQuestion,
  loadWizardDraft,
  getWizardStorage,
  MAX_REFERENCE_FILE_BYTES,
  moveQuestion,
  normalizeRubricCriteria,
  normalizeWizardPhase,
  persistWizardDraft,
  prepareRubricCriteriaForSave,
  rebalanceRubricWeights,
  totalQuestionCount,
  resizeQuestionCounts,
  updateWizardTopic,
  validatePreparation,
  validateQuestion,
  validateReferenceFile,
  validateRubricCriteria,
  validateStep,
  WIZARD_TTL_MS,
  WIZARD_VERSION,
  wizardStorageKey,
  FREE_ANSWER_TEXT,
  freeAnswerPatch,
  needsAnswerDecision,
  type EditableQuestion,
} from './generationWizardModel';

it('replaces one use of shared material while preserving other uses and review state', () => {
  const state = createEmptyWizardState();
  state.questions = [validQuestion({ contenidoId: 'q1' }), validQuestion({ clientId: 'q2', contenidoId: 'q2' })];
  state.contenidoVisual = { schema_version: 1, pregunta_ids: ['q1', 'q2'], recurso_ids: ['r'],
    bloques: [{ id: 'shared', tipo: 'imagen', orden: 0, pregunta_ids: ['q1', 'q2'], recurso_id: 'r', seguridad_contenido: 'publicable_confirmado' }],
    cobertura: { detectados: [], conservados: [], avisos: [], estado: 'completa' } };
  const changed = updateQuestionVisual(state, 'q1', { id: 'new', tipo: 'imagen', orden: 1, pregunta_ids: ['q1'], recurso_id: 'r2', seguridad_contenido: 'publicable_confirmado' }, 'shared');
  expect(changed.contenidoVisual?.bloques[0].pregunta_ids).toEqual(['q2']);
  expect(changed.visualKeysPending).toEqual(['q1']);
  const removed = reconcileVisualQuestions(changed, [changed.questions[0]]);
  expect(removed.contenidoVisual?.pregunta_ids).toEqual(['q1']);
  expect(removed.contenidoVisual?.bloques.map(block => block.id)).toEqual(['new']);
  expect(state.contenidoVisual.bloques[0].pregunta_ids).toEqual(['q1', 'q2']);
});

it('isolates recoverable visual edits and jobs by user and evaluation', () => {
  const state = createEmptyWizardState('subject');
  state.generatedEvaluationId = 'evaluation'; state.visualJobs = { q1: 'job-1' };
  state.questions = [validQuestion({ contenidoId: 'q1' })];
  persistWizardDraft(localStorage, 'owner', state, 1000, 'evaluation');
  expect(loadVisualEditDraft(localStorage, 'owner', 'evaluation', 1001)?.visualJobs).toEqual({ q1: 'job-1' });
  expect(loadVisualEditDraft(localStorage, 'other-owner', 'evaluation', 1001)).toBeNull();
  expect(loadVisualEditDraft(localStorage, 'owner', 'another-evaluation', 1001)).toBeNull();
});

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
  it('preserves visual question identity, shared content and the revision while editing text', () => {
    const evaluation = {
      id: 'exam', materia_id: 'subject', nombre: 'Tabla de precios', modalidad: 'fisica',
      nota_maxima: 5, contenido_version_id: 'revision-a',
      contenido_visual: { schema_version: 1, pregunta_ids: ['question-a'], recurso_ids: [],
        bloques: [{ id: 'shared', tipo: 'texto', orden: 0, pregunta_ids: ['question-a'],
          texto: 'Precios de la tienda', seguridad_contenido: 'publicable_confirmado' }],
        cobertura: { estado: 'completa', avisos: [] } },
      preguntas: [{ numero: 1, contenido_id: 'question-a', tipo: 'abierta', enunciado: '¿Qué cuesta más?', puntaje: 5 }],
      respuestas_esperadas: [{ numero: 1, respuesta: 'El libro' }],
    } as unknown as Evaluacion;
    const state = evaluationToWizardState(evaluation);
    expect(state.contenidoVisual).toEqual(evaluation.contenido_visual);
    expect(state.contenidoVersionId).toBe('revision-a');
    const edited = [{ ...state.questions[0], enunciado: 'Compara los precios.' }];
    expect(questionsToUpdatePayload(edited).preguntas[0]).toMatchObject({ contenido_id: 'question-a' });
    expect(moveQuestion(edited, 0, 1)[0].contenidoId).toBe('question-a');
    expect(duplicateQuestion(edited, 0)[1].contenidoId).not.toBe('question-a');
    persistWizardDraft(localStorage, 'visual-teacher', { ...state, questions: edited }, 1000);
    expect(loadWizardDraft(localStorage, 'visual-teacher', 1001, 'subject')).toMatchObject({
      contenidoVisual: evaluation.contenido_visual, contenidoVersionId: 'revision-a',
    });
  });

  it('does not silently add visual identity to legacy questions on a text-only save', () => {
    expect(questionsToUpdatePayload([validQuestion()]).preguntas[0]).not.toHaveProperty('contenido_id');
  });
  it.each([{ questions: [null] }, { dbaIds: null }, { generatedCriteria: [null] }, { descripcion: null }])('rejects structurally malformed drafts safely: %j', corrupt => {
    localStorage.setItem(wizardStorageKey('teacher', 'm'), JSON.stringify({ version: WIZARD_VERSION, userId: 'teacher', savedAt: 1000, state: { ...createEmptyWizardState('m'), ...corrupt } }));
    expect(loadWizardDraft(localStorage, 'teacher', 1001, 'm')).toBeNull();
  });
  it('suggests a name from the topic without overwriting a teacher name', () => {
    const state = updateWizardTopic(createEmptyWizardState('m'), 'Fracciones');
    expect(state).toMatchObject({ nombre: 'Evaluación de Fracciones', descripcion: 'Fracciones' });
    expect(updateWizardTopic(state, 'Logaritmos').nombre).toBe('Evaluación de Logaritmos');
    expect(updateWizardTopic({ ...state, nombre: 'Prueba del período', nombreAutomatico: false }, 'Otro tema').nombre).toBe('Prueba del período');
    const legacy = { ...state, nombre: 'Borrador anterior', nombreAutomatico: undefined };
    expect(updateWizardTopic(legacy, 'Otro tema').nombre).toBe('Borrador anterior');
  });

  it('resizes only active question types with an exact stable total', () => {
    const counts = createEmptyWizardState('m').counts;
    expect(resizeQuestionCounts(counts, 10)).toEqual({ opcion_multiple: 6, abierta: 4, verdadero_falso: 0, completar: 0 });
    const custom = { opcion_multiple: 0, abierta: 4, verdadero_falso: 0, completar: 2 };
    const resized = resizeQuestionCounts(custom, 5);
    expect(resized).toEqual({ opcion_multiple: 0, abierta: 3, verdadero_falso: 0, completar: 2 });
    expect(totalQuestionCount(resized)).toBe(5);
    expect(resizeQuestionCounts(custom, 31)).toEqual(custom);
    const empty = { opcion_multiple: 0, abierta: 0, verdadero_falso: 0, completar: 0 };
    expect(resizeQuestionCounts(empty, 5)).toEqual(empty);
  });

  it('validates all preparation options without six navigation steps', () => {
    const state = updateWizardTopic(createEmptyWizardState('m'), 'Fracciones');
    expect(validatePreparation(state)).toBeNull();
    expect(validatePreparation({ ...state, useDba: true })).toMatch(/criterio/i);
    expect(validatePreparation({ ...state, referenceText: 'x'.repeat(12001) })).toMatch(/12.000/i);
    expect(validatePreparation({ ...state, counts: { opcion_multiple: 0, abierta: 0, verdadero_falso: 0, completar: 0 } })).toMatch(/entre 3 y 30/i);
    expect(validatePreparation({ ...state, notaMaxima: 0 })).toMatch(/nota máxima/i);
    expect(validatePreparation({ ...state, fechaLimiteEntrega: 'fecha inválida' })).toMatch(/fecha/i);
    expect(validateStep({ ...state, generatedEvaluationId: 'e', questions: [validQuestion()], notaMaxima: 0 }, 5)).toMatch(/nota máxima/i);
  });

  it.each([1, 2, 3, 4, 5, 6])('restores legacy step %i without losing questions or configuration', step => {
    const state = { ...createEmptyWizardState('m'), step, nombre: 'Anterior', modalidad: 'mixta' as const, counts: { opcion_multiple: 0, abierta: 3, verdadero_falso: 0, completar: 0 }, generatedEvaluationId: 'saved', questions: [validQuestion()], dbaIds: ['criterion'] };
    persistWizardDraft(localStorage, 'teacher', state, 1000);
    const restored = loadWizardDraft(localStorage, 'teacher', 1001, 'm');
    expect(restored).toMatchObject({ ...state, step: step >= 5 ? 5 : 1 });
    expect(normalizeWizardPhase(state).step).toBe(step >= 5 ? 5 : 1);
  });

  it('keeps work usable when local storage is denied', () => {
    const denied = { getItem: vi.fn(() => { throw new Error('denied'); }), setItem: vi.fn(() => { throw new Error('denied'); }), removeItem: vi.fn(() => { throw new Error('denied'); }) } as unknown as Storage;
    expect(loadWizardDraft(denied, 'teacher', 1000, 'm')).toBeNull();
    expect(persistWizardDraft(denied, 'teacher', createEmptyWizardState('m'), 1000)).toBe(false);
    expect(() => discardWizardDraft(denied, 'teacher', 'm')).not.toThrow();
  });

  it('does not crash when the browser denies the storage object itself', () => {
    const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('denied'); });
    try { expect(getWizardStorage()).toBeNull(); } finally { denied.mockRestore(); }
  });

  it('calculates quantities and validates navigation step by step', () => {
    const state = createEmptyWizardState();
    expect(totalQuestionCount(state.counts)).toBe(5);
    expect(state.modalidad).toBe('fisica');
    expect(validateStep(state, 1)).toMatch(/materia/i);

    state.materiaId = 'materia-1';
    state.nombre = 'Evaluación';
    expect(validateStep(state, 1)).toBeNull();
    expect(validateStep(state, 2)).toBeNull();

    state.useDba = true;
    expect(validateStep(state, 2)).toMatch(/criterio de aprendizaje/i);
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
    const raw = localStorage.getItem(wizardStorageKey('profesor-1', state.materiaId)) ?? '';

    expect(raw).toContain(`"version":${WIZARD_VERSION}`);
    expect(raw).toContain('"userId":"profesor-1"');
    expect(raw).toContain('"needsReselection":true');
    expect(raw).not.toContain('data:');
    expect(loadWizardDraft(localStorage, 'profesor-1', 1_001, state.materiaId)).toMatchObject({
      nombre: 'Borrador',
      step: 1,
      referenceFile: { name: 'guia.pdf', needsReselection: true },
    });
  });

  it('discards expired, incompatible and user-selected drafts', () => {
    const state = createEmptyWizardState('materia-1');
    state.nombre = 'Expirado';
    persistWizardDraft(localStorage, 'profesor-1', state, 100);

    expect(loadWizardDraft(localStorage, 'profesor-1', 100 + WIZARD_TTL_MS + 1, state.materiaId)).toBeNull();
    expect(localStorage.getItem(wizardStorageKey('profesor-1', state.materiaId))).toBeNull();

    localStorage.setItem(wizardStorageKey('profesor-1'), JSON.stringify({
      version: 999,
      userId: 'profesor-1',
      savedAt: Date.now(),
      state,
    }));
    expect(loadWizardDraft(localStorage, 'profesor-1')).toBeNull();

    persistWizardDraft(localStorage, 'profesor-1', state);
    discardWizardDraft(localStorage, 'profesor-1', state.materiaId);
    expect(localStorage.getItem(wizardStorageKey('profesor-1', state.materiaId))).toBeNull();
  });

  it('keeps drafts isolated across A → B → A and discards only the current subject', () => {
    const first = { ...createEmptyWizardState('A'), nombre: 'Primera', questions: [validQuestion()] };
    const second = { ...createEmptyWizardState('B'), nombre: 'Segunda' };
    persistWizardDraft(localStorage, 'teacher-isolated', first, 1_000);
    expect(loadWizardDraft(localStorage, 'teacher-isolated', 1_001, 'B')).toBeNull();
    persistWizardDraft(localStorage, 'teacher-isolated', second, 1_001);
    expect(loadWizardDraft(localStorage, 'teacher-isolated', 1_002, 'A')).toEqual(first);
    expect(loadWizardDraft(localStorage, 'teacher-isolated', 1_002, 'B')).toEqual(second);
    discardWizardDraft(localStorage, 'teacher-isolated', 'B');
    expect(loadWizardDraft(localStorage, 'teacher-isolated', 1_002, 'B')).toBeNull();
    expect(loadWizardDraft(localStorage, 'teacher-isolated', 1_002, 'A')).toEqual(first);
  });

  it('offers legacy drafts only in their subject and migrates them after successful saving', () => {
    const first = { ...createEmptyWizardState('legacy-A'), nombre: 'Anterior' };
    const legacyKey = wizardStorageKey('teacher-legacy');
    const legacyRaw = JSON.stringify({ version: WIZARD_VERSION, userId: 'teacher-legacy', savedAt: 1_000, state: first });
    localStorage.setItem(legacyKey, legacyRaw);
    expect(loadWizardDraft(localStorage, 'teacher-legacy', 1_001, 'legacy-B')).toBeNull();
    persistWizardDraft(localStorage, 'teacher-legacy', createEmptyWizardState('legacy-B'), 1_001);
    discardWizardDraft(localStorage, 'teacher-legacy', 'legacy-B');
    expect(localStorage.getItem(legacyKey)).toBe(legacyRaw);
    expect(loadWizardDraft(localStorage, 'teacher-legacy', 1_002, 'legacy-A')).toEqual(first);
    persistWizardDraft(localStorage, 'teacher-legacy', first, 1_002);
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(loadWizardDraft(localStorage, 'teacher-legacy', 1_003, 'legacy-A')).toEqual(first);
  });

  it('validates files before accepting metadata', () => {
    expect(validateReferenceFile({ name: 'guia.pdf', type: 'application/pdf', size: 10 })).toBeNull();
    expect(validateReferenceFile({ name: 'foto.png', type: 'image/png', size: 10 })).toBeNull();
    expect(validateReferenceFile({ name: 'notas.txt', type: 'text/plain', size: 10 })).toMatch(/PDF o una imagen/i);
    expect(validateReferenceFile({ name: 'grande.pdf', type: 'application/pdf', size: MAX_REFERENCE_FILE_BYTES + 1 })).toMatch(/10 MB/i);
    expect(validateReferenceFile({ name: 'vacio.pdf', type: 'application/pdf', size: 0 })).toMatch(/vacío/i);
  });

  it("maps answer keys by question number and selects canonical options automatically", () => {
    const evaluation = {
      id: "evaluation-1",
      preguntas: [
        {
          numero: 7,
          tipo: "opcion_multiple",
          enunciado: "Cuanto es 6 por 6?",
          opciones: ["A) 12", "B) 36", "C) 42"],
          puntaje: 2.5,
        },
        {
          numero: 2,
          tipo: "verdadero_falso",
          enunciado: "Seis por seis es treinta y seis.",
          puntaje: 2.5,
        },
      ],
      respuestas_esperadas: [
        { numero: 2, respuesta: "true" },
        { numero: 7, respuesta: "B" },
      ],
      modalidad: "online",
    } as unknown as Evaluacion;

    const questions = evaluationToEditableQuestions(evaluation);

    expect(questions[0].respuestaEsperada).toBe("B) 36");
    expect(questions[1].respuestaEsperada).toBe("Verdadero");
    expect(validateQuestion(questions[0])).toBeNull();
    expect(validateQuestion(questions[1])).toBeNull();
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

    const withBlank = createBlankQuestion(questions, 'online');
    expect(withBlank).toHaveLength(3);
    expect(withBlank[2]).toMatchObject({ numero: 3, tipo: 'abierta', expanded: true });
    expect(withBlank.slice(0, 2).every((question) => !question.expanded)).toBe(true);
  });
  it('normalizes, balances and prepares an editable AI rubric', () => {
    const criteria = normalizeRubricCriteria([
      {
        nombre: 'Razonamiento',
        descripcion: 'Explica el procedimiento.',
        peso_porcentaje: 70,
        niveles: { Alto: 'Explicación completa', Básico: 'Explicación parcial' },
        dba_ids: ['dba-1'],
      },
      {
        nombre: 'Resultado',
        descripcion: 'Obtiene la respuesta.',
        peso_porcentaje: 20,
        niveles: { Alto: 'Resultado correcto', Básico: 'Resultado aproximado' },
      },
    ]);

    expect(validateRubricCriteria(criteria)).toMatch(/100 %/i);
    const state = createEmptyWizardState('materia-1');
    state.nombre = 'Evaluación con rúbrica';
    state.step = 5;
    state.useRubric = true;
    state.generatedEvaluationId = 'evaluation-1';
    state.generatedCriteria = criteria;
    state.questions = [validQuestion()];
    expect(validateStep(state, 5)).toMatch(/100 %/i);

    const balanced = rebalanceRubricWeights(criteria);
    expect(balanced.map((criterion) => criterion.peso_porcentaje)).toEqual([50, 50]);
    expect(validateRubricCriteria(balanced)).toBeNull();

    balanced[0].nombre = 'Argumentación matemática';
    balanced[0].niveles.Alto = 'Justifica cada paso con claridad.';
    const payload = prepareRubricCriteriaForSave(balanced, 5);

    expect(payload[0]).toMatchObject({
      nombre: 'Argumentación matemática',
      peso_porcentaje: 50,
      puntaje_maximo: 2.5,
      dba_ids: ['dba-1'],
      niveles: { Alto: 'Justifica cada paso con claridad.' },
    });
  });
});

describe('156 respuesta libre', () => {
  const open = (overrides: Partial<EditableQuestion> = {}) => validQuestion({ tipo: 'abierta', opciones: [], respuestaEsperada: '', ...overrides });

  it('asks only for open questions without an answer or a free-answer mark', () => {
    expect(needsAnswerDecision(open())).toBe(true);
    expect(needsAnswerDecision(open({ respuestaEsperada: 'La fotosíntesis' }))).toBe(false);
    expect(needsAnswerDecision(open(freeAnswerPatch(true)))).toBe(false);
    expect(needsAnswerDecision(validQuestion({ tipo: 'completar', opciones: [], respuestaEsperada: '' }))).toBe(false);
    expect(needsAnswerDecision(validQuestion({ respuestaEsperada: '' }))).toBe(false);
  });

  it('sets and undoes the mark explicitly', () => {
    const marked = open(freeAnswerPatch(true));
    expect(marked).toMatchObject({ respuestaLibre: true, respuestaEsperada: FREE_ANSWER_TEXT, answerOrigin: 'confirmacion_docente' });
    expect(validateQuestion(marked)).toBeNull();
    const undone = { ...marked, ...freeAnswerPatch(false) };
    expect(undone).toMatchObject({ respuestaLibre: false, respuestaEsperada: '', answerOrigin: 'pendiente' });
    expect(validateQuestion(undone)).toMatch(/respuesta esperada/i);
  });

  it('sends the mark only for open questions', () => {
    const payload = questionsToUpdatePayload([
      open({ ...freeAnswerPatch(true), numero: 1 }),
      validQuestion({ numero: 2, tipo: 'completar', opciones: [], respuestaEsperada: 'sol', respuestaLibre: true }),
      validQuestion({ numero: 3 }),
    ]);
    expect(payload.respuestas_esperadas[0]).toMatchObject({ numero: 1, respuesta: FREE_ANSWER_TEXT, respuesta_libre: true, origen: 'confirmacion_docente' });
    expect(payload.respuestas_esperadas[1]).not.toHaveProperty('respuesta_libre');
    expect(payload.respuestas_esperadas[2]).not.toHaveProperty('respuesta_libre');
  });

  it('reads the mark back only from an explicit true on an open question', () => {
    const evaluation = {
      id: 'evaluation-1', modalidad: 'fisica',
      preguntas: [
        { numero: 1, tipo: 'abierta', enunciado: '¿Qué te gustó?', puntaje: 2 },
        { numero: 2, tipo: 'abierta', enunciado: '¿Por qué llueve?', puntaje: 2 },
        { numero: 3, tipo: 'completar', enunciado: 'El sol es una ____', puntaje: 1 },
      ],
      respuestas_esperadas: [
        { numero: 1, respuesta: FREE_ANSWER_TEXT, respuesta_libre: true },
        { numero: 2, respuesta: '', respuesta_libre: 'true' },
        { numero: 3, respuesta: 'estrella', respuesta_libre: true },
      ],
    } as unknown as Evaluacion;
    const questions = evaluationToEditableQuestions(evaluation);
    expect(questions[0]).toMatchObject({ respuestaLibre: true, respuestaEsperada: FREE_ANSWER_TEXT });
    expect(questions[1].respuestaLibre).toBeFalsy();
    expect(questions[2].respuestaLibre).toBeFalsy();
    expect(questionsToUpdatePayload(questions).respuestas_esperadas[0]).toMatchObject({ respuesta_libre: true });
  });
});

describe('165 evaluación generada sin rúbrica', () => {
  // Así guardaba el asistente los criterios de una evaluación sin rúbrica: con peso cero.
  const zeroWeight = { nombre: 'Comprensión', descripcion: 'Comprende el texto.', peso_porcentaje: 0, niveles: {}, dba_ids: [] };
  const base = {
    id: 'exam', materia_id: 'subject', nombre: 'Prueba', modalidad: 'online', nota_maxima: 5, estado: 'borrador',
    preguntas: [{ numero: 1, tipo: 'abierta', enunciado: '¿Qué pasó en el cuento?', puntaje: 5 }],
    respuestas_esperadas: [{ numero: 1, respuesta: 'El zorro escapó' }],
  };
  const evaluationWith = (criterios: unknown[]) => ({ ...base, criterios }) as unknown as Evaluacion;

  it('se abre con la rúbrica apagada y sin error de validación aunque los criterios traigan peso cero', () => {
    const state = evaluationToWizardState(evaluationWith([zeroWeight]));
    expect(state.useRubric).toBe(false);
    expect(validateStep(state, 5)).toBeNull();
  });

  it('conserva la rúbrica encendida si hay un peso mayor que cero o niveles', () => {
    expect(evaluationToWizardState(evaluationWith([{ ...zeroWeight, peso_porcentaje: 100 }])).useRubric).toBe(true);
    expect(evaluationToWizardState(evaluationWith([{ ...zeroWeight, niveles: { Alto: 'Explica con precisión.' } }])).useRubric).toBe(true);
    expect(evaluationToWizardState(evaluationWith([{ nombre: 'Comprensión', descripcion: 'Comprende el texto.' }])).useRubric).toBe(false);
  });

  it('sin rúbrica no envía pesos ni puntajes por criterio y conserva lo demás', () => {
    const cleaned = criteriaWithoutRubric(normalizeRubricCriteria([
      { nombre: ' Comprensión ', descripcion: 'Comprende el texto.', dba_ids: ['dba-1'], puntaje_maximo: 0 },
    ]));
    expect(cleaned).toEqual([{ nombre: 'Comprensión', descripcion: 'Comprende el texto.', niveles: {}, dba_ids: ['dba-1'] }]);
  });
});
