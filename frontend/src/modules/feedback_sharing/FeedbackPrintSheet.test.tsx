import { describe, expect, it } from 'vitest';
import { paginateFeedback } from './printPagination';

describe('fichas completas y recortables', () => {
  it('conserva todos los caracteres de 30 devoluciones y sus identidades', () => {
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
});
