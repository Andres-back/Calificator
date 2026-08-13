import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PresentationFileLink } from './PresentationFileLink';

describe('PresentationFileLink', () => {
  it('abre el PDF de forma nativa en otra pestaña sin crear un Blob', () => {
    render(<PresentationFileLink id="presentation-1" format="pdf" />);

    const link = screen.getByRole('link', { name: /Abrir o descargar PDF/i });
    expect(link).toHaveAttribute('href', '/api/presentaciones/presentation-1/archivo/pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).not.toHaveAttribute('download');
  });

  it('descarga el PPTX directamente desde el servidor', () => {
    render(<PresentationFileLink id="presentation-1" format="pptx" />);

    const link = screen.getByRole('link', { name: /Descargar PPTX/i });
    expect(link).toHaveAttribute('href', '/api/presentaciones/presentation-1/archivo/pptx');
    expect(link).toHaveAttribute('download');
    expect(link).not.toHaveAttribute('target');
  });
});