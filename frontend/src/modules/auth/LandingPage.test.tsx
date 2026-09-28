import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';


describe('LandingPage', () => {
  it('explica el proyecto abierto y ofrece rutas claras para ingresar o registrarse', () => {
    render(<MemoryRouter><LandingPage /></MemoryRouter>);

    expect(screen.getByText(/Código abierto · buscamos docentes/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Crear cuenta/i })).toHaveAttribute('href', '/registro');
    const loginLink = screen.getByRole('banner').querySelector('a[href="/login"]');
    expect(loginLink).toHaveTextContent('Ingresar');
    expect(loginLink).not.toHaveClass('hidden');
  });
});
