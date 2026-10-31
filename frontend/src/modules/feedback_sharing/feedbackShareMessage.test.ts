import { describe, expect, it, vi } from 'vitest';
import { buildIndividualFeedbackMessage, buildPrivateFeedbackList, buildWhatsAppShareUrl, shareFeedbackMessage } from './feedbackShareMessage';

const url = 'https://example.test/devolucion#synthetic_token?x=1&y=2';
const message = `Hola. Esta es la retroalimentación de Lucía Sintética en Evaluación sintética: ${url}`;

describe('Spec139 mensajes individuales y lista privada', () => {
  it('incluye únicamente nombre, evaluación y URL íntegra sin nota ni texto académico', () => {
    expect(buildIndividualFeedbackMessage({ studentName: 'Lucía Sintética', evaluationName: 'Evaluación sintética', url })).toBe(message);
    const extra = { studentName: 'Lucía Sintética', evaluationName: 'Evaluación sintética', url, grade: '4.8', feedback: 'Privado: respuesta académica' };
    expect(buildIndividualFeedbackMessage(extra)).not.toMatch(/4\.8|Privado|respuesta académica/);
  });

  it('normaliza nombres/evaluaciones multilínea sin alterar el fragmento de la URL', () => {
    expect(buildIndividualFeedbackMessage({ studentName: '  Lucía\r\n Sintética ', evaluationName: ' Evaluación\t sintética ', url })).toBe(message);
  });

  it('la lista contiene una sola línea por destinatario confirmado y excluye fallos', () => {
    const text = buildPrivateFeedbackList([
      { studentName: 'Lucía\nSintética', url, confirmed: true },
      { studentName: 'No confirmado', url: '', confirmed: false },
      { studentName: 'Andrés Sintético', url: 'https://example.test/devolucion#other_synthetic', confirmed: true },
    ]);
    expect(text).toBe(`Lucía Sintética: ${url}\nAndrés Sintético: https://example.test/devolucion#other_synthetic`);
    expect(text.split('\n')).toHaveLength(2);
    expect(text).not.toContain('No confirmado');
    expect(buildPrivateFeedbackList([])).toBe('');
  });

  it.each(['', 'javascript:alert(1)', 'https://example.test/a\nsecond-line', 'https://example.test/a b'])('rechaza URL inválida sin inventar un enlace (%j)', invalid => {
    expect(() => buildIndividualFeedbackMessage({ studentName: 'Sintético', evaluationName: 'Sintética', url: invalid })).toThrow();
    expect(() => buildPrivateFeedbackList([{ studentName: 'Sintético', url: invalid, confirmed: true }])).toThrow();
  });

  it('rechaza nombres/evaluaciones vacíos en vez de fabricar identidad', () => {
    expect(() => buildIndividualFeedbackMessage({ studentName: ' ', evaluationName: 'Sintética', url })).toThrow();
    expect(() => buildIndividualFeedbackMessage({ studentName: 'Sintético', evaluationName: '\n', url })).toThrow();
    expect(() => buildPrivateFeedbackList([{ studentName: ' ', url, confirmed: true }])).toThrow();
  });

  it('codifica el mensaje completo para WhatsApp, sin destinatario ni contactos', () => {
    const whatsapp = new URL(buildWhatsAppShareUrl(message));
    expect(whatsapp.origin + whatsapp.pathname).toBe('https://wa.me/');
    expect([...whatsapp.searchParams.keys()]).toEqual(['text']);
    expect(whatsapp.searchParams.get('text')).toBe(message);
    expect(whatsapp.hash).toBe('');
    expect(buildWhatsAppShareUrl(message)).toContain('%23synthetic_token%3Fx%3D1%26y%3D2');
  });
});

describe('Spec139 compartir nativo sin acreditar entrega', () => {
  it('detecta falta de soporte al usar y no intenta compartir', async () => {
    expect(await shareFeedbackMessage(message, {})).toEqual({ status: 'unsupported' });
  });

  it('usa solo el mensaje individual y conserva el binding del navegador', async () => {
    const native = { share: vi.fn(async function (this: unknown, _data: { text: string }) { expect(this).toBe(native); }) };
    const result = await shareFeedbackMessage(message, native);
    expect(native.share).toHaveBeenCalledExactlyOnceWith({ text: message });
    expect(result).toEqual({ status: 'completed' });
    expect(result).not.toHaveProperty('sent');
    expect(result).not.toHaveProperty('delivered');
  });

  it.each([new DOMException('Cancelado', 'AbortError'), { name: 'AbortError' }])('cancelar no es error de entrega ni éxito (%j)', async error => {
    const native = { share: vi.fn().mockRejectedValue(error) };
    expect(await shareFeedbackMessage(message, native)).toEqual({ status: 'cancelled' });
  });

  it('conserva errores reales sin afirmar envío ni ocultarlos como cancelación', async () => {
    const error = new DOMException('No permitido', 'NotAllowedError');
    expect(await shareFeedbackMessage(message, { share: vi.fn().mockRejectedValue(error) })).toEqual({ status: 'error', error });
  });
});
