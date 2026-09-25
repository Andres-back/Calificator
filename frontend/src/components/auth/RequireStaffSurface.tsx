import { Navigate, Outlet, useOutletContext } from 'react-router-dom';
import { canUseStaffSurfaces } from '@/lib/authorization';
import { useAuth } from '@/stores/auth';

export function RequireStaffSurface() {
  const user = useAuth((state) => state.user);
  const parentContext = useOutletContext<unknown>();

  if (user && !canUseStaffSurfaces(user)) {
    return <Navigate to="/app/403" replace />;
  }

  return <Outlet context={parentContext} />;
}
