import { Link, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui';
import { routes } from '@/config/routes';
import { getReporter } from '@/lib/errorReporter';

/**
 * Error boundary global: atrapa errores de renderizado inesperados.
 */
export function RouterErrorBoundary() {
  const error = useRouteError();

  // Reportar el error a la capa de observabilidad (sanitizado automáticamente)
  getReporter().captureException(error, {
    route: window.location.pathname,
    role: 'anonimo', // no sabemos el rol si algo explotó en el layout
  });
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <h1 className="font-display text-3xl font-extrabold">Algo salió mal</h1>
      <p className="mt-3 max-w-md text-muted">
        Se produjo un error inesperado. Puedes volver al inicio e intentarlo de nuevo.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => window.location.reload()}>Recargar página</Button>
        <Link
          to={routes.app}
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
