import type { Evaluacion, EvaluacionModalidad, EvaluationVisualManifest } from '@/types/api';

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
  contenidoId?: string;
  clientId: string;
  numero: number;
  tipo: QuestionType;
  enunciado: string;
  opciones: string[];
  respuestaEsperada: string;
  answerOrigin?: string;
  answerExplanation?: string;
  answerConfidence?: number;
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
  visualJobs?: Record<string, string>;
  visualKeysReviewed?: string[];
  visualKeysPending?: string[];
  contenidoVisual?: EvaluationVisualManifest;
  contenidoVersionId?: string | null;
  step: number;
  materiaId: string;
  nombre: string;
  nombreAutomatico?: boolean;
  generatedUpdatedAt?: string;
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
  generationWarnings?: string[];
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
    nombreAutomatico: true,
    descripcion: '',
    modalidad: 'fisica',
    notaMaxima: 5,
    fechaLimiteEntrega: '',
    dbaIds: [],
    dbaPersonalizadoIds: [],
    useDba: false,
    useRubric: false,
    rubricCriteria: [],
    counts: {
      opcion_multiple: 3,
      abierta: 2,
      verdadero_falso: 0,
      completar: 0,
    },
    referenceText: '',
    referenceFile: null,
    instruccionesAdicionales: '',
    generatedEvaluationId: null,
    generatedCriteria: [],
    generationWarnings: [],
    questions: [],
  };
}

export function wizardStorageKey(userId: string, materiaId?: string) {
  const legacyKey = `xcal:evaluacion-ia:v${WIZARD_VERSION}:${userId}`;
  return materiaId ? `${legacyKey}:materia:${encodeURIComponent(materiaId)}` : legacyKey;
}

export function totalQuestionCount(counts: QuestionCounts) {
  return QUESTION_TYPES.reduce((total, type) => total + Math.max(0, counts[type] || 0), 0);
}

export function selectedQuestionTypes(counts: QuestionCounts): QuestionType[] {
  return QUESTION_TYPES.filter((type) => counts[type] > 0);
}

export function updateWizardTopic(state: WizardState, topic: string): WizardState {
  return {
    ...state,
    descripcion: topic,
    nombre: state.nombreAutomatico === true ? (topic.trim() ? `Evaluación de ${topic.trim()}`.slice(0, 200) : '') : state.nombre,
  };
}

/** Conserva los tipos activos y reparte el total con restos deterministas. */
export function resizeQuestionCounts(counts: QuestionCounts, total: number): QuestionCounts {
  if (!Number.isInteger(total) || total < MIN_QUESTIONS || total > MAX_QUESTIONS) return counts;
  const active = QUESTION_TYPES.filter(type => counts[type] > 0);
  const originalTotal = totalQuestionCount(counts);
  if (!active.length || !Number.isFinite(originalTotal)) return counts;
  const next: QuestionCounts = { opcion_multiple: 0, abierta: 0, verdadero_falso: 0, completar: 0 };
  const shares = active.map(type => ({ type, exact: counts[type] / originalTotal * total }));
  shares.forEach(({ type, exact }) => { next[type] = Math.floor(exact); });
  const remaining = total - totalQuestionCount(next);
  shares.sort((a, b) => (b.exact % 1) - (a.exact % 1));
  shares.slice(0, remaining).forEach(({ type }) => { next[type] += 1; });
  return next;
}

/** No cambia preguntas/configuración: solo convierte la navegación antigua. */
export function normalizeWizardPhase(state: WizardState): WizardState {
  return { ...state, step: state.step >= 5 && state.generatedEvaluationId && state.questions.length ? 5 : 1 };
}

export function validatePreparation(state: WizardState): string | null {
  if (state.nombreAutomatico && !state.descripcion.trim()) return 'Escribe qué quieres evaluar.';
  return [1, 2, 3, 4].map(step => validateStep(state, step)).find(Boolean) ?? null;
}

