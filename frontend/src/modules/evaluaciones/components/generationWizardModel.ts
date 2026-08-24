import type { Evaluacion, EvaluacionModalidad } from '@/types/api';

export const WIZARD_VERSION = 7;
export const WIZARD_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 30;
export const MAX_REFERENCE_FILE_BYTES = 10 * 1024 * 1024;

export type QuestionType = 'opcion_multiple' | 'abierta' | 'verdadero_falso' | 'completar';
export type QuestionResponseMode = 'online' | 'fisica' | 'archivo';

export const QUESTION_TYPES: QuestionType[] = [
  'opcion_multiple',
  'verdadero_falso',
  'abierta',
  'completar',
];

export interface QuestionCounts {
  opcion_multiple: number;
  abierta: number;
  verdadero_falso: number;
  completar: number;
}

export interface ReferenceFileMetadata {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  needsReselection?: boolean;
}

export interface EditableQuestion {
  clientId: string;
  numero: number;
  tipo: QuestionType;
  enunciado: string;
  opciones: string[];
  respuestaEsperada: string;
  puntaje: number;
  modalidadRespuesta: QuestionResponseMode;
  dbaIds: string[];
  justificacionAlineacion?: string;
  fuenteContextoIds?: string[];
  expanded: boolean;
}


export interface EditableRubricCriterion extends Record<string, unknown> {
  nombre: string;
  descripcion: string;
  peso_porcentaje: number;
  puntaje_maximo?: number;
  niveles: Record<string, string>;
  dba_ids: string[];
}
export interface WizardState {
  step: number;
  materiaId: string;
  nombre: string;
  descripcion: string;
  modalidad: EvaluacionModalidad;
  notaMaxima: number;
  fechaLimiteEntrega: string;
  dbaIds: string[];
  dbaPersonalizadoIds: string[];
  useDba: boolean;
  useRubric: boolean;
  rubricCriteria: string[];
  counts: QuestionCounts;
  referenceText: string;
  referenceFile: ReferenceFileMetadata | null;
  instruccionesAdicionales: string;
  generatedEvaluationId: string | null;
  generatedCriteria: EditableRubricCriterion[];
  questions: EditableQuestion[];
}

interface StoredWizardDraft {
  version: number;
  userId: string;
  savedAt: number;
  state: WizardState;
}

export function createEmptyWizardState(materiaId = ''): WizardState {
  return {
    step: 1,
    materiaId,
    nombre: '',
    descripcion: '',
    modalidad: 'online',
    notaMaxima: 5,
    fechaLimiteEntrega: '',
    dbaIds: [],
    dbaPersonalizadoIds: [],
    useDba: false,
    useRubric: false,
    rubricCriteria: [],
    counts: {
      opcion_multiple: 2,
      abierta: 1,
      verdadero_falso: 0,
      completar: 0,
    },
    referenceText: '',
    referenceFile: null,
    instruccionesAdicionales: '',
    generatedEvaluationId: null,
    generatedCriteria: [],
    questions: [],
  };
}

export function wizardStorageKey(userId: string) {
  return `xcal:evaluacion-ia:v${WIZARD_VERSION}:${userId}`;
}

export function totalQuestionCount(counts: QuestionCounts) {
  return QUESTION_TYPES.reduce((total, type) => total + Math.max(0, counts[type] || 0), 0);
}

export function selectedQuestionTypes(counts: QuestionCounts): QuestionType[] {
  return QUESTION_TYPES.filter((type) => counts[type] > 0);
}

