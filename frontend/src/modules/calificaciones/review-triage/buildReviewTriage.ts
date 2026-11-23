import type { GradeBreakdownData, GradeComponentData } from '@/types/api';

export type ReviewTriageLevel = 'safe' | 'attention' | 'blocked';
export type ReviewTriageReason = {
  code: string;
  label: string;
};
export type ReviewTriageItem = {
  component: GradeComponentData;
  level: ReviewTriageLevel;
  reasons: ReviewTriageReason[];
};
export type ReviewTriageSummary = {
  items: ReviewTriageItem[];
  safe: ReviewTriageItem[];
  attention: ReviewTriageItem[];
  blocked: ReviewTriageItem[];
  exceptions: ReviewTriageItem[];
  counts: Record<ReviewTriageLevel, number>;
  globalBlockers: string[];
  globalReasons?: string[];
};

export type ReviewNoticeTarget = 'revision' | 'evidencia' | 'retroalimentacion';

/** Spec 207: «2 y 3», «21, 22 y 23». */
function joinQuestions(numbers: string[]): string {
  return numbers.length <= 1 ? numbers.join('') : `${numbers.slice(0, -1).join(', ')} y ${numbers[numbers.length - 1]}`;
}

export const MISSING_IN_PHOTOS_PREFIX = 'faltan_en_fotos:';
export const NO_ANSWERS_IN_PHOTOS_PREFIX = 'fotos_sin_respuestas:';
const MISSING_IN_PHOTOS_GUIDANCE = 'Si el estudiante respondió al reverso o en otra hoja, añade esa foto en «Editar hojas» y vuelve a calificar. La IA no pone cero a una respuesta que no ve.';

/** Spec 213: notas que la IA escribió para el docente, marcadas con quién las escribió. */
export const PRIMARY_NOTE_PREFIX = 'nota_principal:';
export const VERIFIER_NOTE_PREFIX = 'nota_verificador:';
const NOTE_AUTHORS: Record<string, string> = { [PRIMARY_NOTE_PREFIX]: 'El modelo principal', [VERIFIER_NOTE_PREFIX]: 'El verificador' };

/** Texto legible de una nota de la IA, o null si parece un código o un diagnóstico técnico. */
export function readableAiNote(value: string): string | null {
  // eslint-disable-next-line no-control-regex
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length < 8 || !/\s/.test(text) || /\b(?:HTTP_?\d{3}|trace(?:back)?|exception|error_code|stack)\b/i.test(text)) return null;
  return text.length > 280 ? `${text.slice(0, 277).trimEnd()}…` : text;
}

function aiNote(raw: string): { author: string; text: string | null; verifier: boolean } | null {
  const prefix = Object.keys(NOTE_AUTHORS).find((item) => raw.startsWith(item));
  return prefix ? { author: NOTE_AUTHORS[prefix], text: readableAiNote(raw.slice(prefix.length)), verifier: prefix === VERIFIER_NOTE_PREFIX } : null;
}

