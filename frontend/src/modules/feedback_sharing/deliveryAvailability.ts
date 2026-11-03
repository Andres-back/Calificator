import type { FeedbackAccess, FeedbackCopiedAccess, FeedbackPreview } from './api';

export type AccessQueryState =
  | { status: 'loading'; accesses?: readonly FeedbackAccess[] }
  | { status: 'error'; accesses?: readonly FeedbackAccess[]; code?: string; error?: string }
  | { status: 'loaded'; accesses: readonly FeedbackAccess[] };

export type AccessRecovery =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; result: FeedbackCopiedAccess }
  | { status: 'unavailable' | 'error'; code?: string; error?: string };

export type DeliveryAvailabilityKind = 'loading' | 'query_error' | 'needs_review' | 'ready_to_generate'
  | 'available' | 'needs_resend' | 'expired' | 'disabled' | 'attention';
export type DeliveryAvailabilityAction = 'wait' | 'retry_query' | 'review' | 'generate' | 'copy'
  | 'retry_recovery' | 'choose' | 'manage' | 'replace';
export type DeliveryAvailabilityCause = 'query_error' | 'confirmed_missing' | 'preview_unavailable' | 'no_grade'
  | 'needs_review' | 'multiple' | 'multiple_closed' | 'invalid_selection' | 'legacy_unrecoverable'
  | 'recovery_error' | 'unavailable' | 'invalid_response' | 'suspended' | 'expired' | 'disabled';

interface DeliveryAvailabilityBase {
  label: string;
  action: DeliveryAvailabilityAction;
  cause?: DeliveryAvailabilityCause;
  code?: string;
  error?: string;
  accesses: readonly FeedbackAccess[];
  candidates: readonly FeedbackAccess[];
  selectedAccess?: FeedbackAccess;
}

export type DeliveryAvailability =
  | (DeliveryAvailabilityBase & { kind: 'available'; url: string; requiresApproval?: never })
  | (DeliveryAvailabilityBase & { kind: 'ready_to_generate'; requiresApproval: boolean; url?: never })
  | (DeliveryAvailabilityBase & { kind: Exclude<DeliveryAvailabilityKind, 'available' | 'ready_to_generate'>; url?: never; requiresApproval?: never });

export interface DeliveryAvailabilityInput {
  gradeId: string;
  preview?: FeedbackPreview;
  query: AccessQueryState;
  recoveries?: Readonly<Record<string, AccessRecovery | undefined>>;
  selectedAccessId?: string;
  now?: number;
}

const labels: Record<DeliveryAvailabilityKind, string> = {
  loading: 'Buscando su enlace…', query_error: 'No pudimos consultar su enlace', needs_review: 'Falta revisar',
  ready_to_generate: 'Listo para generar', available: 'Enlace disponible', needs_resend: 'Necesita reenvío',
  expired: 'Vencido', disabled: 'Desactivado', attention: 'Requiere atención',
};

function isShareUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /\s/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && Boolean(parsed.hostname);
  } catch { return false; }
}

