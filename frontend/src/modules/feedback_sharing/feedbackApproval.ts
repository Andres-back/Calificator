import type { FeedbackBatchResult, FeedbackBatchResultItem, FeedbackBatchSelection, FeedbackPreview } from './api';

interface ApprovalSelection { calificacion_id: string; source_fingerprint: string; contentHash: string; scope: 'summary' | 'detail' }
interface ApprovalPart { requestId: string; selections: ApprovalSelection[]; attempted: boolean; confirmed: boolean; results: FeedbackBatchResultItem[] }
export interface ApprovalManifest {
  schema: 1; actorId: string; evaluationId: string; createdAt: number; expiresAt: number;
  targetIds: string[]; readySelections: { calificacion_id: string; fingerprint: string }[];
  days: number; evidence: boolean; parts: ApprovalPart[];
}
interface Transport {
  publish: (evaluation: string, body: { request_id: string; selecciones: FeedbackBatchSelection[] }) => Promise<FeedbackBatchResult>;
  read: (evaluation: string, requestId: string) => Promise<FeedbackBatchResult>;
}
const prefix = 'feedback-approval:';
const key = (actor: string, evaluation: string) => `${prefix}${actor}:${evaluation}`;
const hashPattern = /^[a-f0-9]{64}$/i;
const requests = /^[a-f0-9-]{36}$/i;
const running = new WeakSet<ApprovalManifest>();
const knownKeys = (value: object, allowed: string[]) => Object.keys(value).every(name => allowed.includes(name));

