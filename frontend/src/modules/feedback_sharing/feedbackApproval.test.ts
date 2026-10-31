import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApproval, readApproval, runApproval, storeApproval } from './feedbackApproval';
import type { FeedbackBatchResultItem, FeedbackPreview } from './api';

const message = 'Aciertos: identificaste al personaje. Siguiente paso: explica su decisión con una frase de la lectura.';
const candidate = { source_fingerprint: 'f'.repeat(64), nota: '3.5', feedback_text: message, scope: 'summary' as const, avisos: [] };
const previews: FeedbackPreview[] = [{ calificacion_id: 'g1', elegible: false, batch_candidate: candidate }];
const receipt = { id: 'batch1', request_id: '', total: 1, exitosos: 1, fallidos: 0,
  resultados: [{ calificacion_id: 'g1', estado: 'published' as const, fingerprint: 'a'.repeat(64) }] };
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('135 aprobación recuperable sin contenido privado en almacenamiento', () => {
  it('reutiliza las retroalimentaciones ya elegibles sin incluirlas en otra aprobación', async () => {
    const op = await createApproval('t', 'e', ['g1', 'active'], [...previews,
      { ...previews[0], calificacion_id: 'active', elegible: true, fingerprint: 'a'.repeat(64) }], 3, false);
    expect(op.parts.flatMap(part => part.selections.map(item => item.calificacion_id))).toEqual(['g1']);
    expect(op.readySelections).toEqual([{ calificacion_id: 'active', fingerprint: 'a'.repeat(64) }]);
  });
  it('congela destinatarios y opciones, sin nombres, notas, mensajes ni credenciales', async () => {
    const op = await createApproval('t', 'e', ['g1', 'already-ready'], previews, 7, true);
    storeApproval(sessionStorage, op);
    const raw = sessionStorage.getItem('feedback-approval:t:e')!;
    expect(raw).not.toMatch(/feedback_text|"nota"|retroalimentacion|url|token|identificaste/);
    expect(readApproval(sessionStorage, 't', 'e')).toEqual(op);
    expect(op.targetIds).toEqual(['g1', 'already-ready']);
    expect(op.days).toBe(7); expect(op.evidence).toBe(true);
    expect(op.parts[0].selections).toHaveLength(1);
  });

  it('guarda la intención antes de publicar y no vuelve a publicar una parte confirmada', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    const checkpoint = vi.fn(() => storeApproval(sessionStorage, op));
    const publish = vi.fn(async (_evaluation, body) => {
      expect(readApproval(sessionStorage, 't', 'e')?.parts[0].attempted).toBe(true);
      return { ...receipt, request_id: body.request_id };
    });
    const transport = { publish, read: vi.fn() };
    expect(await runApproval(op, previews, transport, checkpoint, () => true)).toEqual(receipt.resultados);
    await runApproval(op, previews, transport, checkpoint, () => true);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish.mock.calls[0][1].selecciones[0].feedback_text).toBe(message);
  });

  it('recupera una respuesta perdida con el mismo request_id antes de otra escritura', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    const publish = vi.fn().mockRejectedValue(new Error('response lost'));
    const read = vi.fn().mockResolvedValue({ ...receipt, request_id: op.parts[0].requestId });
    await runApproval(op, previews, { publish, read }, () => storeApproval(sessionStorage, op), () => true);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith('e', op.parts[0].requestId);
    expect(readApproval(sessionStorage, 't', 'e')?.parts[0].confirmed).toBe(true);
  });

  it('conserva la solicitud incierta tras reapertura y no sustituye su texto por otro', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    const publish = vi.fn().mockRejectedValue(new Error('lost'));
    const read = vi.fn().mockRejectedValue({ response: { status: 404 } });
    await expect(runApproval(op, previews, { publish, read }, () => storeApproval(sessionStorage, op), () => true)).rejects.toThrow();
    const recovered = readApproval(sessionStorage, 't', 'e')!;
    const changed = [{ ...previews[0], batch_candidate: { ...candidate, feedback_text: message + ' Otro texto.' } }];
    publish.mockClear();
    await expect(runApproval(recovered, changed, { publish, read }, vi.fn(), () => true)).rejects.toThrow();
    expect(publish).not.toHaveBeenCalled();
    expect(recovered.parts[0].requestId).toBe(op.parts[0].requestId);
  });

  it('rechaza recibos incompletos o de otra solicitud sin marcar aprobación', async () => {
    for (const invalid of [{ ...receipt, resultados: [] }, { ...receipt, request_id: 'other' }, { ...receipt, exitosos: 0 }]) {
      const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
      await expect(runApproval(op, previews, { publish: vi.fn().mockResolvedValue(invalid), read: vi.fn().mockRejectedValue(new Error()) }, vi.fn(), () => true)).rejects.toThrow();
      expect(op.parts[0].confirmed).toBe(false);
    }
  });

  it('no hace la petición si falla guardar la recuperación o cambian los permisos', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    const publish = vi.fn();
    await expect(runApproval(op, previews, { publish, read: vi.fn() }, () => { throw new Error('storage denied'); }, () => true)).rejects.toThrow();
    await expect(runApproval(op, previews, { publish, read: vi.fn() }, vi.fn(), () => false)).rejects.toThrow();
    expect(publish).not.toHaveBeenCalled();
  });

  it('particiona en25 y conserva los fallos por estudiante sin emitir accesos', async () => {
    const many = Array.from({ length: 26 }, (_, i) => ({ ...previews[0], calificacion_id: `g${i}` }));
    const op = await createApproval('t', 'e', many.map(p => p.calificacion_id), many, 3, false);
    expect(op.parts.map(p => p.selections.length)).toEqual([25, 1]);
    const publish = vi.fn(async (_evaluation: string, body: { request_id: string; selecciones: { calificacion_id: string }[] }) => {
      const results: FeedbackBatchResultItem[] = body.selecciones.map(s => ({ calificacion_id: s.calificacion_id, estado: s.calificacion_id === 'g0' ? 'failed' : 'published', fingerprint: s.calificacion_id === 'g0' ? undefined : 'a'.repeat(64) }));
      return { id: 'b', request_id: body.request_id, total: results.length, exitosos: results.filter(r => r.estado !== 'failed').length, fallidos: results.filter(r => r.estado === 'failed').length, resultados: results };
    });
    const results = await runApproval(op, many, { publish, read: vi.fn() }, vi.fn(), () => true);
    expect(results.filter(r => r.estado === 'failed')).toHaveLength(1);
    expect(results).toHaveLength(26); expect(publish).toHaveBeenCalledTimes(2);
  });

  it('rechaza metadata alterada y no expone otro contexto', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    storeApproval(sessionStorage, op);
    expect(readApproval(sessionStorage, 'other', 'e')).toBeNull();
    sessionStorage.setItem('feedback-approval:t:e', JSON.stringify({ ...op, token: 'private' }));
    expect(readApproval(sessionStorage, 't', 'e')).toBeNull();
  });

  it('rechaza una segunda ejecución concurrente sin publicar dos veces', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    let release!: (result: typeof receipt) => void;
    const publish = vi.fn(() => new Promise<typeof receipt>(resolve => { release = resolve; }));
    const first = runApproval(op, previews, { publish, read: vi.fn() }, vi.fn(), () => true);
    await expect(runApproval(op, previews, { publish, read: vi.fn() }, vi.fn(), () => true)).rejects.toThrow('already running');
    await vi.waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
    release({ ...receipt, request_id: op.parts[0].requestId });
    await first;
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('no consulta ni expone un recibo tardío después de perder el contexto', async () => {
    const op = await createApproval('t', 'e', ['g1'], previews, 3, false);
    let permitted = true;
    const publish = vi.fn(async () => { permitted = false; throw new Error('context changed'); });
    const read = vi.fn();
    await expect(runApproval(op, previews, { publish, read }, vi.fn(), () => permitted)).rejects.toThrow('context changed');
    expect(read).not.toHaveBeenCalled();
    expect(op.parts[0].confirmed).toBe(false);
  });
});
