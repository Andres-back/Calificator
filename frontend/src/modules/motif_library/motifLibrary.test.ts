import { describe, expect, it } from 'vitest';
import { collectionForArea, stableMotifIndex, curatedAssetPath } from './motifLibrary';

describe('motif library presentation rules', () => {
  it('maps only explicit aliases and never mutates subject data', () => {
    expect(collectionForArea('MATEMÁTICAS')).toBe('matematicas');
    expect(collectionForArea('Educación Física')).toBe('fisica');
    expect(collectionForArea('Física')).toBe('naturales');
    expect(collectionForArea('Historia')).toBe('sociales');
    expect(collectionForArea('Mi materia completamente distinta')).toBe('general');
    expect(collectionForArea(undefined)).toBe('general');
  });
  it('keeps mixed choices stable and handles an empty collection', () => {
    expect(stableMotifIndex('student-id', 30)).toBe(stableMotifIndex('student-id', 30));
    expect(stableMotifIndex('student-id', 0)).toBe(-1);
    expect(stableMotifIndex('student-id', 30)).toBeGreaterThanOrEqual(0);
    expect(stableMotifIndex('student-id', 30)).toBeLessThan(30);
  });
  it('allows only the curated same-origin endpoint', () => {
    const path = '/api/biblioteca-motivos/archivos/naturales-001/full/' + 'a'.repeat(64);
    expect(curatedAssetPath(path)).toBe(path);
    for (const invalid of ['https://example.test/x.png', '//example.test/x', 'file:///etc/passwd', '/api/imagenes/secret', path + '?url=https://example.test']) {
      expect(() => curatedAssetPath(invalid)).toThrow();
    }
  });
});
