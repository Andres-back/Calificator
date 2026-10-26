import type { FeedbackAccess, FeedbackSelection, IssuedFeedbackAccess } from './api';

export interface PreparationPart {
  requestId: string;
  selections: FeedbackSelection[];
  confirmed: boolean;
  accesses: { gradeId: string; accessId: string }[];
}
export interface PreparationManifest {
  schema: 1; actorId: string; evaluationId: string; createdAt: number; expiresAt: number;
  days: number; evidence: boolean; parts: PreparationPart[];
}
const prefix = 'feedback-preparation:';
const key = (actor: string, evaluation: string) => `${prefix}${actor}:${evaluation}`;
export function classifyAccesses(gradeId: string, accesses: FeedbackAccess[]) {
  const saved = accesses.filter(item => item.calificacion_id === gradeId);
  const active = saved.filter(item => item.estado === 'active' && item.copy_available !== false);
  return { kind: active.length ? 'existing' : saved.length ? 'closed' : 'missing', accesses: saved, active } as const;
}
export function createManifest(actorId: string, evaluationId: string, selections: FeedbackSelection[], days: number, evidence: boolean, now = Date.now()): PreparationManifest {
  const parts: PreparationPart[] = [];
  for (let offset = 0; offset < selections.length; offset += 100) parts.push({ requestId: crypto.randomUUID(), selections: selections.slice(offset, offset + 100).map(item => ({ ...item })), confirmed: false, accesses: [] });
  return { schema: 1, actorId, evaluationId, createdAt: now, expiresAt: now + 3600000, days, evidence, parts };
}
export function storeManifest(storage: Storage, manifest: PreparationManifest) {
  storage.setItem(key(manifest.actorId, manifest.evaluationId), JSON.stringify(manifest));
}
export function clearManifest(storage: Storage, actorId: string, evaluationId: string) { storage.removeItem(key(actorId, evaluationId)); }
export function clearPreparations(storage: Storage) {
  for (let index = storage.length - 1; index >= 0; index--) { const name = storage.key(index); if (name?.startsWith(prefix)) storage.removeItem(name); }
}
function hasKeys(value: object, keys: string[]) { return Object.keys(value).sort().join('|') === [...keys].sort().join('|'); }
export function readManifest(storage: Storage, actor: string, evaluation: string, now = Date.now()): PreparationManifest | null {
  try {
    const raw = storage.getItem(key(actor, evaluation));
    if (!raw) return null;
    const value: PreparationManifest = JSON.parse(raw);
    if (!value || !hasKeys(value, ['schema', 'actorId', 'evaluationId', 'createdAt', 'expiresAt', 'days', 'evidence', 'parts']) || value.schema !== 1 || value.actorId !== actor || value.evaluationId !== evaluation
      || !Number.isFinite(value.createdAt) || value.createdAt > now || value.expiresAt !== value.createdAt + 3600000 || value.expiresAt <= now
      || !Number.isInteger(value.days) || value.days < 1 || value.days > 30 || typeof value.evidence !== 'boolean' || !Array.isArray(value.parts) || !value.parts.length || value.parts.length > 100) throw new Error('Invalid preparation');
    const ids = new Set<string>(); const requests = new Set<string>();
    for (const part of value.parts) {
      if (!hasKeys(part, ['requestId', 'selections', 'confirmed', 'accesses']) || typeof part.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(part.requestId) || requests.has(part.requestId) || typeof part.confirmed !== 'boolean'
        || !Array.isArray(part.selections) || !part.selections.length || part.selections.length > 100 || !Array.isArray(part.accesses)) throw new Error('Invalid part');
      requests.add(part.requestId);
      for (const selection of part.selections) {
        if (!hasKeys(selection, ['calificacion_id', 'fingerprint']) || typeof selection.calificacion_id !== 'string' || !selection.calificacion_id || ids.has(selection.calificacion_id) || !/^[a-f0-9]{64}$/i.test(selection.fingerprint)) throw new Error('Invalid selection');
        ids.add(selection.calificacion_id);
      }
      if (part.accesses.some(item => !hasKeys(item, ['gradeId', 'accessId']) || !part.selections.some(selection => selection.calificacion_id === item.gradeId) || typeof item.accessId !== 'string' || !item.accessId)) throw new Error('Invalid access');
      if (new Set(part.accesses.map(item => item.gradeId)).size !== part.accesses.length) throw new Error('Duplicate access');
    }
    return value;
  } catch { storage.removeItem(key(actor, evaluation)); return null; }
}
export function validateIssued(selections: FeedbackSelection[], results: IssuedFeedbackAccess[]) {
  if (results.length !== selections.length || selections.some(item => results.filter(result => result.calificacion_id === item.calificacion_id).length !== 1) || results.some(result => !result.error && !result.id)) throw new Error('Incomplete result');
}
