import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { EducationalIcon, type EducationalIconName } from './EducationalIcon';

const icons: EducationalIconName[] = [
  'dashboard', 'subjects', 'resources', 'presentations', 'reports', 'xali',
  'ai-settings', 'crossword', 'word-search', 'matching', 'exam',
  'learning-guide', 'workshop', 'story', 'coloring', 'rubric',
  'reinforcement', 'quick-quiz', 'reading', 'concept-map', 'flashcards',
];

const illustratedAssets = [
  'dashboard', 'subjects', 'resources', 'presentations', 'reports', 'xali',
  'ai-settings', 'crossword', 'word-search', 'matching', 'learning-guide',
  'workshop', 'story', 'coloring', 'reinforcement', 'reading', 'concept-map',
  'flashcards',
];

describe('EducationalIcon', () => {
  it('publica los 18 recortes aprobados dentro del paquete del frontend', () => {
    expect(illustratedAssets).toHaveLength(18);
    for (const asset of illustratedAssets) {
      expect(existsSync(resolve(process.cwd(), 'public', 'branding', 'semantic-icons', asset + '.webp'))).toBe(true);
    }
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
