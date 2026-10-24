import { describe, expect, it } from 'vitest';
import { feedbackMotifs, motifForStudent } from './feedbackMotifs';
import { paginateFeedback } from './printPagination';

describe('motivos independientes de la nota', () => {
  it('ofrece veinte imágenes locales distintas, ninguna con fondo obligatorio', () => {
    expect(feedbackMotifs).toHaveLength(20);
    expect(new Set(feedbackMotifs.map(item => item.src)).size).toBe(20);
    expect(feedbackMotifs.every(item => item.src.startsWith('/assets/feedback-motifs/') && item.src.endsWith('.png'))).toBe(true);
  });
  it('mantiene el motivo por estudiante y permite no decorar', () => {
    expect(motifForStudent('none', 'student-1')).toBeUndefined();
    expect(motifForStudent('mixed', 'student-1')).toEqual(motifForStudent('mixed', 'student-1'));
    expect(motifForStudent(feedbackMotifs[0].id, 'student-1')).toEqual(feedbackMotifs[0]);
    expect(motifForStudent('unknown', 'student-1')).toBeUndefined();
  });
  it('reserva la cabecera sin perder texto con o sin ilustración', () => {
    const entry = { id: 'g', estudiante: 'Estudiante con apellidos muy largos '.repeat(3), evaluacion: 'Evaluación de lectura', materia: 'Lenguaje', nota: '0', nota_maxima: '5', retroalimentacion: 'Explica una razón del texto. '.repeat(180) };
    for (const decorated of [false, true]) {
      const pages = paginateFeedback([entry], () => 8, decorated);
      expect(pages.flat().map(fragment => fragment.text).join('')).toBe(entry.retroalimentacion);
      expect(pages.every(page => page.reduce((sum, part) => sum + part.height, 0) <= 900)).toBe(true);
    }
  });
});
