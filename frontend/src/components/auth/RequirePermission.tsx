import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

export function RequirePermission({ anyOf }: { anyOf: string[] }) {
  const user = useAuth((state) => state.user);
  const parentContext = useOutletContext<unknown>();
  const permissions = new Set(user?.permissions ?? []);
  if (user && !anyOf.some((permission) => permissions.has(permission))) {
    return <Navigate to="/app/403" replace />;
  }
  return <Outlet context={parentContext} />;
}
