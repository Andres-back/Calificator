import { describe, expect, it } from 'vitest';
import type { FeedbackAccess, FeedbackPreview } from './api';
import { deriveDeliveryAvailability, type AccessRecovery } from './deliveryAvailability';

const now = Date.parse('2026-10-31T12:00:00Z');
const expiry = '2026-11-03T12:00:00Z';
const url = 'https://example.test/devolucion#synthetic-credential';
const preview: FeedbackPreview = { calificacion_id: 'grade-1', elegible: true, fingerprint: 'f'.repeat(64), preparacion: 'ready' };
const access: FeedbackAccess = {
  id: 'access-1', calificacion_id: 'grade-1', estudiante: 'Estudiante sintético', estado: 'active', version: 1,
  expires_at: expiry, fingerprint: preview.fingerprint!, copy_available: true,
};
const recovered: AccessRecovery = {
  status: 'ready', result: { id: access.id, calificacion_id: access.calificacion_id, estudiante: access.estudiante, url, expires_at: expiry },
};
const derive = (overrides: Partial<Parameters<typeof deriveDeliveryAvailability>[0]> = {}) => deriveDeliveryAvailability({
  gradeId: 'grade-1', preview, query: { status: 'loaded', accesses: [access] }, recoveries: { [access.id]: recovered }, now, ...overrides,
});

