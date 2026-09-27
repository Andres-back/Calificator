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
};

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
    add(attention, 'low_confidence', 'Una verificación tiene confianza baja');
  }
  if (valuationsContradict(component)) add(attention, 'valuation_disagreement', 'Las verificaciones no coinciden');
  if (!component.explicacion?.trim()) add(attention, 'missing_explanation', 'Falta explicar cómo se obtuvo el puntaje');
  if (isAssisted(component) && valuations.length < 2 && confidences.length === 0) {
    add(attention, 'insufficient_verification', 'Falta una segunda señal de verificación');
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

export function buildReviewTriage(breakdown: GradeBreakdownData, verifierAlerts: string[] = []): ReviewTriageSummary {
  const targetedNumbers = new Set(verifierAlerts.flatMap((alert) => [...questionNumbersInAlert(alert)]));
  const items = [...breakdown.componentes]
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
  const globalBlockers = [
    ...(breakdown.cobertura_estado !== 'completa' ? [`Cobertura ${breakdown.cobertura_estado}`] : []),
    ...(breakdown.bloqueos ?? []).filter((blocker) => !blocker.startsWith('componente_pendiente:')).map(humanizeBlocker),
    ...verifierAlerts.filter((alert) => questionNumbersInAlert(alert).size === 0),
  ];
  return {
    items,
    safe,
    attention,
    blocked,
    exceptions: [...blocked, ...attention],
    counts: { safe: safe.length, attention: attention.length, blocked: blocked.length },
    globalBlockers: [...new Set(globalBlockers)],
  };
}