export function validateStep(state: WizardState, step = state.step): string | null {
  if (step === 1 || step === 5) {
    if (!state.materiaId) return 'Selecciona una materia para continuar.';
    if (state.nombre.trim().length < 2) return 'Escribe un nombre de al menos 2 caracteres.';
    if (state.nombre.trim().length > 220) return 'Acorta el nombre de la evaluación a 220 caracteres.';
    if (!Number.isFinite(state.notaMaxima) || state.notaMaxima <= 0) return 'La nota máxima debe ser mayor que cero.';
    if (state.fechaLimiteEntrega && !Number.isFinite(new Date(state.fechaLimiteEntrega).getTime())) return 'Revisa la fecha límite de entrega.';
  }
  if (step === 2 && state.useDba && state.dbaIds.length + state.dbaPersonalizadoIds.length === 0) {
    return 'Elige al menos un criterio de aprendizaje o desactiva esa opción para continuar sin criterios.';
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
      contenidoId: typeof question.contenido_id === 'string' ? question.contenido_id : undefined,
      numero: index + 1,
      tipo,
      enunciado: String(question.enunciado ?? ''),
      opciones: options,
      respuestaEsperada: canonicalEditableAnswer(
        rawAnswer.respuesta ?? rawAnswer.texto ?? rawAnswer.respuesta_correcta,
        tipo,
        options,
      ),
      answerOrigin: rawAnswer.origen ? String(rawAnswer.origen) : undefined,
      answerExplanation: rawAnswer.explicacion ? String(rawAnswer.explicacion) : undefined,
      answerConfidence: typeof rawAnswer.confianza === 'number' ? rawAnswer.confianza : undefined,
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
    nombreAutomatico: false,
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
    contenidoVisual: evaluation.contenido_visual && 'cobertura' in evaluation.contenido_visual
      ? evaluation.contenido_visual : undefined,
    contenidoVersionId: evaluation.contenido_version_id,
    visualKeysPending: evaluation.claves_visuales_pendientes ?? [],
    generatedCriteria: normalizeRubricCriteria(criteria),
    generationWarnings: evaluation.blueprint?.reglas_feedback?.trazabilidad?.advertencias ?? [],
    questions,
  };
}

export function updateQuestionVisual(state: WizardState, questionId: string, block: EvaluationVisualManifest['bloques'][number] | null, replacedId?: string): WizardState {
  const manifest: EvaluationVisualManifest = state.contenidoVisual ?? { schema_version: 1,
    pregunta_ids: [], recurso_ids: [], bloques: [], cobertura: { detectados: [], conservados: [], avisos: [], estado: 'completa' } };
  // Removing/replacing one use must retain a shared stimulus for other questions.
  const retained = manifest.bloques.flatMap(item => {
    if (item.id !== replacedId) return [item];
    const ids = item.pregunta_ids.filter(id => id !== questionId);
    return ids.length ? [{ ...item, pregunta_ids: ids }] : [];
  });
  const bloques = [...retained, ...(block ? [{ ...block, orden: retained.length, pregunta_ids: [questionId] }] : [])];
  const keptIds = new Set(bloques.map(item => item.id));
  const avisos = manifest.cobertura.avisos.filter(warning => !warning.bloque_id || keptIds.has(warning.bloque_id));
  return { ...state, visualKeysReviewed: (state.visualKeysReviewed ?? []).filter(id => id !== questionId),
    visualKeysPending: [...new Set([...(state.visualKeysPending ?? []), questionId])],
    contenidoVisual: { ...manifest, pregunta_ids: state.questions.map(question => question.contenidoId!), bloques,
      recurso_ids: [...new Set(bloques.flatMap(item => item.recurso_id ? [item.recurso_id] : []))],
      cobertura: { ...manifest.cobertura, avisos, estado: avisos.length ? 'requiere_revision' : 'completa' } } };
}