export function validateStep(state: WizardState, step = state.step): string | null {
  if (step === 1) {
    if (!state.materiaId) return 'Selecciona una materia para continuar.';
    if (state.nombre.trim().length < 2) return 'Escribe un nombre de al menos 2 caracteres.';
  }
  if (step === 2 && state.useDba && state.dbaIds.length + state.dbaPersonalizadoIds.length === 0) {
    return 'Seleccionaste alineación con DBA. Elige al menos uno o desactiva esa opción.';
  }
  if (step === 3) {
    const total = totalQuestionCount(state.counts);
    if (total < MIN_QUESTIONS || total > MAX_QUESTIONS) {
      return `Configura entre ${MIN_QUESTIONS} y ${MAX_QUESTIONS} preguntas en total.`;
    }
  }
  if (step === 4 && state.referenceText.length > 12000) {
    return 'El material de referencia no puede superar 12.000 caracteres.';
  }
  if (step === 5) {
    if (!state.generatedEvaluationId || state.questions.length === 0) {
      return 'Genera el borrador antes de continuar.';
    }
    if (state.useRubric) {
      const rubricError = validateRubricCriteria(state.generatedCriteria);
      if (rubricError) return rubricError;
    }
    const firstError = state.questions
      .map((question, index) => validateQuestion(question, index))
      .find(Boolean);
    if (firstError) return firstError;
    if (state.modalidad === 'mixta') {
      const hasOnline = state.questions.some((question) => question.modalidadRespuesta === 'online');
      const hasPhysical = state.questions.some(
        (question) => question.modalidadRespuesta === 'fisica' || question.modalidadRespuesta === 'archivo',
      );
      if (!hasOnline || !hasPhysical) {
        return 'Una evaluación mixta necesita preguntas online y preguntas en papel o archivo.';
      }
    }
    return null;
  }
  if (step === 6 && (!state.generatedEvaluationId || state.questions.length === 0)) {
    return 'No hay un borrador para confirmar.';
  }
  return null;
}


export function normalizeRubricCriteria(
  criteria: Record<string, unknown>[] | null | undefined,
): EditableRubricCriterion[] {
  return (criteria ?? []).map((criterion) => {
    const rawLevels = criterion.niveles;
    const levels = rawLevels && typeof rawLevels === 'object' && !Array.isArray(rawLevels)
      ? Object.fromEntries(
          Object.entries(rawLevels as Record<string, unknown>)
            .map(([name, description]) => [name.trim(), String(description ?? '').trim()])
            .filter(([name]) => Boolean(name)),
        )
      : {};
    const rawWeight = Number(criterion.peso_porcentaje ?? 0);
    return {
      ...criterion,
      nombre: String(criterion.nombre ?? '').trim(),
      descripcion: String(criterion.descripcion ?? '').trim(),
      peso_porcentaje: Number.isFinite(rawWeight) ? rawWeight : 0,
      puntaje_maximo: Number.isFinite(Number(criterion.puntaje_maximo))
        ? Number(criterion.puntaje_maximo)
        : undefined,
      niveles: levels,
      dba_ids: Array.isArray(criterion.dba_ids) ? criterion.dba_ids.map(String) : [],
    };
  });
}

export function rubricWeightTotal(criteria: EditableRubricCriterion[]): number {
  return Number(criteria.reduce((total, criterion) => total + Number(criterion.peso_porcentaje || 0), 0).toFixed(2));
}

export function validateRubricCriteria(criteria: EditableRubricCriterion[]): string | null {
  if (!criteria.length) return 'Agrega al menos un criterio a la rúbrica.';
  const names = criteria.map((criterion) => criterion.nombre.trim().toLocaleLowerCase());
  if (names.some((name) => !name)) return 'Todos los criterios necesitan un nombre.';
  if (new Set(names).size !== names.length) return 'Los criterios de la rúbrica no pueden repetirse.';
  for (const [index, criterion] of criteria.entries()) {
    const weight = Number(criterion.peso_porcentaje);
    if (!Number.isFinite(weight) || weight <= 0) {
      return `Criterio ${index + 1}: el peso debe ser mayor que cero.`;
    }
    const invalidLevel = Object.entries(criterion.niveles).find(
      ([name, description]) => !name.trim() || !description.trim(),
    );
    if (invalidLevel) return `Criterio ${index + 1}: completa todos los descriptores de nivel.`;
  }
  const total = rubricWeightTotal(criteria);
  if (Math.abs(total - 100) > 0.01) return `Los pesos de la rúbrica deben sumar 100 %. Total actual: ${total} %.`;
  return null;
}

export function rebalanceRubricWeights(
  criteria: EditableRubricCriterion[],
): EditableRubricCriterion[] {
  if (!criteria.length) return [];
  const shared = Math.floor((100 / criteria.length) * 100) / 100;
  return criteria.map((criterion, index) => ({
    ...criterion,
    peso_porcentaje: index === criteria.length - 1
      ? Number((100 - shared * (criteria.length - 1)).toFixed(2))
      : shared,
  }));
}

