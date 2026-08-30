import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EducationalIcon, type EducationalIconName } from './EducationalIcon';
import { getSubjectEducationalIcon } from './educationalIconModel';

const icons: EducationalIconName[] = [
  'dashboard', 'subjects', 'resources', 'presentations', 'reports', 'xali',
  'ai-settings', 'crossword', 'word-search', 'matching', 'exam',
  'learning-guide', 'workshop', 'story', 'coloring', 'rubric',
  'reinforcement', 'quick-quiz', 'reading', 'concept-map', 'flashcards',
  'prepare-evaluation', 'pending-reviews', 'student-claim', 'grade-evidence',
  'attendance', 'gradebook', 'curriculum-dba', 'subject-math', 'subject-science',
  'subject-language', 'subject-social', 'subject-english', 'subject-art',
  'subject-technology', 'report-subjects', 'report-grades', 'report-average', 'student-roster',
  'interactive-games', 'archived-drafts', 'pdf-ready', 'presentation-processing',
  'presentation-ready', 'presentation-error', 'ai-institutional', 'ai-own-key', 'ai-routing',
];

const illustratedAssets = [
  'dashboard', 'subjects', 'resources', 'presentations', 'reports', 'xali',
  'ai-settings', 'crossword', 'word-search', 'matching', 'learning-guide',
  'workshop', 'story', 'coloring', 'reinforcement', 'reading', 'concept-map',
  'flashcards', 'prepare-evaluation', 'pending-reviews', 'student-claim',
  'grade-evidence', 'attendance', 'gradebook', 'curriculum-dba', 'subject-math',
  'subject-science', 'subject-language', 'subject-social', 'subject-english',
  'subject-art', 'subject-technology', 'report-subjects', 'report-grades',
  'report-average', 'student-roster',
  'interactive-games', 'archived-drafts', 'pdf-ready', 'presentation-processing',
  'presentation-ready', 'presentation-error', 'ai-institutional', 'ai-own-key', 'ai-routing',
];

describe('EducationalIcon', () => {
  it('publica los 45 recortes aprobados dentro del paquete del frontend', () => {
    expect(illustratedAssets).toHaveLength(45);
    for (const asset of illustratedAssets) {
      expect(existsSync(resolve(process.cwd(), 'public', 'branding', 'semantic-icons', asset + '.webp'))).toBe(true);
    }
  });

  it.each([
    ['Matemáticas', 'subject-math'],
    ['Ciencias Naturales y Educación Ambiental', 'subject-science'],
    ['Lengua Castellana', 'subject-language'],
    ['Ciencias Sociales', 'subject-social'],
    ['Inglés', 'subject-english'],
    ['Educación Artística', 'subject-art'],
    ['Tecnología e Informática', 'subject-technology'],
    ['Ética y Valores', 'subjects'],
  ])('asigna %s a %s', (area, expected) => {
    expect(getSubjectEducationalIcon(area)).toBe(expected);
  });

  it.each(icons)('renderiza %s con ilustración y fallback vectorial', (name) => {
    const { container } = render(<EducationalIcon name={name} className="h-6 w-6" />);
    const icon = container.querySelector(`[data-educational-icon="${name}"]`);

    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveAttribute('data-icon-asset');
    expect(icon?.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringMatching(/^\/branding\/semantic-icons\/.+\.webp$/),
    );
    expect(icon?.querySelector('svg')).toHaveStyle({ display: 'none' });
  });
});