function describePendingReviewBlocker(raw: string): { message: string; guidance: string; action: string; target: ReviewNoticeTarget; showGuidance?: boolean; leads?: boolean } {
  const note = aiNote(raw);
  if (note?.text) return {
    message: `${note.author} anotó: «${note.text}»`,
    guidance: 'Compara la nota con la respuesta del estudiante y la evidencia.', action: 'Revisar respuestas', target: 'revision',
  };
  if (note) raw = note.verifier ? 'verificador_solicita_revision' : 'aviso_del_modelo_principal';
  const reason = raw.replace(/^feedback_quality:/, '').trim();
  if (reason === 'principal_solicita_revision') return {
    message: 'El modelo principal pidió que revises esta calificación antes de confirmarla.',
    guidance: 'Revisa las respuestas con avisos y compáralas con la evidencia.', action: 'Revisar respuestas', target: 'revision',
  };
  if (reason.startsWith(NO_ANSWERS_IN_PHOTOS_PREFIX)) {
    const seen = reason.slice(NO_ANSWERS_IN_PHOTOS_PREFIX.length).trim();
    return {
      message: 'La IA no encontró en las fotos respuestas a esta evaluación.',
      guidance: `${seen ? `Lo que vio: «${seen}» ` : ''}Comprueba que la foto sea de esta evaluación. Si es de otra actividad, usa «Cambiar evidencia»; si las respuestas están en otra hoja, añádela en «Editar hojas». También puedes calificar a mano.`,
      action: 'Ver evidencia', target: 'evidencia', showGuidance: true, leads: true,
    };
  }
  if (reason.startsWith(MISSING_IN_PHOTOS_PREFIX) || reason === 'cobertura_evidencia_incompleta') {
    const numbers = reason.startsWith(MISSING_IN_PHOTOS_PREFIX) ? reason.slice(MISSING_IN_PHOTOS_PREFIX.length).split(',').filter(Boolean) : [];
    return {
      message: numbers.length === 0 ? 'Faltan respuestas en las fotos de la entrega.'
        : numbers.length === 1 ? `La respuesta de la pregunta ${numbers[0]} no aparece en las fotos.`
          : `Las respuestas de las preguntas ${joinQuestions(numbers)} no aparecen en las fotos.`,
      guidance: MISSING_IN_PHOTOS_GUIDANCE, action: 'Añadir la foto que falta', target: 'evidencia', showGuidance: true, leads: numbers.length > 0,
    };
  }
  if (reason === 'nota_global_no_coincide_con_suma') return {
    message: 'La nota propuesta por la IA no coincide con la suma de los puntos por pregunta.',
    guidance: 'Compara los puntajes con las respuestas antes de confirmar la nota.', action: 'Revisar puntajes por pregunta', target: 'revision',
  };
  if (reason === 'feedback_contradice_desglose') return {
    message: 'La retroalimentación no coincide con los puntajes registrados.',
    guidance: 'Comprueba las respuestas antes de compartirla.', action: 'Revisar retroalimentación', target: 'retroalimentacion',
  };
  if (reason === 'clave_incompleta') return {
    message: 'Faltan respuestas de referencia para completar la revisión.',
    guidance: 'Comprueba la clave de las preguntas indicadas.', action: 'Revisar respuestas de referencia', target: 'revision',
  };
  if (reason === 'hoja_faltante' || reason === 'componentes_o_evidencia_pendientes') return {
    message: reason === 'hoja_faltante' ? 'Falta una hoja de la evidencia.' : 'Falta información para completar la revisión.',
    guidance: 'Comprueba la evidencia y las respuestas pendientes.', action: 'Ver evidencia', target: 'evidencia',
  };
  if (/^(Cobertura |cobertura_|componentes_duplicados)/.test(reason)) return {
    message: 'No están revisadas todas las preguntas de forma consistente.',
    guidance: 'Comprueba que cada pregunta tenga una respuesta y un puntaje registrados.', action: 'Revisar puntajes por pregunta', target: 'revision',
  };
  if (reason.startsWith('verificador_ia:') || reason === 'verificador_solicita_revision') return {
    message: 'La segunda revisión de IA encontró algo que debes comprobar.',
    guidance: 'Contrasta las respuestas con la evidencia.', action: 'Revisar respuestas', target: 'revision',
  };
  if (reason === 'revision_docente_pendiente') return {
    message: 'La sugerencia necesita una revisión docente.',
    guidance: 'Comprueba las respuestas y sus puntajes antes de confirmar.', action: 'Revisar puntajes por pregunta', target: 'revision',
  };
  return {
    message: 'Hay información que debes comprobar antes de confirmar la nota.',
    guidance: 'Compara las respuestas y sus puntajes con la evidencia del estudiante.',
    action: 'Revisar evaluación', target: 'revision',
  };
}

