import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <img src="/branding/forbidden.webp" alt="" width={224} height={224} className="mb-4 h-44 w-44 select-none object-contain sm:h-56 sm:w-56" draggable={false} />
      <h1 className="font-display text-3xl font-extrabold">Acceso denegado</h1>
      <p className="mt-3 max-w-md text-muted">
        No tienes permiso para acceder a esta sección. Si crees que esto es un error,
        contacta al administrador del sistema.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <Link
          to="/app"
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Home className="h-4 w-4" /> Ir al inicio
        </Link>
      </div>
    </div>
  );
}
