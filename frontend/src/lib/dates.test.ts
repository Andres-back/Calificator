import { describe, expect, it } from 'vitest';
import { capitalizeFirst, describeDeadline, plural } from './dates';

describe('189 fechas y textos legibles', () => {
  it('vencimiento sin segundos y en pasado cuando ya pasó', () => {
    const now = new Date('2026-11-14T12:00:00-05:00');
    const past = describeDeadline('2026-11-11T01:06:59-05:00', now);
    expect(past.past).toBe(true);
    expect(past.text.startsWith('Venció el ')).toBe(true);
    expect(past.text).not.toMatch(/:\d{2}:\d{2}/);
    const future = describeDeadline('2026-11-20T08:30:00-05:00', now);
    expect(future.past).toBe(false);
    expect(future.text.startsWith('Vence el ')).toBe(true);
    expect(future.text).not.toMatch(/:\d{2}:\d{2}/);
  });
  it('mayúscula solo al inicio y plural correcto', () => {
    expect(capitalizeFirst('sábado, 14 de noviembre de 2026')).toBe('Sábado, 14 de noviembre de 2026');
    expect(plural(1, 'pendiente')).toBe('1 pendiente');
    expect(plural(2, 'pendiente')).toBe('2 pendientes');
  });
});
