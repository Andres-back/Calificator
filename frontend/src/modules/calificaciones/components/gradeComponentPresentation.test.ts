import { describe, expect, it } from 'vitest';
import { gradeComponentPresentation } from './gradeComponentPresentation';

describe('gradeComponentPresentation', () => {
  it.each([
    ['correcta', 'success', 'Correcta', 'check'],
    ['incorrecta', 'error', 'Incorrecta', 'x'],
    ['parcial', 'warning', 'Parcial', 'warning'],
    ['sin_respuesta', 'warning', 'Sin respuesta', 'warning'],
    ['ilegible', 'warning', 'Ilegible', 'warning'],
    ['no_evaluable', 'warning', 'No evaluable', 'warning'],
    ['revision_pendiente', 'warning', 'Por revisar', 'warning'],
    ['otro_estado_interno', 'warning', 'Por revisar', 'warning'],
  ])('presenta %s sin inventar otra nota', (estado, tone, label, icon) => {
    expect(gradeComponentPresentation({ estado, requiere_revision: false, puntos_obtenidos: 0 })).toMatchObject({ tone, label, icon });
  });

  it.each(['correcta', 'incorrecta', 'parcial'])('el aviso propio prevalece sobre %s', (estado) => {
    expect(gradeComponentPresentation({ estado, requiere_revision: true, puntos_obtenidos: 1 })).toMatchObject({ tone: 'warning', label: 'Por revisar', icon: 'warning' });
  });

  it.each([null, '', ' ', 'no es número', 'Infinity', 'NaN'])('no presenta datos insuficientes como un error definitivo: %s', (puntos_obtenidos) => {
    expect(gradeComponentPresentation({ estado: 'incorrecta', requiere_revision: false, puntos_obtenidos })).toMatchObject({ tone: 'warning', label: 'Por revisar' });
  });

  it('un cero legítimo o decimal textual no cambia el estado vigente', () => {
    expect(gradeComponentPresentation({ estado: 'incorrecta', requiere_revision: false, puntos_obtenidos: '0' }).tone).toBe('error');
    expect(gradeComponentPresentation({ estado: 'correcta', requiere_revision: false, puntos_obtenidos: '0.625' }).tone).toBe('success');
  });

  it('no modifica datos ni necesita historial o estado global', () => {
    const input = Object.freeze({ estado: 'correcta', requiere_revision: false, puntos_obtenidos: 1 });
    expect(gradeComponentPresentation(input).tone).toBe('success');
    expect(input).toEqual({ estado: 'correcta', requiere_revision: false, puntos_obtenidos: 1 });
  });
});
