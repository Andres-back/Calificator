import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import type { UserRole } from '@/types/api';

/**
 * Guard de ruta por rol. Si el usuario autenticado no tiene un rol permitido,
 * redirige a /app/403 (página de acceso denegado) en vez de renderizar una
 * pantalla que no le corresponde o redirigir silenciosamente al dashboard.
 * El backend ya protege los datos; esto evita la mala experiencia de cargar
 * una pantalla vacía o prohibida por URL directa.
 */
export function RequireRole({ allow }: { allow: UserRole[] }) {
  const user = useAuth((state) => state.user);
  if (user && !allow.includes(user.rol)) {
    return <Navigate to="/app/403" replace />;
  }
  return <Outlet />;
}
