import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseEnvelope, splitTeacherResponse } from './visualContent';

const corpus = JSON.parse(readFileSync(resolve(process.cwd(), '../specs/104-xali-docente-visual/fixtures/visuales.json'), 'utf8')) as { validos: unknown[]; invalidos: unknown[] };
describe('teacher visual contract', () => {
  it.each(corpus.validos)('accepts valid shared data %#', (visual) => {
    expect(parseEnvelope({ version: 1, visuales: [visual] }).visuales).toHaveLength(1);
  });
  it.each(corpus.invalidos)('rejects unsafe shared data %#', (visual) => {
    const result = parseEnvelope({ version: 1, visuales: [visual] });
    expect(result.visuales).toHaveLength(0);
    expect(result.warning).toBe(true);
  });
  it('preserves legacy text, removes invalid payloads and ignores unknown versions', () => {
    expect(splitTeacherResponse('Texto anterior.')).toEqual({ text: 'Texto anterior.', visuales: [], warning: false });
    expect(splitTeacherResponse('Útil\n```xcalificator-visual-v2\n{}\n```')).toEqual({ text: 'Útil', visuales: [], warning: true });
    expect(splitTeacherResponse('Útil\n```xcalificator-visual-v1\n{bad}\n```').text).toBe('Útil');
  });
  it('does not coerce booleans, strings, infinities or oversized data', () => {
    for (const version of [true, '1', 2]) expect(parseEnvelope({ version, visuales: [] }).warning).toBe(true);
    expect(parseEnvelope({ version: 1, visuales: corpus.validos }).warning).toBe(true);
    expect(parseEnvelope({ version: 1, visuales: [{}, 'x'.repeat(50000)] }).warning).toBe(true);
  });
});
