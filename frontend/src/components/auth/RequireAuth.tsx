import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';
import { LoadingScreen } from '@/components/ui';

/** Dispara la verificación de sesión una vez al montar la app. */
export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { status, fetchMe } = useAuth();
  const isPublicLogin = typeof window !== 'undefined' && window.location.pathname === '/login';

  useEffect(() => {
    if (status === 'idle' && !isPublicLogin) void fetchMe();
  }, [status, fetchMe, isPublicLogin]);

  if (!isPublicLogin && (status === 'idle' || status === 'loading')) {
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