export function describeReviewBlocker(raw: string, context: 'pending' | 'historical' | 'processing' = 'pending') {
  const notice = describePendingReviewBlocker(raw);
  if (context === 'pending') return notice;
  // Mientras la entrega sigue en análisis, las notas son provisionales y no se muestra su texto.
  const note = context === 'historical' ? aiNote(raw) : null;
  if (note?.text) return {
    ...notice,
    message: `En el análisis inicial, ${note.author.toLowerCase()} anotó: «${note.text}»`,
    guidance: 'Estos avisos pertenecen a la primera revisión; no cambian la nota actual.',
    action: 'Ver puntajes por pregunta',
  };
  const reason = raw.replace(/^feedback_quality:/, '').trim();
  const initialMessages: Record<string, string> = {
    nota_global_no_coincide_con_suma: 'En el análisis inicial, la IA propuso una nota distinta a la suma por preguntas.',
    feedback_contradice_desglose: 'En el análisis inicial, la retroalimentación no coincidía con los puntajes.',
    clave_incompleta: 'En el análisis inicial faltaban respuestas de referencia.',
    hoja_faltante: 'En el análisis inicial se señaló que faltaba una hoja de la evidencia.',
    componentes_o_evidencia_pendientes: 'En el análisis inicial faltaba información para revisar la entrega completa.',
    revision_docente_pendiente: 'La sugerencia inicial quedó pendiente de la decisión del docente.',
    verificador_solicita_revision: 'La segunda revisión de IA dejó observaciones en el análisis inicial.',
    principal_solicita_revision: 'En el análisis inicial, el modelo principal pidió revisión docente.',
  };
  const missing = reason.startsWith(MISSING_IN_PHOTOS_PREFIX) || reason === 'cobertura_evidencia_incompleta';
  const message = (reason.startsWith(NO_ANSWERS_IN_PHOTOS_PREFIX) ? 'En el análisis inicial la IA no encontró en las fotos respuestas a esta evaluación.' : undefined)
    ?? (missing ? 'En el análisis inicial faltaban respuestas en las fotos de la entrega.' : undefined)
    ?? initialMessages[reason]
    ?? (/^(Cobertura |cobertura_|componentes_duplicados)/.test(reason)
      ? 'En el análisis inicial no estaban revisadas todas las preguntas de forma consistente.'
      : reason.startsWith('verificador_ia:')
        ? initialMessages.verificador_solicita_revision
        : 'En el análisis inicial se registró un aviso adicional. Puedes consultar las respuestas y la evidencia.');
  return {
    ...notice,
    message,
    guidance: context === 'processing'
      ? 'La entrega sigue en análisis. La nota todavía no es definitiva.'
      : 'Estos avisos pertenecen a la primera revisión; no cambian la nota actual.',
    action: notice.target === 'evidencia' ? 'Ver evidencia'
      : notice.target === 'retroalimentacion' ? 'Ver retroalimentación' : 'Ver puntajes por pregunta',
  };
}

export const REVIEW_CONFIDENCE_THRESHOLD = 0.7;
export const REVIEW_HIGH_CONFIDENCE_THRESHOLD = 0.85;

export function hasVerifierReviewSignals(
  grader: Record<string, unknown> | undefined,
  strategy?: Record<string, unknown>,
): boolean {
  const alerts = Array.isArray(grader?.alertas)
    ? grader.alertas.filter((item) => String(item).trim())
    : [];
  return Boolean(
    grader?.requiere_revision_docente
    || alerts.length
    || strategy?.arbiter_reason === 'verifier_requested'
  );
}

function questionNumbersInAlert(alert: string): Set<string> {
  const numbers = new Set<string>();
  // Spec 213: la IA escribe «Pregunta 3», «P3», «P. 3» o «Q3» (igual que el backend).
  const pattern = /\b(?:preguntas?\s*(?:n[úu]mero\s*)?|p\s*\.?\s*|q\s*)(\d+)\b/gi;
  for (const match of alert.matchAll(pattern)) numbers.add(match[1]);
  return numbers;
}