describe('Spec139 disponibilidad de entrega sin escrituras', () => {
  it.each(['loading', 'error'] as const)('no confunde consulta %s con ausencia ni expone una URL anterior', status => {
    const result = derive({ query: { status, accesses: [] } });
    expect(result.kind).toBe(status === 'error' ? 'query_error' : 'loading');
    expect(result.action).not.toBe('generate');
    expect(result).not.toHaveProperty('url');
  });

  it('solo permite generar tras ausencia confirmada y contenido apto', () => {
    expect(derive({ query: { status: 'loaded', accesses: [] } })).toMatchObject({ kind: 'ready_to_generate', action: 'generate', requiresApproval: false });
    expect(derive({ query: { status: 'loaded', accesses: [] }, preview: undefined })).toMatchObject({ kind: 'needs_review', action: 'review' });
    expect(derive({ query: { status: 'loaded', accesses: [] }, preview: { ...preview, elegible: false, preparacion: 'no_grade' } }).kind).toBe('needs_review');
    expect(derive({ query: { status: 'loaded', accesses: [] }, preview: { ...preview, fingerprint: undefined } }).kind).toBe('needs_review');
  });

  it('distingue el candidato pendiente que exige aprobación académica explícita', () => {
    const candidate: FeedbackPreview = {
      calificacion_id: 'grade-1', elegible: false, preparacion: 'needs_review',
      batch_candidate: { source_fingerprint: 'a'.repeat(64), nota: '4.0', feedback_text: 'Mensaje sintético revisable', scope: 'summary', avisos: [] },
    };
    expect(derive({ query: { status: 'loaded', accesses: [] }, preview: candidate })).toMatchObject({ kind: 'ready_to_generate', requiresApproval: true });
    expect(derive({ query: { status: 'loaded', accesses: [] }, preview: { ...candidate, preparacion: 'no_grade' } })).toMatchObject({ kind: 'ready_to_generate', requiresApproval: true });
  });

  it('un enlace publicado no basta: espera la recuperación autorizada', () => {
    expect(derive({ recoveries: {} })).toMatchObject({ kind: 'loading', selectedAccess: access });
    expect(derive({ recoveries: { [access.id]: { status: 'idle' } } }).kind).toBe('loading');
    expect(derive({ recoveries: { [access.id]: { status: 'loading' } } }).kind).toBe('loading');
    expect(derive()).toMatchObject({ kind: 'available', action: 'copy', url, selectedAccess: access });
  });

  it('active con copy_available=false requiere atención, nunca se trata como cerrado o faltante', () => {
    const result = derive({ query: { status: 'loaded', accesses: [{ ...access, copy_available: false }] }, recoveries: {} });
    expect(result).toMatchObject({ kind: 'attention', cause: 'legacy_unrecoverable', action: 'replace' });
    expect(result).not.toHaveProperty('url');
  });

  it('copy_available=true o ausente no acredita una copia recuperada', () => {
    for (const copy_available of [true, undefined]) {
      expect(derive({ query: { status: 'loaded', accesses: [{ ...access, copy_available }] }, recoveries: {} }).kind).toBe('loading');
    }
  });

  it('no elige el primer enlace de varios vigentes y permite elección explícita', () => {
    const other = { ...access, id: 'access-2' };
    const query = { status: 'loaded' as const, accesses: [other, access] };
    const multiple = derive({ query });
    expect(multiple).toMatchObject({ kind: 'attention', cause: 'multiple', action: 'choose' });
    expect(multiple).not.toHaveProperty('selectedAccess');
    expect(multiple).not.toHaveProperty('url');
    expect(derive({ query, selectedAccessId: access.id })).toMatchObject({ kind: 'available', url, selectedAccess: access });
    expect(derive({ query, selectedAccessId: 'missing' })).toMatchObject({ kind: 'attention', cause: 'invalid_selection', action: 'choose' });
  });

  it('no cuenta como candidato un acceso de otra calificación ni un histórico vencido', () => {
    const query = { status: 'loaded' as const, accesses: [{ ...access, id: 'other-grade', calificacion_id: 'grade-2' }, { ...access, id: 'old', estado: 'expired' as const }, access] };
    const result = derive({ query });
    expect(result).toMatchObject({ kind: 'available', url });
    expect(result.accesses.map(item => item.id)).toEqual(['old', access.id]);
    expect(result.candidates.map(item => item.id)).toEqual([access.id]);
  });

  it.each([
    ['expired', 'expired', 'manage'], ['disabled', 'disabled', 'manage'], ['suspended', 'needs_resend', 'review'],
  ] as const)('el estado %s invalida una copia anterior', (estado, kind, action) => {
    const result = derive({ query: { status: 'loaded', accesses: [{ ...access, estado }] } });
    expect(result).toMatchObject({ kind, action });
    expect(result).not.toHaveProperty('url');
  });

  it('el vencimiento real prevalece sobre active o suspended y no amplía su fecha', () => {
    for (const estado of ['active', 'suspended'] as const) {
      const result = derive({ query: { status: 'loaded', accesses: [{ ...access, estado, expires_at: '2026-10-31T12:00:00Z' }] } });
      expect(result.kind).toBe('expired');
      expect(result).not.toHaveProperty('url');
    }
  });

  it.each([
    ['expired', 'expired', 'manage'], ['disabled', 'disabled', 'manage'], ['revoked', 'disabled', 'manage'],
    ['suspended', 'needs_resend', 'review'], ['legacy_unrecoverable', 'attention', 'replace'], ['unavailable', 'attention', 'retry_recovery'],
  ] as const)('conserva el código de recuperación %s y bloquea copia/generación', (code, kind, action) => {
    const result = derive({ recoveries: { [access.id]: { status: 'unavailable', code, error: 'Detalle sintético' } } });
    expect(result).toMatchObject({ kind, action, code, error: 'Detalle sintético' });
    expect(result).not.toHaveProperty('url');
  });

  it('distingue fallo de recuperación de ausencia y conserva un código desconocido', () => {
    expect(derive({ recoveries: { [access.id]: { status: 'error', code: 'private_copy_failed', error: 'No se recuperó' } } })).toMatchObject({
      kind: 'attention', cause: 'recovery_error', action: 'retry_recovery', code: 'private_copy_failed', error: 'No se recuperó',
    });
    expect(derive({ query: { status: 'error', code: 'forbidden', error: 'Permiso revocado' } })).toMatchObject({ kind: 'query_error', code: 'forbidden', error: 'Permiso revocado' });
  });

  it.each([
    { id: 'another-access' }, { calificacion_id: 'grade-2' }, { url: undefined }, { error: 'Denied' },
    { expires_at: '2026-11-04T12:00:00Z' }, { expires_at: undefined }, { url: 'javascript:alert(1)' }, { url: `${url}\nInjected` },
  ])('rechaza copia ajena, incompleta, no autorizada u obsoleta (%j)', change => {
    if (recovered.status !== 'ready') throw new Error('Fixture inválido');
    const result = derive({ recoveries: { [access.id]: { status: 'ready', result: { ...recovered.result, ...change } } } });
    expect(result).toMatchObject({ kind: 'attention', cause: 'invalid_response' });
    expect(result).not.toHaveProperty('url');
  });

  it('una fecha inválida no significa ausencia y una selección cerrada nunca reaparece activa', () => {
    expect(derive({ query: { status: 'loaded', accesses: [{ ...access, expires_at: 'invalid' }] } })).toMatchObject({ kind: 'attention', cause: 'invalid_response' });
    const old = { ...access, id: 'disabled-access', estado: 'disabled' as const };
    expect(derive({ query: { status: 'loaded', accesses: [access, old] }, selectedAccessId: old.id })).toMatchObject({ kind: 'disabled', selectedAccess: old });
  });

  it('no escoge en silencio entre estados cerrados distintos y no muta entradas', () => {
    const accesses = Object.freeze([Object.freeze({ ...access, estado: 'expired' as const }), Object.freeze({ ...access, id: 'disabled', estado: 'disabled' as const })]);
    const result = derive({ query: { status: 'loaded', accesses } });
    expect(result).toMatchObject({ kind: 'attention', cause: 'multiple_closed', action: 'manage' });
    expect(result).not.toHaveProperty('selectedAccess');
    expect(accesses[0].estado).toBe('expired');
  });
});
