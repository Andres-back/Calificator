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

function describePendingReviewBlocker(raw: string): { message: string; guidance: string; action: string; target: ReviewNoticeTarget } {
  const reason = raw.replace(/^feedback_quality:/, '').trim();
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
  const reason = raw.replace(/^feedback_quality:/, '').trim();
  const initialMessages: Record<string, string> = {
    nota_global_no_coincide_con_suma: 'En el análisis inicial, la IA propuso una nota distinta a la suma por preguntas.',
    feedback_contradice_desglose: 'En el análisis inicial, la retroalimentación no coincidía con los puntajes.',
    clave_incompleta: 'En el análisis inicial faltaban respuestas de referencia.',
    hoja_faltante: 'En el análisis inicial se señaló que faltaba una hoja de la evidencia.',
    componentes_o_evidencia_pendientes: 'En el análisis inicial faltaba información para revisar la entrega completa.',
    revision_docente_pendiente: 'La sugerencia inicial quedó pendiente de la decisión del docente.',
    verificador_solicita_revision: 'La segunda revisión de IA dejó observaciones en el análisis inicial.',
  };
  const message = initialMessages[reason]
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
  const pattern = /preguntas?\s*(?:n[úu]mero\s*)?(\d+)/gi;
  for (const match of alert.matchAll(pattern)) numbers.add(match[1]);
  return numbers;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedConfidence(value: unknown): number | null {
  const parsed = numeric(value);
  if (parsed == null || parsed < 0) return null;
  return parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
}

function isAssisted(component: GradeComponentData): boolean {
  return !['objetivo', 'docente', 'manual'].includes(component.origen.toLowerCase());
}

function valuationsContradict(component: GradeComponentData): boolean {
  const valuations = component.valoraciones ?? [];
  if (valuations.length < 2) return false;
  const scores = valuations.map((item) => numeric(item.puntaje)).filter((value): value is number => value != null);
  const states = valuations.map((item) => String(item.estado ?? '')).filter(Boolean);
  const maximum = numeric(component.puntos_maximos) ?? 0;
  const materialDifference = scores.length > 1 && Math.max(...scores) - Math.min(...scores) > Math.max(0.1, maximum * 0.1);
  const oppositeStates = states.includes('correcta') && states.includes('incorrecta');
  return materialDifference || oppositeStates;
}

export function classifyReviewComponent(component: GradeComponentData): ReviewTriageItem {
  const blocked: ReviewTriageReason[] = [];
  const attention: ReviewTriageReason[] = [];
  const add = (target: ReviewTriageReason[], code: string, label: string) => {
    if (!target.some((reason) => reason.code === code)) target.push({ code, label });
  };

  if (component.requiere_revision) add(blocked, 'manual_review', 'Marcada para revisión manual');
  if (['ilegible', 'no_evaluable', 'revision_pendiente'].includes(component.estado)) {
    add(blocked, `state_${component.estado}`, component.estado === 'ilegible'
      ? 'La respuesta no se pudo leer'
      : component.estado === 'no_evaluable' ? 'La respuesta no se pudo evaluar' : 'La valoración quedó pendiente');
  }
  if (component.puntos_obtenidos == null) add(blocked, 'missing_score', 'No tiene puntaje verificable');

  const valuations = component.valoraciones ?? [];
  const confidences = valuations
    .map((valuation) => normalizedConfidence(valuation.confianza))
    .filter((value): value is number => value != null);
  if (confidences.some((confidence) => confidence < REVIEW_CONFIDENCE_THRESHOLD)) {
    add(attention, 'low_confidence', 'La IA indicó dudas al revisar esta respuesta');
  }
  if (valuationsContradict(component)) add(attention, 'valuation_disagreement', 'Las verificaciones no coinciden');
  if (!component.explicacion?.trim()) add(attention, 'missing_explanation', 'Falta explicar cómo se obtuvo el puntaje');
  if (isAssisted(component) && valuations.length < 2 && confidences.length === 0) {
    add(attention, 'insufficient_verification', 'No hay información suficiente para comprobar la revisión de IA');
  }

  const level: ReviewTriageLevel = blocked.length > 0 ? 'blocked' : attention.length > 0 ? 'attention' : 'safe';
  return { component, level, reasons: level === 'blocked' ? blocked : level === 'attention' ? attention : [] };
}

function humanizeBlocker(blocker: string): string {
  if (blocker.startsWith('verificador_ia:')) {
    return `Verificador independiente: ${blocker.slice('verificador_ia:'.length)}`;
  }
  return blocker.replace(/^componente_pendiente:/, 'Componente pendiente: ').replace(/_/g, ' ');
}

export function buildReviewTriage(breakdown: GradeBreakdownData | null, verifierAlerts: string[] = []): ReviewTriageSummary {
  const targetedNumbers = new Set(verifierAlerts.flatMap((alert) => [...questionNumbersInAlert(alert)]));
  const items = [...(breakdown?.componentes ?? [])]
    .sort((a, b) => a.orden - b.orden)
    .map(classifyReviewComponent)
    .map((item) => {
      if (item.level === 'blocked' || !item.component.numero || !targetedNumbers.has(String(item.component.numero))) return item;
      const reasons = [...item.reasons];
      if (!reasons.some((reason) => reason.code === 'verifier_alert')) {
        reasons.push({ code: 'verifier_alert', label: 'El verificador independiente pide revisar esta pregunta' });
      }
      return { ...item, level: 'attention' as const, reasons };
    });
  const safe = items.filter((item) => item.level === 'safe');
  const attention = items.filter((item) => item.level === 'attention');
  const blocked = items.filter((item) => item.level === 'blocked');
  const globalReasons = [
    ...(breakdown && breakdown.cobertura_estado !== 'completa' ? [`Cobertura ${breakdown.cobertura_estado}`] : []),
    ...(breakdown?.bloqueos ?? []).filter((blocker) => !blocker.startsWith('componente_pendiente:')),
    ...verifierAlerts.filter((alert) => questionNumbersInAlert(alert).size === 0),
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
