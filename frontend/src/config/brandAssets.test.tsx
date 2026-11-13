import { render, screen } from '@testing-library/react';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const asset = (name: string) => resolve(process.cwd(), 'public', 'branding', name);
const source = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

describe('177 identidad visual', () => {
  it.each(['logo-mark.webp', 'not-found.webp', 'forbidden.webp', 'semantic-icons/review-answers.webp', 'semantic-icons/review-feedback.webp', 'semantic-icons/review-history.webp'])('publica %s con menos de 60 KB', (name) => {
    expect(existsSync(asset(name))).toBe(true);
    expect(statSync(asset(name)).size).toBeLessThan(60 * 1024);
  });

  it.each(['components/layout/Sidebar.tsx', 'modules/auth/LandingPage.tsx', 'modules/auth/LoginPage.tsx', 'modules/auth/RegisterPage.tsx'])('%s muestra el isotipo y no el logotipo encogido', (path) => {
    expect(source(path)).toContain('/branding/logo-mark.webp');
    expect(source(path)).not.toContain('/branding/logo-full.webp');
  });

  it('la página no encontrada conserva mensaje y acciones junto a su ilustración decorativa', () => {
    const { container } = render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/app');
    const image = container.querySelector('img')!;
    expect(image).toHaveAttribute('src', '/branding/not-found.webp');
    expect(image).toHaveAttribute('alt', '');
  });

  it('acceso denegado conserva mensaje y acciones junto a su ilustración decorativa', () => {
    const { container } = render(<MemoryRouter><ForbiddenPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/app');
    const image = container.querySelector('img')!;
    expect(image).toHaveAttribute('src', '/branding/forbidden.webp');
    expect(image).toHaveAttribute('alt', '');
  });
});