export function createBlankRubricCriterion(
  criteria: EditableRubricCriterion[],
): EditableRubricCriterion[] {
  return [
    ...criteria,
    {
      nombre: `Criterio ${criteria.length + 1}`,
      descripcion: '',
      peso_porcentaje: 0,
      puntaje_maximo: 0,
      niveles: {},
      dba_ids: [],
    },
  ];
}

export function moveRubricCriterion(
  criteria: EditableRubricCriterion[],
  index: number,
  direction: -1 | 1,
): EditableRubricCriterion[] {
  const target = index + direction;
  if (target < 0 || target >= criteria.length) return criteria;
  const next = [...criteria];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function prepareRubricCriteriaForSave(
  criteria: EditableRubricCriterion[],
  maximumGrade: number,
): Record<string, unknown>[] {
  return criteria.map((criterion) => {
    const weight = Number(Number(criterion.peso_porcentaje).toFixed(2));
    return {
      ...criterion,
      nombre: criterion.nombre.trim(),
      descripcion: criterion.descripcion.trim(),
      peso_porcentaje: weight,
      puntaje_maximo: Number(((weight / 100) * maximumGrade).toFixed(3)),
      niveles: Object.fromEntries(
        Object.entries(criterion.niveles).map(([name, description]) => [name.trim(), description.trim()]),
      ),
      dba_ids: criterion.dba_ids.map(String),
    };
  });
}
export function validateReferenceFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) return 'Selecciona un PDF o una imagen JPG, PNG o WebP.';
  if (file.size <= 0) return 'El archivo está vacío.';
  if (file.size > MAX_REFERENCE_FILE_BYTES) return 'El archivo no puede superar 10 MB.';
  return null;
}

function normalizeAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value == null) return '';
  return String(value);
}

function normalizeComparable(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase();
}

function optionParts(option: string): { label: string | null; body: string } {
  const match = option.match(/^\s*([A-H])\s*[).:-]\s*(.*?)\s*$/i);
  return match
    ? { label: match[1].toUpperCase(), body: match[2].trim() }
    : { label: null, body: option.trim() };
}

function canonicalEditableAnswer(
  rawAnswer: unknown,
  tipo: QuestionType,
  options: string[],
): string {
  const answer = normalizeAnswer(rawAnswer).trim();
  if (!answer) return '';
  const normalized = normalizeComparable(answer);

  if (tipo === 'verdadero_falso') {
    if (['verdadero', 'true', 'v', 'si', 'cierto'].includes(normalized)) return 'Verdadero';
    if (['falso', 'false', 'f', 'no'].includes(normalized)) return 'Falso';
    return answer;
  }

  if (tipo !== 'opcion_multiple') return answer;
  const exact = options.find((option) => {
    const parts = optionParts(option);
    return normalized === normalizeComparable(option)
      || normalized === normalizeComparable(parts.body);
  });
  if (exact) return exact;

  const letterMatch = normalized.match(
    /(?:^|\b)(?:opcion\s+|respuesta\s+(?:correcta\s+)?(?:es\s+)?)?([a-h])(?:\b|\s*[).:-])/i,
  );
  if (!letterMatch) return answer;
  const requested = letterMatch[1].toUpperCase();
  return options.find((option, index) => {
    const { label } = optionParts(option);
    return label === requested || (label == null && index === requested.charCodeAt(0) - 65);
  }) ?? answer;
}

