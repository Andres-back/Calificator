import { describe, expect, it } from 'vitest';
import { feedbackSections, feedbackPrintText } from './feedbackSections';

describe('presentación conservadora de retroalimentación', () => {
  it('agrupa títulos explícitos sin inventar mensajes ni perder el original', () => {
    const text = 'Aciertos: Identificaste a Nico.\nQué mejorar: Explica su emoción.\nSiguiente paso: Relee el segundo párrafo.';
    const sections = feedbackSections(text);
    expect(sections.map(section => section.title)).toEqual(['Aciertos', 'Qué mejorar', 'Siguiente paso']);
    expect(sections.map(section => section.original).join('')).toBe(text);
    expect(feedbackPrintText(text)).toContain('Relee el segundo párrafo.');
  });
  it('no deduce categorías para texto no estructurado', () => {
    const text = 'Tu explicación compara dos ideas; vuelve al texto para encontrar una razón.';
    expect(feedbackSections(text)).toEqual([{ title: 'Retroalimentación', text, original: text }]);
  });
  it('separa preguntas y sus pasos sin duplicar ni cambiar su orden', () => {
    const text = 'Lograste 4 de 8 respuestas. Pregunta 2: Falta explicar el motivo. Siguiente paso: Busca una razón. Pregunta 3: Identificaste al personaje.';
    const sections = feedbackSections(text);
    expect(sections.map(section => section.original).join('')).toBe(text);
    expect(sections.map(section => section.title)).toEqual(['Retroalimentación', 'Pregunta 2', 'Siguiente paso', 'Pregunta 3']);
  });
  it('conserva texto largo, saltos y palabras sin interpretar HTML', () => {
    const text = 'á\n<script>no ejecutar</script> '.repeat(210);
    expect(feedbackSections(text).map(section => section.original).join('')).toBe(text);
    expect(feedbackPrintText(text)).toBe(text);
  });
});
