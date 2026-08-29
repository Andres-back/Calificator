import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EducationalIcon, type EducationalIconName } from './EducationalIcon';

const icons: EducationalIconName[] = [
  'dashboard', 'subjects', 'resources', 'presentations', 'reports', 'xali',
  'ai-settings', 'crossword', 'word-search', 'matching', 'exam',
  'learning-guide', 'workshop', 'story', 'coloring', 'rubric',
  'reinforcement', 'quick-quiz', 'reading', 'concept-map', 'flashcards',
];

describe('EducationalIcon', () => {
  it.each(icons)('renderiza %s como un símbolo decorativo vectorial', (name) => {
    const { container } = render(<EducationalIcon name={name} className="h-6 w-6" />);
    const icon = container.querySelector(`[data-educational-icon="${name}"]`);

    expect(icon).toHaveAttribute('viewBox', '0 0 24 24');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.childElementCount).toBeGreaterThan(0);
  });
});
