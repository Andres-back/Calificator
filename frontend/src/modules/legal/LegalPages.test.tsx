import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  CookiesPage,
  PilotInformationPage,
  PrivacyNoticePage,
  PrivacyPage,
  TermsPage,
} from './LegalPages';

describe('public legal pages', () => {
  it('shows controller, AI, minors and rights in privacy policy', () => {
    render(<MemoryRouter><PrivacyPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Política de tratamiento/ })).toBeInTheDocument();
    expect(screen.getByText(/Samir Andrés Ardila Cabrera/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Inteligencia artificial/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Niños, niñas y adolescentes/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Derechos y procedimiento/ })).toBeInTheDocument();
  });

  it('states human review and permitted use in terms', () => {
    render(<MemoryRouter><TermsPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Calificación asistida/ })).toBeInTheDocument();
    expect(screen.getByText(/docente debe revisar las alertas/i)).toBeInTheDocument();
  });

  it('inventory identifies necessary cookies and cookie-free performance analytics', () => {
    render(<MemoryRouter><CookiesPage /></MemoryRouter>);
    expect(screen.getByText('access_token')).toBeInTheDocument();
    expect(screen.getByText('xcalificator_csrf')).toBeInTheDocument();
    expect(screen.getByText(/no utiliza cookies ni/)).toBeInTheDocument();
  });

  it('does not confuse account creation with research consent', () => {
    render(<MemoryRouter><PilotInformationPage /></MemoryRouter>);
    expect(screen.getByText(/Crear o utilizar una cuenta no significa aceptar participar/)).toBeInTheDocument();
  });

  it('provides a short privacy notice linked to the complete policy', () => {
    render(<MemoryRouter><PrivacyNoticePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Aviso de privacidad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política completa/i })).toHaveAttribute('href', '/privacidad');
  });
});