/** Presentation only: never reads, publishes, creates, reactivates or copies an access. */
export function deriveDeliveryAvailability({ gradeId, preview, query, recoveries = {}, selectedAccessId, now = Date.now() }: DeliveryAvailabilityInput): DeliveryAvailability {
  const empty = { accesses: [], candidates: [] };
  if (query.status === 'loading') return { ...empty, kind: 'loading', label: labels.loading, action: 'wait' };
  if (query.status === 'error') return { ...empty, kind: 'query_error', label: labels.query_error, action: 'retry_query', cause: 'query_error', code: query.code, error: query.error };

  const accesses = query.accesses.filter(item => item.calificacion_id === gradeId);
  const expires = (item: FeedbackAccess) => Date.parse(item.expires_at);
  const active = accesses.filter(item => item.estado === 'active' && expires(item) > now);
  const suspended = accesses.filter(item => item.estado === 'suspended' && expires(item) > now);
  const candidates = active.length ? active : suspended;
  const base: DeliveryAvailabilityBase = { accesses, candidates, label: labels.attention, action: 'manage' };
  const attention = (cause: DeliveryAvailabilityCause, action: DeliveryAvailabilityAction, selectedAccess?: FeedbackAccess): DeliveryAvailability => ({
    ...base, kind: 'attention', cause, action, ...(selectedAccess ? { selectedAccess } : {}),
  });

  if (!accesses.length) {
    if (!preview || preview.calificacion_id !== gradeId) return { ...base, kind: 'needs_review', label: labels.needs_review, action: 'review', cause: 'preview_unavailable' };
    if (preview.preparacion !== 'no_grade' && preview.elegible && preview.fingerprint) return { ...base, kind: 'ready_to_generate', label: labels.ready_to_generate, action: 'generate', cause: 'confirmed_missing', requiresApproval: false };
    // no_grade also describes an unconfirmed suggested grade. A server candidate
    // is usable only through the separate, explicit academic approval workflow.
    if (preview.batch_candidate?.source_fingerprint && preview.batch_candidate.nota && preview.batch_candidate.feedback_text) {
      return { ...base, kind: 'ready_to_generate', label: labels.ready_to_generate, action: 'generate', cause: 'confirmed_missing', requiresApproval: true };
    }
    if (preview.preparacion === 'no_grade') return { ...base, kind: 'needs_review', label: labels.needs_review, action: 'review', cause: 'no_grade' };
    return { ...base, kind: 'needs_review', label: labels.needs_review, action: 'review', cause: 'needs_review' };
  }

  if (new Set(accesses.map(item => item.id)).size !== accesses.length || !Number.isFinite(now)) return attention('invalid_response', 'retry_query');
  let selectedAccess: FeedbackAccess | undefined;
  if (selectedAccessId !== undefined) {
    selectedAccess = accesses.find(item => item.id === selectedAccessId);
    if (!selectedAccess) return attention('invalid_selection', 'choose');
  } else {
    if (accesses.some(item => !Number.isFinite(expires(item)))) return attention('invalid_response', 'retry_query');
    if (candidates.length > 1) return attention('multiple', 'choose');
    selectedAccess = candidates[0] ?? (accesses.length === 1 ? accesses[0] : undefined);
  }

  if (!selectedAccess) {
    const closedStates = accesses.map(item => item.estado === 'disabled' ? 'disabled' : expires(item) <= now || item.estado === 'expired' ? 'expired' : undefined);
    const kind = closedStates[0];
    if (kind && closedStates.every(state => state === kind)) return { ...base, kind, label: labels[kind], action: 'manage', cause: kind };
    return attention('multiple_closed', 'manage');
  }

  const selected = { ...base, selectedAccess };
  const closed = (kind: 'expired' | 'disabled' | 'needs_resend', code?: string, error?: string): DeliveryAvailability => ({
    ...selected, kind, label: labels[kind], action: kind === 'needs_resend' ? 'review' : 'manage',
    cause: kind === 'needs_resend' ? 'suspended' : kind, ...(code !== undefined ? { code } : {}), ...(error !== undefined ? { error } : {}),
  });
  if (selectedAccess.estado === 'disabled') return closed('disabled');
  if (!Number.isFinite(expires(selectedAccess))) return attention('invalid_response', 'retry_query', selectedAccess);
  if (selectedAccess.estado === 'expired' || expires(selectedAccess) <= now) return closed('expired');
  // This projection requests review; it is not authorization to reactivate.
  if (selectedAccess.estado === 'suspended') return closed('needs_resend');

  const recovery = recoveries[selectedAccess.id];
  if (recovery?.status === 'unavailable' || recovery?.status === 'error') {
    if (recovery.code === 'expired') return closed('expired', recovery.code, recovery.error);
    if (recovery.code === 'disabled' || recovery.code === 'revoked') return closed('disabled', recovery.code, recovery.error);
    if (recovery.code === 'suspended') return closed('needs_resend', recovery.code, recovery.error);
    const cause = recovery.code === 'legacy_unrecoverable' ? 'legacy_unrecoverable' : recovery.status === 'error' ? 'recovery_error' : 'unavailable';
    return { ...attention(cause, cause === 'legacy_unrecoverable' ? 'replace' : 'retry_recovery', selectedAccess), code: recovery.code, error: recovery.error };
  }
  if (recovery?.status === 'ready') {
    const result = recovery.result;
    if (result.id !== selectedAccess.id || (result.calificacion_id !== undefined && result.calificacion_id !== gradeId)
      || result.code || result.error || !isShareUrl(result.url) || !result.expires_at || Date.parse(result.expires_at) !== expires(selectedAccess)) {
      return attention('invalid_response', 'retry_recovery', selectedAccess);
    }
    return { ...selected, kind: 'available', label: labels.available, action: 'copy', url: result.url };
  }
  if (selectedAccess.copy_available === false) return attention('legacy_unrecoverable', 'replace', selectedAccess);
  return { ...selected, kind: 'loading', label: labels.loading, action: 'wait' };
}
