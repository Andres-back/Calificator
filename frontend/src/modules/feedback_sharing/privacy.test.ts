import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AuthBootstrap } from '@/components/auth/RequireAuth';
import { installGlobalErrorHandlers, setReporter, resetReporter } from '@/lib/errorReporter';
import { installFeedbackPrivacy, isFeedbackSurface } from './privacy';

const { fetchMe } = vi.hoisted(() => ({ fetchMe: vi.fn() }));
vi.mock('@/stores/auth', () => ({ useAuth: () => ({ status: 'idle', fetchMe }) }));
afterEach(() => { history.replaceState(null, '', '/'); resetReporter(); vi.clearAllMocks(); });

describe('privacidad de consulta individual', () => {
  it('reconoce solo su ruta dedicada', () => {
    expect(isFeedbackSurface('/devolucion')).toBe(true);
    expect(isFeedbackSurface('/devolucion/')).toBe(true);
    expect(isFeedbackSurface('/app/devolucion')).toBe(false);
    expect(isFeedbackSurface('/devolucion-invalida')).toBe(false);
  });
  it('excluye el bootstrap autenticado aunque haya una sesión abierta', () => {
    history.replaceState(null, '', `/devolucion#${'x'.repeat(43)}`);
    render(createElement(AuthBootstrap, { children: createElement('p', null, 'Consulta privada') }));
    expect(screen.getByText('Consulta privada')).toBeInTheDocument();
    expect(fetchMe).not.toHaveBeenCalled();
  });
  it('no inicializa metadatos con identidad, URL o credencial', () => {
    history.replaceState(null, '', `/devolucion#${'x'.repeat(43)}`);
    document.head.insertAdjacentHTML('beforeend', '<meta property="og:title" content="Datos previos"><link rel="canonical" href="https://example.com">');
    installFeedbackPrivacy();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    expect(document.title).not.toContain('xxxxx');
  });
  it('los handlers globales omiten errores privados antes de llegar al reporter', () => {
    const reporter = { captureException: vi.fn(), captureMessage: vi.fn() };
    setReporter(reporter); installGlobalErrorHandlers();
    history.replaceState(null, '', `/devolucion#${'x'.repeat(43)}`);
    fireEvent(window, new ErrorEvent('error', { error: new Error('contenido privado'), message: 'contenido privado' }));
    expect(reporter.captureException).not.toHaveBeenCalled();
  });
});