export function reconcileVisualQuestions(state: WizardState, questions: EditableQuestion[], duplicateFrom?: string): Partial<WizardState> {
  if (!state.contenidoVisual) return { questions };
  const next = questions.map(question => ({ ...question, contenidoId: question.contenidoId || crypto.randomUUID() }));
  const ids = next.map(question => question.contenidoId!);
  const copied = duplicateFrom ? next.find(question => !state.questions.some(previous => previous.contenidoId === question.contenidoId))?.contenidoId : undefined;
  const bloques = state.contenidoVisual.bloques.flatMap(block => {
    const associations = block.pregunta_ids.filter(id => ids.includes(id));
    if (copied && duplicateFrom && block.pregunta_ids.includes(duplicateFrom)) associations.push(copied);
    return associations.length || !block.pregunta_ids.length ? [{ ...block, pregunta_ids: associations }] : [];
  });
  const kept = new Set(bloques.map(block => block.id));
  const avisos = state.contenidoVisual.cobertura.avisos.filter(warning => !warning.bloque_id || kept.has(warning.bloque_id))
    .map(warning => ({ ...warning, pregunta_ids: warning.pregunta_ids?.filter(id => ids.includes(id)) }));
  return { questions: next, contenidoVisual: { ...state.contenidoVisual, pregunta_ids: ids, bloques,
    recurso_ids: [...new Set(bloques.flatMap(block => block.recurso_id ? [block.recurso_id] : []))],
    cobertura: { ...state.contenidoVisual.cobertura, avisos, estado: avisos.length ? 'requiere_revision' : 'completa' } },
    visualKeysReviewed: state.visualKeysReviewed?.filter(id => ids.includes(id)),
    visualKeysPending: [...new Set([...(state.visualKeysPending ?? []).filter(id => ids.includes(id)), ...(copied ? [copied] : [])])] };
}

export function duplicateQuestion(questions: EditableQuestion[], index: number) {
  const original = questions[index];
  if (!original) return questions;
  const copy: EditableQuestion = {
    ...original,
    clientId: `${original.clientId}-copy-${Date.now()}`,
    contenidoId: original.contenidoId ? crypto.randomUUID() : undefined,
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
      ...(question.contenidoId ? { contenido_id: question.contenidoId } : {}),
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
      origen: question.answerOrigin ?? (question.respuestaEsperada.trim() ? 'confirmacion_docente' : 'pendiente'),
      explicacion: question.answerExplanation,
      confianza: question.answerConfidence,
      dba_ids: question.dbaIds,
    })),
  };
}

export function getWizardStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function persistWizardDraft(storage: Storage | null, userId: string, state: WizardState, now = Date.now(), editingEvaluationId?: string): boolean {
  if (!storage) return false;
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
  try {
    storage.setItem(editingEvaluationId ? visualEditKey(userId, editingEvaluationId) : wizardStorageKey(userId, state.materiaId), JSON.stringify(draft));
    if (!editingEvaluationId && state.materiaId) removeMatchingLegacyDraft(storage, userId, state.materiaId);
    return true;
  } catch { return false; }
}

function visualEditKey(userId: string, evaluationId: string) {
  return `xcal:visual-edit:v1:${encodeURIComponent(userId)}:${encodeURIComponent(evaluationId)}`;
}

export function loadVisualEditDraft(storage: Storage | null, userId: string, evaluationId: string, now = Date.now()) {
  if (!storage) return null;
  const draft = readWizardDraft(storage, userId, visualEditKey(userId, evaluationId), now);
  return draft?.generatedEvaluationId === evaluationId ? draft : null;
}

export function discardVisualEditDraft(storage: Storage | null, userId: string, evaluationId: string) {
  try { storage?.removeItem(visualEditKey(userId, evaluationId)); } catch { /* Device storage remains optional. */ }
}