async function contentHash(preview: FeedbackPreview) {
  const candidate = preview.batch_candidate!;
  const bytes = new TextEncoder().encode(JSON.stringify([candidate.nota, candidate.feedback_text, candidate.scope]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createApproval(actorId: string, evaluationId: string, targetIds: string[], previews: FeedbackPreview[], days: number, evidence: boolean): Promise<ApprovalManifest> {
  if (!targetIds.length || new Set(targetIds).size !== targetIds.length || !Number.isInteger(days) || days < 1 || days > 30) throw new Error('Invalid approval intent');
  const candidates = previews.filter(item => targetIds.includes(item.calificacion_id) && !item.elegible && item.batch_candidate);
  if (new Set(candidates.map(item => item.calificacion_id)).size !== candidates.length) throw new Error('Duplicate approval target');
  const selections = await Promise.all(candidates.map(async preview => ({ calificacion_id: preview.calificacion_id,
    source_fingerprint: preview.batch_candidate!.source_fingerprint, contentHash: await contentHash(preview), scope: preview.batch_candidate!.scope })));
  const parts: ApprovalPart[] = [];
  for (let offset = 0; offset < selections.length; offset += 25) parts.push({ requestId: crypto.randomUUID(), selections: selections.slice(offset, offset + 25), attempted: false, confirmed: false, results: [] });
  const createdAt = Date.now();
  const readySelections = previews.filter(item => targetIds.includes(item.calificacion_id) && item.elegible && item.fingerprint)
    .map(item => ({ calificacion_id: item.calificacion_id, fingerprint: item.fingerprint! }));
  return { schema: 1, actorId, evaluationId, createdAt, expiresAt: createdAt + 3600000, targetIds: [...targetIds], readySelections, days, evidence, parts };
}

export function storeApproval(storage: Storage, operation: ApprovalManifest) {
  storage.setItem(key(operation.actorId, operation.evaluationId), JSON.stringify(operation));
}
export function clearApproval(storage: Storage, actor: string, evaluation: string) { storage.removeItem(key(actor, evaluation)); }
export function readApproval(storage: Storage, actor: string, evaluation: string, now = Date.now()): ApprovalManifest | null {
  try {
    const raw = storage.getItem(key(actor, evaluation));
    if (!raw) return null;
    const op: ApprovalManifest = JSON.parse(raw);
    if (!op || !knownKeys(op, ['schema', 'actorId', 'evaluationId', 'createdAt', 'expiresAt', 'targetIds', 'readySelections', 'days', 'evidence', 'parts'])
      || op.schema !== 1 || op.actorId !== actor || op.evaluationId !== evaluation
      || !Number.isFinite(op.createdAt) || op.createdAt > now || op.expiresAt !== op.createdAt + 3600000 || op.expiresAt <= now
      || !Number.isInteger(op.days) || op.days < 1 || op.days > 30 || typeof op.evidence !== 'boolean'
      || !Array.isArray(op.targetIds) || !op.targetIds.length || op.targetIds.length > 10000 || op.targetIds.some(id => typeof id !== 'string' || !id)
      || new Set(op.targetIds).size !== op.targetIds.length || !Array.isArray(op.parts) || op.parts.length > 400
      || !Array.isArray(op.readySelections) || new Set(op.readySelections.map(item => item.calificacion_id)).size !== op.readySelections.length
      || op.readySelections.some(item => !knownKeys(item, ['calificacion_id', 'fingerprint']) || !op.targetIds.includes(item.calificacion_id) || !hashPattern.test(item.fingerprint))) throw new Error('Invalid approval metadata');
    const ids = new Set<string>(); const seenRequests = new Set<string>();
    for (const part of op.parts) {
      if (!part || !knownKeys(part, ['requestId', 'selections', 'attempted', 'confirmed', 'results']) || !requests.test(part.requestId)
        || seenRequests.has(part.requestId) || typeof part.attempted !== 'boolean' || typeof part.confirmed !== 'boolean'
        || (part.confirmed && !part.attempted) || !Array.isArray(part.selections) || !part.selections.length || part.selections.length > 25
        || !Array.isArray(part.results)) throw new Error('Invalid approval part');
      seenRequests.add(part.requestId);
      for (const selection of part.selections) {
        if (!selection || !knownKeys(selection, ['calificacion_id', 'source_fingerprint', 'contentHash', 'scope'])
          || !op.targetIds.includes(selection.calificacion_id) || ids.has(selection.calificacion_id)
          || !hashPattern.test(selection.source_fingerprint) || !hashPattern.test(selection.contentHash)
          || !['summary', 'detail'].includes(selection.scope)) throw new Error('Invalid approval selection');
        ids.add(selection.calificacion_id);
      }
      if (part.confirmed) validateResults(part, part.results);
      else if (part.results.length) throw new Error('Unconfirmed approval results');
      if (part.results.some(result => !knownKeys(result, ['calificacion_id', 'estado', 'fingerprint', 'code']))) throw new Error('Unexpected private approval content');
    }
    return op;
  } catch { storage.removeItem(key(actor, evaluation)); return null; }
}

function validateResults(part: ApprovalPart, results: FeedbackBatchResultItem[]) {
  if (results.length !== part.selections.length || part.selections.some(selection => results.filter(result => result.calificacion_id === selection.calificacion_id).length !== 1)
    || results.some(result => !['published', 'already_published', 'failed'].includes(result.estado)
      || (result.estado !== 'failed' && !hashPattern.test(result.fingerprint ?? '')))) throw new Error('Incomplete approval receipt');
}
function validateReceipt(part: ApprovalPart, receipt: FeedbackBatchResult) {
  if (!receipt || receipt.request_id !== part.requestId || receipt.total !== part.selections.length || !Array.isArray(receipt.resultados)) throw new Error('Wrong approval receipt');
  validateResults(part, receipt.resultados);
  const successes = receipt.resultados.filter(item => item.estado !== 'failed').length;
  if (receipt.exitosos !== successes || receipt.fallidos !== receipt.total - successes) throw new Error('Wrong approval totals');
  return receipt;
}

export async function runApproval(op: ApprovalManifest, previews: FeedbackPreview[], transport: Transport, checkpoint: () => void, current: () => boolean) {
  if (running.has(op)) throw new Error('Approval already running');
  running.add(op);
  const requireCurrent = () => { if (!current() || op.expiresAt <= Date.now()) throw new Error('Approval context changed'); };
  try {
    for (const part of op.parts) {
      requireCurrent();
      if (part.confirmed) continue;
      let receipt: FeedbackBatchResult | undefined;
      if (part.attempted) {
        try { receipt = validateReceipt(part, await transport.read(op.evaluationId, part.requestId)); }
        catch (error) {
          // Network/server errors or a malformed receipt are not proof of rollback.
          if ((error as { response?: { status?: number } })?.response?.status !== 404) throw error;
        }
      }
      if (!receipt) {
        const selections: FeedbackBatchSelection[] = [];
        for (const saved of part.selections) {
          const preview = previews.find(item => item.calificacion_id === saved.calificacion_id);
          if (!preview?.batch_candidate || preview.batch_candidate.source_fingerprint !== saved.source_fingerprint
            || preview.batch_candidate.scope !== saved.scope || await contentHash(preview) !== saved.contentHash) throw new Error('The approved source changed; recover its receipt first');
          selections.push({ calificacion_id: saved.calificacion_id, source_fingerprint: saved.source_fingerprint,
            feedback_text: preview.batch_candidate.feedback_text, scope: saved.scope });
        }
        requireCurrent(); part.attempted = true; checkpoint();
        try { receipt = validateReceipt(part, await transport.publish(op.evaluationId, { request_id: part.requestId, selecciones: selections })); }
        catch { requireCurrent(); receipt = validateReceipt(part, await transport.read(op.evaluationId, part.requestId)); }
      }
      requireCurrent();
      part.results = receipt.resultados.map(result => ({ calificacion_id: result.calificacion_id, estado: result.estado,
        ...(result.fingerprint ? { fingerprint: result.fingerprint } : {}), ...(result.code ? { code: result.code } : {}) }));
      part.confirmed = true; checkpoint();
    }
    requireCurrent();
    return op.parts.flatMap(part => part.results);
  } finally { running.delete(op); }
}
