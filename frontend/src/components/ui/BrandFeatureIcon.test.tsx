import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandFeatureIcon } from './BrandFeatureIcon';

describe('BrandFeatureIcon', () => {
  it('usa el recurso optimizado como decoración', () => {
    const { container } = render(<BrandFeatureIcon kind="materias" />);
    const image = container.querySelector('img[data-brand-icon="materias"]');

    expect(image).toHaveAttribute('src', '/branding/icons/materias.webp');
    expect(image).toHaveAttribute('alt', '');
    expect(image).toHaveAttribute('aria-hidden', 'true');
  });

  it('conserva un símbolo comprensible si la imagen falla', () => {
    const { container } = render(<BrandFeatureIcon kind="presentaciones" />);
    const image = container.querySelector('img[data-brand-icon="presentaciones"]');
    expect(image).not.toBeNull();

    fireEvent.error(image!);

    expect(container.querySelector('[data-brand-icon-fallback="true"]')).not.toBeNull();
  });
});
