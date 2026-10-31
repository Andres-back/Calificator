import { describe, expect, it, vi } from 'vitest';
import { paginateFeedback } from './printPagination';
import { feedbackPrintText } from './feedbackSections';

describe('fichas completas y recortables', () => {
  it('conserva mensajes, ceros y continuaciones cuando hay decoración', () => {
    const entry = { id: 'a', estudiante: 'Nombre largo del estudiante', evaluacion: 'Lectura', materia: 'Lenguaje', nota: '0', nota_maxima: '5', retroalimentacion: 'Explica con tus palabras la razón del personaje. '.repeat(700) };
    const pages = paginateFeedback([entry], () => 8, true);
    expect(pages.flat().map(item => item.text).join('')).toBe(entry.retroalimentacion);
    expect(pages.flat().every(item => item.nota === '0' && item.estudiante === entry.estudiante)).toBe(true);
    expect(pages.every(page => page.reduce((sum, item) => sum + item.height, 0) <= 900)).toBe(true);
  });
  it('conserva todos los caracteres de 30 retroalimentaciones y sus identidades', () => {
    const entries = Array.from({ length: 30 }, (_, index) => ({ id: String(index), estudiante: `Alumno Pérez ${index}`, evaluacion: 'Lectura', materia: 'Lenguaje', nota: '3.5', nota_maxima: '5', retroalimentacion: ('En la pregunta 2 relee el párrafo.\n\n' + 'x'.repeat(180) + ' ').repeat(index % 3 ? 1 : 12) }));
    const pages = paginateFeedback(entries, () => 8);
    for (const entry of entries) {
      const chunks = pages.flat().filter(item => item.id === entry.id);
      expect(chunks.map(item => item.text).join('')).toBe(entry.retroalimentacion);
      expect(chunks.every(item => item.estudiante === entry.estudiante)).toBe(true);
      expect(chunks.map(item => item.continuation)).toEqual(chunks.map((_, index) => index + 1));
    }
    expect(pages.every(page => page.reduce((total, item) => total + item.height, 0) <= 900)).toBe(true);
  });
  it('admite cero real, saltos y palabras muy largas sin truncar', () => {
    const feedback = '\n' + 'Á'.repeat(5000) + '\nFinal.';
    const pages = paginateFeedback([{ id: 'g', estudiante: 'A', evaluacion: 'E', materia: 'M', nota: '0', nota_maxima: '5', retroalimentacion: feedback }], () => 10);
    expect(pages.flat().map(item => item.text).join('')).toBe(feedback);
    expect(pages.flat().every(item => item.nota === '0')).toBe(true);
  });
  it('pagina 30 mensajes ordenados conservando su texto y continuaciones', () => {
    const original = ('Aciertos: identificaste el tema. Qué mejorar: explica una razón. Siguiente paso: vuelve al segundo párrafo.\n').repeat(60);
    const entries = Array.from({ length: 30 }, (_, index) => ({ id: String(index), estudiante: `Estudiante ${index}`, evaluacion: 'Lectura', materia: 'Lenguaje', nota: '3', nota_maxima: '5', retroalimentacion: feedbackPrintText(index === 0 ? original : 'Siguiente paso: escribe una razón del texto.') }));
    const fragments = paginateFeedback(entries, () => 8).flat();
    for (const entry of entries) {
      expect(fragments.filter(part => part.id === entry.id).map(part => part.text).join('')).toBe(entry.retroalimentacion);
    }
    expect(entries[0].retroalimentacion.replace(/\s+/g, ' ').trim()).toBe(original.replace(/\s+/g, ' ').trim());
    expect(fragments.filter(part => part.id === '0').length).toBeGreaterThan(1);
  });
  it('mide cada carácter distinto una sola vez para evitar trabajo repetido', () => {
    const measure = vi.fn(() => 8);
    const entry = { id: '1', estudiante: 'Ana', evaluacion: 'Lectura', materia: 'Lenguaje', nota: '3', nota_maxima: '5', retroalimentacion: 'Explica una razón. '.repeat(250) };
    const pages = paginateFeedback([entry], measure);
    expect(pages.flat().map(part => part.text).join('')).toBe(entry.retroalimentacion);
    expect(measure.mock.calls.length).toBe(new Set('Continuación de ' + entry.estudiante + entry.evaluacion + ' · ' + entry.materia + entry.retroalimentacion).size);
  });
});
