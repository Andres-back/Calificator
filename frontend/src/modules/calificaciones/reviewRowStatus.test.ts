import { describe, expect, it } from 'vitest';
import { reviewRowStatus } from './gradePresentation';

describe('174 estado legible en la lista de revisión', () => {
  it.each([
    ['sin_entrega', 'Sin entrega', 'neutral'],
    ['requiere_revision', 'Requiere revisión', 'attention'],
    ['procesando', 'Calificando', 'progress'],
    ['sugerida', 'Nota sugerida', 'suggested'],
    ['confirmada', 'Confirmada', 'done'],
    ['ajustada', 'Ajustada', 'done'],
    ['publicada', 'Publicada', 'published'],
    ['anulada', 'Anulada', 'danger'],
  ])('%s se muestra como «%s»', (estado, label, tone) => {
    expect(reviewRowStatus(estado)).toEqual({ label, tone });
  });

  it('un estado desconocido se muestra en una sola mayúscula inicial', () => {
    expect(reviewRowStatus('en_espera_externa')).toEqual({ label: 'En espera externa', tone: 'neutral' });
    expect(reviewRowStatus('')).toEqual({ label: 'Sin estado', tone: 'neutral' });
  });
});