/** Comprueba estructura, no completitud: un borrador editable puede tener campos vacíos. */
function hasDraftShape(state: WizardState): boolean {
  const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
  return ['materiaId', 'nombre', 'descripcion', 'fechaLimiteEntrega', 'referenceText', 'instruccionesAdicionales'].every(key => typeof state[key as keyof WizardState] === 'string')
    && ['online', 'fisica', 'mixta'].includes(state.modalidad)
    && Number.isFinite(state.step) && Number.isFinite(state.notaMaxima)
    && typeof state.useDba === 'boolean' && typeof state.useRubric === 'boolean'
    && (state.nombreAutomatico === undefined || typeof state.nombreAutomatico === 'boolean')
    && (state.generatedUpdatedAt === undefined || typeof state.generatedUpdatedAt === 'string')
    && (state.visualJobs === undefined || Boolean(state.visualJobs && typeof state.visualJobs === 'object'
      && !Array.isArray(state.visualJobs) && Object.values(state.visualJobs).every(value => typeof value === 'string')))
    && (!state.visualKeysPending || strings(state.visualKeysPending))
    && (!state.visualKeysReviewed || strings(state.visualKeysReviewed))
    && strings(state.dbaIds) && strings(state.dbaPersonalizadoIds) && strings(state.rubricCriteria)
    && (!state.generationWarnings || strings(state.generationWarnings))
    && (state.generatedEvaluationId === null || typeof state.generatedEvaluationId === 'string')
    && (state.referenceFile === null || Boolean(state.referenceFile
      && typeof state.referenceFile.name === 'string' && typeof state.referenceFile.type === 'string'
      && Number.isFinite(state.referenceFile.size) && Number.isFinite(state.referenceFile.lastModified)))
    && Boolean(state.counts) && QUESTION_TYPES.every(type => Number.isFinite(state.counts[type]))
    && Array.isArray(state.questions) && state.questions.every(question => question
      && typeof question.clientId === 'string' && QUESTION_TYPES.includes(question.tipo)
      && typeof question.enunciado === 'string' && typeof question.respuestaEsperada === 'string'
      && strings(question.opciones) && strings(question.dbaIds) && Number.isFinite(question.puntaje)
      && ['online', 'fisica', 'archivo'].includes(question.modalidadRespuesta))
    && Array.isArray(state.generatedCriteria) && state.generatedCriteria.every(criterion => criterion
      && typeof criterion.nombre === 'string' && typeof criterion.descripcion === 'string'
      && Number.isFinite(criterion.peso_porcentaje) && strings(criterion.dba_ids)
      && criterion.niveles && typeof criterion.niveles === 'object' && Object.values(criterion.niveles).every(value => typeof value === 'string'));
}

function readWizardDraft(storage: Storage, userId: string, key: string, now: number): WizardState | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredWizardDraft;
    if (
      draft.version !== WIZARD_VERSION
      || draft.userId !== userId
      || !draft.state || typeof draft.state !== 'object'
      || !hasDraftShape(draft.state)
      || !Number.isFinite(draft.savedAt)
      || now - draft.savedAt > WIZARD_TTL_MS
    ) {
      storage.removeItem(key);
      return null;
    }
    return normalizeWizardPhase({
      ...draft.state,
      referenceFile: draft.state.referenceFile
        ? { ...draft.state.referenceFile, needsReselection: true }
        : null,
    });
  } catch {
    try { storage.removeItem(key); } catch { /* El almacenamiento local es prescindible. */ }
    return null;
  }
}

export function loadWizardDraft(storage: Storage | null, userId: string, now = Date.now(), materiaId?: string): WizardState | null {
  if (!storage) return null;
  if (materiaId) {
    const scoped = readWizardDraft(storage, userId, wizardStorageKey(userId, materiaId), now);
    if (scoped?.materiaId === materiaId) return scoped;
  }
  const legacy = readWizardDraft(storage, userId, wizardStorageKey(userId), now);
  return legacy && (!materiaId || legacy.materiaId === materiaId) ? legacy : null;
}

function removeMatchingLegacyDraft(storage: Storage, userId: string, materiaId: string) {
  const key = wizardStorageKey(userId);
  try {
    const legacy = JSON.parse(storage.getItem(key) ?? 'null') as StoredWizardDraft | null;
    if (legacy?.userId === userId && legacy.state?.materiaId === materiaId) storage.removeItem(key);
  } catch {
    // No eliminamos un borrador ajeno durante el guardado o descarte actual.
  }
}

export function discardWizardDraft(storage: Storage | null, userId: string, materiaId?: string) {
  if (!storage) return;
  try { storage.removeItem(wizardStorageKey(userId, materiaId)); } catch { /* No bloquear el cierre del editor. */ }
  if (materiaId) removeMatchingLegacyDraft(storage, userId, materiaId);
}