export function evaluationToEditableQuestions(evaluation: Evaluacion): EditableQuestion[] {
  const answersByNumber = new Map<number, Record<string, unknown>>();
  (evaluation.respuestas_esperadas ?? []).forEach((rawAnswer, index) => {
    const answer = rawAnswer as Record<string, unknown>;
    const number = Number(answer.numero ?? index + 1);
    if (Number.isFinite(number)) answersByNumber.set(number, answer);
  });

  return (evaluation.preguntas ?? []).map((rawQuestion, index) => {
    const question = rawQuestion as Record<string, unknown>;
    const sourceNumber = Number(question.numero ?? index + 1);
    const rawAnswer = answersByNumber.get(sourceNumber)
      ?? ((evaluation.respuestas_esperadas?.[index] ?? {}) as Record<string, unknown>);
    const tipo = QUESTION_TYPES.includes(question.tipo as QuestionType)
      ? (question.tipo as QuestionType)
      : 'abierta';
    const options = Array.isArray(question.opciones)
      ? question.opciones.map(String)
      : tipo === 'verdadero_falso'
        ? ['Verdadero', 'Falso']
        : [];
    return {
      clientId: `${evaluation.id}-${index}-${Date.now()}`,
      numero: index + 1,
      tipo,
      enunciado: String(question.enunciado ?? ''),
      opciones: options,
      respuestaEsperada: canonicalEditableAnswer(
        rawAnswer.respuesta ?? rawAnswer.texto ?? rawAnswer.respuesta_correcta,
        tipo,
        options,
      ),
      puntaje: Number(question.puntaje ?? 1),
      modalidadRespuesta: (
        ['online', 'fisica', 'archivo'].includes(String(question.modalidad_respuesta))
          ? String(question.modalidad_respuesta)
          : evaluation.modalidad === 'fisica'
            ? 'fisica'
            : evaluation.modalidad === 'mixta' && tipo === 'abierta'
              ? 'fisica'
              : 'online'
      ) as QuestionResponseMode,
      dbaIds: Array.isArray(question.dba_ids) ? question.dba_ids.map(String) : [],
      justificacionAlineacion: question.justificacion_alineacion
        ? String(question.justificacion_alineacion)
        : undefined,
      fuenteContextoIds: Array.isArray(question.fuente_contexto_ids)
        ? question.fuente_contexto_ids.map(String)
        : [],
      expanded: index === 0,
    };
  });
}

export function validateQuestion(question: EditableQuestion, index = 0): string | null {
  const label = `Pregunta ${index + 1}`;
  if (!question.enunciado.trim()) return `${label}: el enunciado es obligatorio.`;
  if (!Number.isFinite(question.puntaje) || question.puntaje <= 0) {
    return `${label}: el puntaje debe ser mayor que cero.`;
  }
  if (question.tipo === 'opcion_multiple') {
    const cleanOptions = question.opciones.map((option) => option.trim()).filter(Boolean);
    if (cleanOptions.length < 3) return `${label}: agrega al menos tres opciones.`;
    if (new Set(cleanOptions.map((option) => option.toLocaleLowerCase())).size !== cleanOptions.length) {
      return `${label}: las opciones no pueden repetirse.`;
    }
    if (!cleanOptions.includes(question.respuestaEsperada.trim())) {
      return `${label}: selecciona una respuesta correcta válida.`;
    }
  }
  if (question.tipo === 'verdadero_falso' && !['Verdadero', 'Falso'].includes(question.respuestaEsperada)) {
    return `${label}: selecciona Verdadero o Falso.`;
  }
  if (
    (question.tipo === 'abierta' || question.tipo === 'completar')
    && !question.respuestaEsperada.trim()
  ) {
    return `${label}: escribe la respuesta esperada.`;
  }
  return null;
}

export function renumberQuestions(questions: EditableQuestion[]) {
  return questions.map((question, index) => ({ ...question, numero: index + 1 }));
}

export function createBlankQuestion(
  questions: EditableQuestion[],
  evaluationModality: EvaluacionModalidad,
): EditableQuestion[] {
  const question: EditableQuestion = {
    clientId: `new-question-${Date.now()}-${questions.length}`,
    numero: questions.length + 1,
    tipo: 'abierta',
    enunciado: '',
    opciones: [],
    respuestaEsperada: '',
    puntaje: 1,
    modalidadRespuesta: evaluationModality === 'fisica' ? 'fisica' : 'online',
    dbaIds: [],
    fuenteContextoIds: [],
    expanded: true,
  };
  return renumberQuestions([
    ...questions.map((current) => ({ ...current, expanded: false })),
    question,
  ]);
}

function toDatetimeLocalValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function evaluationToWizardState(evaluation: Evaluacion): WizardState {
  const questions = evaluationToEditableQuestions(evaluation);
  const criteria = (evaluation.criterios ?? []) as Record<string, unknown>[];
  const counts = { opcion_multiple: 0, abierta: 0, verdadero_falso: 0, completar: 0 };
  questions.forEach((question) => { counts[question.tipo] += 1; });
  const hasRubric = criteria.some((criterion) => (
    criterion.peso_porcentaje != null
    || (criterion.niveles != null && Object.keys(criterion.niveles as object).length > 0)
  ));
  return {
    ...createEmptyWizardState(evaluation.materia_id),
    step: 5,
    nombre: evaluation.nombre,
    descripcion: evaluation.descripcion ?? '',
    modalidad: evaluation.modalidad ?? 'online',
    notaMaxima: Number(evaluation.nota_maxima),
    fechaLimiteEntrega: toDatetimeLocalValue(evaluation.fecha_limite_entrega),
    dbaIds: evaluation.dba_ids ?? [],
    dbaPersonalizadoIds: evaluation.dba_personalizado_ids ?? [],
    useDba: Boolean((evaluation.dba_ids?.length ?? 0) + (evaluation.dba_personalizado_ids?.length ?? 0)),
    useRubric: hasRubric,
    rubricCriteria: criteria.map((criterion) => String(criterion.nombre ?? '')).filter(Boolean),
    counts,
    generatedEvaluationId: evaluation.id,
    generatedCriteria: normalizeRubricCriteria(criteria),
    questions,
  };
}

export function duplicateQuestion(questions: EditableQuestion[], index: number) {
  const original = questions[index];
  if (!original) return questions;
  const copy: EditableQuestion = {
    ...original,
    clientId: `${original.clientId}-copy-${Date.now()}`,
    enunciado: `${original.enunciado} (copia)`,
    opciones: [...original.opciones],
    dbaIds: [...original.dbaIds],
    fuenteContextoIds: [...(original.fuenteContextoIds ?? [])],
    expanded: true,
  };
  return renumberQuestions([
    ...questions.slice(0, index + 1),
    copy,
    ...questions.slice(index + 1),
  ]);
}

export function moveQuestion(questions: EditableQuestion[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  [next[index], next[target]] = [next[target], next[index]];
  return renumberQuestions(next);
}

export function questionsToUpdatePayload(questions: EditableQuestion[]) {
  return {
    preguntas: questions.map((question) => ({
      numero: question.numero,
      tipo: question.tipo,
      enunciado: question.enunciado.trim(),
      opciones: question.opciones.map((option) => option.trim()).filter(Boolean),
      puntaje: String(question.puntaje),
      modalidad_respuesta: question.modalidadRespuesta,
      dba_ids: question.dbaIds,
      justificacion_alineacion: question.justificacionAlineacion,
      fuente_contexto_ids: question.fuenteContextoIds ?? [],
    })),
    respuestas_esperadas: questions.map((question) => ({
      numero: question.numero,
      respuesta: question.respuestaEsperada.trim(),
      dba_ids: question.dbaIds,
    })),
  };
}

export function persistWizardDraft(storage: Storage, userId: string, state: WizardState, now = Date.now()) {
  const safeState: WizardState = {
    ...state,
    referenceFile: state.referenceFile
      ? { ...state.referenceFile, needsReselection: true }
      : null,
  };
  const draft: StoredWizardDraft = {
    version: WIZARD_VERSION,
    userId,
    savedAt: now,
    state: safeState,
  };
  storage.setItem(wizardStorageKey(userId), JSON.stringify(draft));
}

export function loadWizardDraft(storage: Storage, userId: string, now = Date.now()): WizardState | null {
  const key = wizardStorageKey(userId);
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredWizardDraft;
    if (
      draft.version !== WIZARD_VERSION
      || draft.userId !== userId
      || !draft.state
      || now - draft.savedAt > WIZARD_TTL_MS
    ) {
      storage.removeItem(key);
      return null;
    }
    return {
      ...draft.state,
      referenceFile: draft.state.referenceFile
        ? { ...draft.state.referenceFile, needsReselection: true }
        : null,
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function discardWizardDraft(storage: Storage, userId: string) {
  storage.removeItem(wizardStorageKey(userId));
}
