import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { RouteMetadata } from './RouteMetadata';

function TestRoutes() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <RouteMetadata />
      <Link to="/app/materias/estudiante-privado?token=secreto#nota">Ir a materias</Link>
      <Routes>
        <Route path="*" element={<div>Contenido</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function meta(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector);
}

beforeEach(() => {
  document.head.querySelectorAll('[data-xcalificator-metadata]').forEach((node) => node.remove());
});

describe('RouteMetadata', () => {
  it('publishes complete and canonical metadata only for the landing page', async () => {
    render(<TestRoutes />);

    await waitFor(() => expect(document.title).toBe('Inicio · XCalificator'));
    expect(meta('meta[name="robots"]')?.content).toBe('index, follow');
    expect(meta('meta[name="description"]')?.content).toContain('código abierto');
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://xcalificator.daimuz.com/',
    );
    expect(meta('meta[property="og:image"]')?.content).toBe(
      'https://xcalificator.daimuz.com/og-xcalificator.png',
    );
    expect(meta('meta[name="twitter:card"]')?.content).toBe('summary_large_image');
  });

  it('removes public social metadata and canonical when navigating to a private route', async () => {
    render(<TestRoutes />);
    await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull());

    fireEvent.click(screen.getByRole('link', { name: 'Ir a materias' }));

    await waitFor(() => expect(document.title).toBe('Materias · XCalificator'));
    expect(meta('meta[name="robots"]')?.content).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta('meta[property="og:title"]')).toBeNull();
    expect(meta('meta[name="twitter:card"]')).toBeNull();
    expect(document.head.innerHTML).not.toContain('estudiante-privado');
    expect(document.head.innerHTML).not.toContain('secreto');
  });

  it.each([
    ['/login', 'Ingresar · XCalificator'],
    ['/registro', 'Crear cuenta · XCalificator'],
    ['/recuperar-contrasena', 'Recuperar contraseña · XCalificator'],
    ['/restablecer-contrasena?token=privado', 'Restablecer contraseña · XCalificator'],
    ['/app/calificaciones?estudiante=123', 'Calificaciones · XCalificator'],
    ['/app/materias/materia-privada/evaluaciones', 'Evaluaciones · XCalificator'],
    ['/app/materias/materia-privada/calificar', 'Calificaciones · XCalificator'],
    ['/app/materias/materia-privada/asistencia', 'Asistencia · XCalificator'],
    ['/app/materias/materia-privada/dba', 'Criterios de aprendizaje · XCalificator'],
    ['/app/presentaciones', 'Presentaciones · XCalificator'],
    ['/app/admin/usuarios', 'Usuarios y roles · XCalificator'],
    ['/ruta-desconocida', 'Página no encontrada · XCalificator'],
  ])('marks %s as private with a safe static title', async (path, title) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <RouteMetadata />
      </MemoryRouter>,
    );

    await waitFor(() => expect(document.title).toBe(title));
    expect(meta('meta[name="robots"]')?.content).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.innerHTML).not.toContain('token=privado');
    expect(document.head.innerHTML).not.toContain('estudiante=123');
  });
});
