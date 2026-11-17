import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './LandingPage';

afterEach(() => vi.unstubAllGlobals());


describe('LandingPage', () => {
  it.each(['android', 'iphone'])('opens the protected entry only in installed mode: %s', (platform) => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: platform === 'android' }));
    if (platform === 'iphone') vi.stubGlobal('navigator', { standalone: true });
    render(<MemoryRouter initialEntries={['/']}><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<p>Protected entry</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByText('Protected entry')).toBeInTheDocument();
    expect(screen.queryByText(/Código abierto · buscamos docentes/i)).not.toBeInTheDocument();
  });
  it('explica el proyecto abierto y ofrece rutas claras para ingresar o registrarse', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByText(/Código abierto · buscamos docentes/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear cuenta/i })).toHaveAttribute('href', '/registro');
    const loginLink = screen.getByRole('banner').querySelector('a[href="/login"]');
    expect(loginLink).toHaveTextContent('Ingresar');
    expect(loginLink).not.toHaveClass('hidden');
    expect(screen.getByRole('button', { name: 'Añadir al inicio' })).toBeInTheDocument();
  });
  it('198 ilustra los beneficios y la invitación a docentes con imágenes decorativas', () => {
    const { container } = render(<MemoryRouter><LandingPage /></MemoryRouter>);

    for (const name of ['feature-evidence', 'feature-teacher-decides', 'feature-learning', 'community-teachers']) {
      const image = container.querySelector(`img[src="/branding/${name}.webp"]`);
      expect(image, name).toBeInTheDocument();
      expect(image).toHaveAttribute('alt', '');
      expect(image).toHaveAttribute('loading', 'lazy');
    }
    expect(screen.getByRole('heading', { name: 'Califica con evidencia' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Queremos construirlo con docentes reales' })).toBeInTheDocument();
  });
});
