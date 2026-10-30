import { describe, expect, it } from 'vitest';
import { feedbackSections, feedbackPrintText, feedbackLearningBlocks } from './feedbackSections';

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
  it('135 mantiene cada paso junto a la pregunta que lo necesita, sin reordenar ni perder texto', () => {
    const text = 'Lograste 6 de 9 respuestas. Pregunta 5: Confundiste el propósito del viaje. Siguiente paso: Compara las dos opciones con la lectura. Pregunta 8: Tu razón necesita un ejemplo. Siguiente paso: Añade un ejemplo del párrafo final.';
    const blocks = feedbackLearningBlocks(text);
    expect(blocks.map(block => block.original).join('')).toBe(text);
    expect(blocks.map(block => block.title)).toEqual(['Retroalimentación', 'Pregunta 5', 'Pregunta 8']);
    expect(blocks[1].steps).toEqual(['Compara las dos opciones con la lectura.']);
    expect(blocks[2].steps).toEqual(['Añade un ejemplo del párrafo final.']);
    expect(feedbackPrintText(text)).toContain('Añade un ejemplo del párrafo final.');
  });
  it('135 no añade logros, errores o prácticas cuando no están documentados', () => {
    const text = 'No se distingue la última respuesta. Consulta la foto con tu docente.';
    expect(feedbackLearningBlocks(text)).toEqual([{ title: 'Retroalimentación', text, original: text, kind: 'summary', steps: [] }]);
    const positiveQuestion = feedbackLearningBlocks('Pregunta 3: Identificaste al personaje.');
    expect(positiveQuestion[0].kind).toBe('question');
    expect(positiveQuestion[0].title).toBe('Pregunta 3');
  });
});
