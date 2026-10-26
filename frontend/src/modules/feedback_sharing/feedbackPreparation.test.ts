import { describe, expect, it } from 'vitest';
import { classifyAccesses, createManifest, readManifest, storeManifest, validateIssued } from './feedbackPreparation';
import type { FeedbackAccess } from './api';

const selection = { calificacion_id: 'g1', fingerprint: 'f'.repeat(64) };
describe('129 preparación privada y recuperable', () => {
  it('reutiliza activos, no considera cerrados o históricos como faltantes', () => {
    const accesses = [{ id: 'a', calificacion_id: 'g1', estado: 'active', copy_available: true }, { id: 'b', calificacion_id: 'g2', estado: 'expired' }, { id: 'c', calificacion_id: 'g3', estado: 'active', copy_available: false }] as FeedbackAccess[];
    expect(classifyAccesses('g1', accesses).kind).toBe('existing');
    expect(classifyAccesses('g2', accesses).kind).toBe('closed');
    expect(classifyAccesses('g3', accesses).kind).toBe('closed');
    expect(classifyAccesses('g4', accesses).kind).toBe('missing');
  });
  it('rechaza respuestas incompletas, duplicadas o con IDs ajenos', () => {
    expect(() => validateIssued([selection], [])).toThrow();
    expect(() => validateIssued([selection], [{ calificacion_id: 'g1' }, { calificacion_id: 'g1' }])).toThrow();
    expect(() => validateIssued([selection], [{ calificacion_id: 'otro' }])).toThrow();
    expect(() => validateIssued([selection], [{ calificacion_id: 'g1' }])).toThrow();
    expect(() => validateIssued([selection], [{ calificacion_id: 'g1', id: 'a' }])).not.toThrow();
  });
  it('recupera el mismo UUID y opciones sin almacenar contenido académico o credenciales', () => {
    const store = window.sessionStorage; store.clear();
    const manifest = createManifest('t', 'e', [selection], 3, false, 1000);
    storeManifest(store, manifest);
    const text = store.getItem('feedback-preparation:t:e')!;
    expect(text).not.toMatch(/url|token|nombre|nota|retroalimentacion/);
    expect(readManifest(store, 't', 'e', 2000)).toEqual(manifest);
    expect(readManifest(store, 'otro', 'e', 2000)).toBeNull();
    expect(readManifest(store, 't', 'e', 3601001)).toBeNull();
  });
  it('particiona 105 selecciones en 100/5 y descarta manifiestos alterados', () => {
    const manifest = createManifest('t', 'e', Array.from({ length: 105 }, (_, i) => ({ ...selection, calificacion_id: `g${i}` })), 3, false);
    expect(manifest.parts.map(part => part.selections.length)).toEqual([100, 5]);
    storeManifest(sessionStorage, manifest);
    sessionStorage.setItem('feedback-preparation:t:e', JSON.stringify({ ...manifest, evidencia: true, token: 'private' }));
    expect(readManifest(sessionStorage, 't', 'e')).toBeNull();
  });
});
