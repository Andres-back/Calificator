import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { XaliMascot } from './XaliMascot';
import { XALI_COMBINATION_COUNT, XALI_STORY_STATES, isValidXaliState } from './xaliStates';

describe('XaliMascot', () => {
  it('offers at least one hundred reusable combinations', () => {
    expect(XALI_COMBINATION_COUNT).toBe(120);
    expect(Object.values(XALI_STORY_STATES).every(isValidXaliState)).toBe(true);
  });

  it('is an accessible vector illustration without an external image', () => {
    const { container } = render(<XaliMascot state={XALI_STORY_STATES.strength} animate={false} />);
    expect(screen.getByRole('img', { name: /Xali acompaña/i })).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
