import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { LoadingScreen } from '@/components/ui';
import { routes } from '@/config/routes';

const PUBLIC_PATHS = new Set([
  routes.home,
  routes.login,
  routes.register,
  routes.requestPasswordReset,
  routes.resetPassword,
]);

/** Dispara la verificación de sesión una vez al montar la app. */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { status, fetchMe } = useAuth();
  const isPublicPath =
    typeof window !== 'undefined' && PUBLIC_PATHS.has(window.location.pathname);

  useEffect(() => {
    if (status === 'idle' && !isPublicPath) void fetchMe();
  }, [status, fetchMe, isPublicPath]);

  if (!isPublicPath && (status === 'idle' || status === 'loading')) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingScreen label="Iniciando XCalificator…" />
      </div>
    );
  }
  return <>{children}</>;
}

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
