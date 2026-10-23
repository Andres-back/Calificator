import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerificationPendingNotice } from './VerificationPendingNotice';

describe('verificación de nota pendiente', () => {
  it('explains a partial proposal without saying the provider went down', () => {
    render(<VerificationPendingNotice status="pending" />);
    expect(screen.getByRole('status')).toHaveTextContent('Segunda revisión pendiente');
    expect(screen.getByRole('status')).toHaveTextContent('nota propuesta');
    expect(screen.getByRole('status')).not.toHaveTextContent('caído');
  });
  it.each([undefined, 'complete'])('does not add a notice to %s results', (status) => {
    const { container } = render(<VerificationPendingNotice status={status} />);
    expect(container).toBeEmptyDOMElement();
  });
});
