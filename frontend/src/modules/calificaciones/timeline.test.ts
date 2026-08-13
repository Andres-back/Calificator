import { describe, expect, it } from 'vitest';
import { formatTimelineScore } from './timeline';

describe('formatTimelineScore', () => {
  it('formatea decimales numéricos y serializados como texto', () => {
    expect(formatTimelineScore(4.5)).toBe('4.5');
    expect(formatTimelineScore('4.5')).toBe('4.5');
  });

  it('ignora valores vacíos o inválidos sin romper el historial', () => {
    expect(formatTimelineScore(null)).toBeNull();
    expect(formatTimelineScore('   ')).toBeNull();
    expect(formatTimelineScore('nota inválida')).toBeNull();
  });
});