function numeric(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedConfidence(value: unknown): number | null {
  const parsed = numeric(value);
  if (parsed == null || parsed < 0 || parsed > 100) return null;
  return parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
}

function isAssisted(component: GradeComponentData): boolean {
  return !['objetivo', 'docente', 'manual'].includes(component.origen.toLowerCase());
}

function usableValuations(component: GradeComponentData): Record<string, unknown>[] {
  return Array.isArray(component.valoraciones) ? component.valoraciones.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [];
}

/** Spec 212: origen de una pregunta en la que el verificador discrepó y se usó el modelo principal. */
export const PRIMARY_MODEL_ORIGIN = 'modelo_principal';

function primaryModelLabel(valuations: Record<string, unknown>[]): string {
  const verifier = valuations.find((valuation) => valuation.evaluador === 'B');
  const score = numeric(verifier?.puntaje);
  const proposal = score != null ? `propuso ${score.toLocaleString('es-CO', { maximumFractionDigits: 2 })} ${score === 1 ? 'punto' : 'puntos'}` : 'no pudo valorarla';
  return `El verificador ${proposal}; se usó la valoración del modelo principal`;
}

function valuationsContradict(component: GradeComponentData): boolean {
  const valuations = usableValuations(component);
  if (valuations.length < 2) return false;
  const scores = valuations.map((item) => numeric(item.puntaje)).filter((value): value is number => value != null);
  const states = valuations.map((item) => String(item.estado ?? '')).filter(Boolean);
  const maximum = numeric(component.puntos_maximos) ?? 0;
  const materialDifference = scores.length > 1 && Math.max(...scores) - Math.min(...scores) > Math.max(0.1, maximum * 0.1);
  const oppositeStates = states.includes('correcta') && states.includes('incorrecta');
  return materialDifference || oppositeStates;
}

export function classifyReviewComponent(component: GradeComponentData, missingInPhotos: ReadonlySet<string> = new Set()): ReviewTriageItem {
  const blocked: ReviewTriageReason[] = [];
  const attention: ReviewTriageReason[] = [];
  const add = (target: ReviewTriageReason[], code: string, label: string) => {
    if (!target.some((reason) => reason.code === code)) target.push({ code, label });
  };
  const decidedByTeacher = ['docente', 'manual'].includes(component.origen.toLowerCase()) && !component.requiere_revision;
  if (!decidedByTeacher && component.numero != null && missingInPhotos.has(String(component.numero))) {
    add(blocked, 'missing_in_photos', 'Esta respuesta no aparece en las fotos de la entrega');
  }

  if (component.requiere_revision) add(blocked, 'manual_review', 'Marcada para revisión manual');
  if (!['correcta', 'parcial', 'incorrecta', 'sin_respuesta', 'ilegible', 'no_evaluable', 'revision_pendiente'].includes(component.estado)) add(attention, 'unknown_state', 'Falta confirmar el estado de esta valoración');
  if (['ilegible', 'no_evaluable', 'revision_pendiente'].includes(component.estado)) {
    add(blocked, `state_${component.estado}`, component.estado === 'ilegible'
      ? 'La respuesta no se pudo leer'
      : component.estado === 'no_evaluable' ? 'La respuesta no se pudo evaluar' : 'La valoración quedó pendiente');
  }
  const points = numeric(component.puntos_obtenidos);
  const maximum = numeric(component.puntos_maximos);
  if (points == null || maximum == null || maximum <= 0 || points < 0 || points > maximum) add(blocked, 'missing_score', 'No tiene un puntaje válido y verificable');

  const teacherReviewed = ['docente', 'manual'].includes(component.origen.toLowerCase())
    && !component.requiere_revision && !['ilegible', 'no_evaluable', 'revision_pendiente'].includes(component.estado);
  // Only a per-question correction makes original model assessments historical.
  const valuations = teacherReviewed ? [] : usableValuations(component);
  // Spec 212: si el verificador discrepó se usó el modelo principal; solo su confianza cuenta.
  const primaryModel = component.origen.toLowerCase() === PRIMARY_MODEL_ORIGIN;
  const confidences = (primaryModel ? valuations.filter((valuation) => valuation.evaluador === 'A') : valuations)
    .map((valuation) => normalizedConfidence(valuation.confianza))
    .filter((value): value is number => value != null);
  if (confidences.some((confidence) => confidence < REVIEW_CONFIDENCE_THRESHOLD)) {
    add(blocked, 'low_confidence', 'La IA indicó baja confianza: contrasta esta respuesta con la evidencia');
  }
  if (!teacherReviewed && primaryModel) add(attention, 'primary_model_used', primaryModelLabel(valuations));
  else if (!teacherReviewed && valuationsContradict(component)) add(blocked, 'valuation_disagreement', 'Las verificaciones tienen una diferencia importante');
  const scores = valuations.map((item) => numeric(item.puntaje)).filter((value): value is number => value != null);
  if (!primaryModel && scores.length > 1 && Math.max(...scores) - Math.min(...scores) > 0.000001) add(attention, 'minor_disagreement', 'Los puntajes de las verificaciones tienen una diferencia');
  if (confidences.some((confidence) => confidence >= REVIEW_CONFIDENCE_THRESHOLD && confidence < REVIEW_HIGH_CONFIDENCE_THRESHOLD)) add(attention, 'moderate_confidence', 'Conviene comprobar la valoración con la evidencia');
  if (!component.explicacion?.trim()) add(attention, 'missing_explanation', 'Falta explicar cómo se obtuvo el puntaje');
  if (isAssisted(component) && !primaryModel && (valuations.length < 2 || confidences.length !== valuations.length
    || scores.length !== valuations.length || scores.some((value) => value < 0 || maximum == null || value > maximum)
    || valuations.some((value) => !['correcta', 'parcial', 'incorrecta', 'sin_respuesta'].includes(String(value.estado))))) {
    add(attention, 'insufficient_verification', 'No hay información suficiente para comprobar la revisión de IA');
  }

  const level: ReviewTriageLevel = blocked.length > 0 ? 'blocked' : attention.length > 0 ? 'attention' : 'safe';
  return { component, level, reasons: level === 'blocked' ? blocked : level === 'attention' ? attention : [] };
}

function humanizeBlocker(blocker: string): string {
  if (blocker.startsWith(MISSING_IN_PHOTOS_PREFIX) || blocker.startsWith(NO_ANSWERS_IN_PHOTOS_PREFIX) || blocker === 'cobertura_evidencia_incompleta') return describePendingReviewBlocker(blocker).message;
  const note = aiNote(blocker);
  if (note) return note.text ? `${note.author} anotó: ${note.text}` : describePendingReviewBlocker(blocker).message;
  if (blocker.startsWith('verificador_ia:')) {
    return `Verificador independiente: ${blocker.slice('verificador_ia:'.length)}`;
  }
  return blocker.replace(/^componente_pendiente:/, 'Componente pendiente: ').replace(/_/g, ' ');
}

/** Spec 207: preguntas que la calificación no encontró en las fotos (`evidence_coverage`). */
export function missingQuestionsInPhotos(result: unknown): string[] {
  const coverage = result && typeof result === 'object' ? (result as Record<string, unknown>).evidence_coverage : null;
  if (!coverage || typeof coverage !== 'object') return [];
  const { faltantes, requiere_revision: requiresReview } = coverage as Record<string, unknown>;
  if (requiresReview === false || !Array.isArray(faltantes)) return [];
  return [...new Set(faltantes.map((item) => String(item).trim()).filter((item) => /^[\w.-]{1,12}$/.test(item)))];
}

const NO_ANSWERS_REASONS = new Set(['image_not_usable', 'student_answers_not_detected']);

/**
 * Spec 207: la lectura de las fotos no encontró respuestas a la evaluación (p. ej. una página
 * de otra actividad). Devuelve lo que la IA explicó, o null si no es ese caso.
 */
export function photosWithoutAnswers(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const data = result as Record<string, unknown>;
  if (!NO_ANSWERS_REASONS.has(String(data.motivo_revision ?? ''))) return null;
  const visionAlerts = (data.vision_result as Record<string, unknown> | undefined)?.alertas;
  const alerts = [...(Array.isArray(data.alertas) ? data.alertas : []), ...(Array.isArray(visionAlerts) ? visionAlerts : [])];
  const first = alerts.map((item) => String(item ?? '').replace(/\s+/g, ' ').trim()).find((item) => item && item !== 'Imagen no utilizable');
  if (!first) return '';
  return first.length > 280 ? `${first.slice(0, 277).trimEnd()}…` : first;
}

export function buildReviewTriage(breakdown: GradeBreakdownData | null, verifierAlerts: string[] = [], missingInPhotos: string[] = [], noAnswersReason: string | null = null, primaryAlerts: string[] = []): ReviewTriageSummary {
  if (noAnswersReason !== null) {
    missingInPhotos = (breakdown?.componentes ?? []).filter((item) => item.tipo === 'pregunta' && item.numero != null).map((item) => String(item.numero));
  }
  // Spec 213: cada nota de la IA va a la pregunta que nombra; las demás quedan como aviso general.
  const notes = [
    ...primaryAlerts.map((alert) => `${PRIMARY_NOTE_PREFIX}${alert}`),
    ...verifierAlerts.map((alert) => `${VERIFIER_NOTE_PREFIX}${alert}`),
  ].filter((raw, index, all) => all.indexOf(raw) === index);
  const attached = new Set<string>();
  const missing = new Set(missingInPhotos);
  const items = [...(breakdown?.componentes ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map((component) => classifyReviewComponent(component, missing))
    .map((item) => {
      const numero = item.component.numero == null ? '' : String(item.component.numero);
      const own = numero ? notes.filter((raw) => questionNumbersInAlert(raw).has(numero)) : [];
      own.forEach((raw) => attached.add(raw));
      if (!own.length || ['docente', 'manual'].includes(item.component.origen.toLowerCase())) return item;
      const reasons = [...item.reasons];
      own.forEach((raw, index) => {
        const note = aiNote(raw);
        const label = note?.text ? `${note.author} anotó: «${note.text}»`
          : note?.verifier ? 'El verificador independiente pide revisar esta pregunta' : 'El modelo principal dejó una observación sobre esta pregunta';
        if (!reasons.some((reason) => reason.label === label)) reasons.push({ code: `ai_note:${index}`, label });
      });
      return { ...item, level: item.level === 'blocked' ? item.level : 'attention' as const, reasons };
    });
  // Una nota sin pregunta, o que nombra una que no está en el desglose, va al aviso general.
  const safe = items.filter((item) => item.level === 'safe');
  const attention = items.filter((item) => item.level === 'attention');
  const blocked = items.filter((item) => item.level === 'blocked');
  // Las preguntas que faltan en las fotos se nombran; sustituyen al aviso genérico de cobertura.
  const pendingMissing = missingInPhotos.filter((number) => items.some((item) => item.reasons.some((reason) => reason.code === 'missing_in_photos') && String(item.component.numero) === number));
  const missingNotice = noAnswersReason !== null ? [`${NO_ANSWERS_IN_PHOTOS_PREFIX}${noAnswersReason}`]
    : pendingMissing.length ? [`${MISSING_IN_PHOTOS_PREFIX}${pendingMissing.join(',')}`] : [];
  const globalReasons = [
    ...missingNotice,
    ...(breakdown && breakdown.cobertura_estado !== 'completa' && !missingNotice.length ? [`Cobertura ${breakdown.cobertura_estado}`] : []),
    ...(breakdown?.bloqueos ?? []).filter((blocker) => !blocker.startsWith('componente_pendiente:')
      && !(missingNotice.length && blocker === 'cobertura_evidencia_incompleta')
      && !(noAnswersReason !== null && blocker === 'feedback_quality:componentes_o_evidencia_pendientes')),
    ...notes.filter((raw) => !attached.has(raw)),
  ];
  return {
    items,
    safe,
    attention,
    blocked,
    exceptions: [...blocked, ...attention],
    counts: { safe: safe.length, attention: attention.length, blocked: blocked.length },
    globalBlockers: [...new Set(globalReasons.map(humanizeBlocker))],
    globalReasons: [...new Set(globalReasons)],
  };
}
