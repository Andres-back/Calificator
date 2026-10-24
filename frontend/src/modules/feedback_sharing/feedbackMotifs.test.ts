import { describe, expect, it } from 'vitest';
import { feedbackMotifs, motifForStudent } from './feedbackMotifs';
describe('decorative choices preserve existing motifs', () => {
  it('keeps the twenty general IDs and their paths', () => {
    expect(feedbackMotifs).toHaveLength(20);
    expect(motifForStudent('libro', 'student')?.src).toBe('/assets/feedback-motifs/libro.png');
    expect(motifForStudent('none', 'student')).toBeUndefined();
    expect(motifForStudent('missing', 'student')).toBeUndefined();
  });
  it('mixes only the chosen collection, deterministically across continuations', () => {
    const collection = [{ id: 'math-1', label: 'Uno', src: '/one' }, { id: 'math-2', label: 'Dos', src: '/two' }];
    const first = motifForStudent('mixed', 'opaque-student-id', collection);
    expect(collection).toContain(first);
    expect(motifForStudent('mixed', 'opaque-student-id', collection)).toBe(first);
    expect(motifForStudent('math-2', 'opaque-student-id', collection)).toBe(collection[1]);
    expect(motifForStudent('mixed', 'id', [])).toBeUndefined();
  });
});
