import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { useAuth } from '@/stores/auth';
import type { User, UserRole } from '@/types/api';

function userFor(role: UserRole): User {
  return {
    id: `${role}-1`,
    nombre: role,
    email: `${role}@example.test`,
    rol: role,
    estado: 'activo',
  };
}

beforeEach(() => {
  useAuth.setState({ user: null, status: 'unauthenticated' });
});

describe('route guards', () => {
  it('redirects an unauthenticated visitor to login', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<p>Private dashboard</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('renders a protected route for an authenticated user', () => {
    useAuth.setState({ user: userFor('profesor'), status: 'authenticated' });

    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<p>Private dashboard</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Private dashboard')).toBeInTheDocument();
  });

  it('redirects a student to 403 from an admin-only route', () => {
    useAuth.setState({ user: userFor('estudiante'), status: 'authenticated' });

    render(
      <MemoryRouter initialEntries={['/app/admin']}>
        <Routes>
          <Route element={<RequireRole allow={['admin']} />}>
            <Route path="/app/admin" element={<p>Admin console</p>} />
          </Route>
          <Route path="/app/403" element={<p>Acceso denegado</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.queryByText('Admin console')).not.toBeInTheDocument();
  });
  it('preserves parent outlet context through a role guard', () => {
    useAuth.setState({ user: userFor('profesor'), status: 'authenticated' });

    function Parent() {
      return <Outlet context={{ materia: 'Matemáticas 8°' }} />;
    }
    function Child() {
      const context = useOutletContext<{ materia: string }>();
      return <p>{context.materia}</p>;
    }

    render(
      <MemoryRouter initialEntries={['/app/materias/1/calificar']}>
        <Routes>
          <Route element={<Parent />}>
            <Route element={<RequireRole allow={['profesor', 'admin']} />}>
              <Route path="/app/materias/1/calificar" element={<Child />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Matemáticas 8°')).toBeInTheDocument();
  });
});