import type { ReactNode } from 'react';
import { AlertTriangle, Ban, CircleAlert, RotateCcw, ServerCrash, WifiOff } from 'lucide-react';
import { toApiError } from '@/lib/api';
import { Button } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { Spinner } from './Spinner';
import type { LucideIcon } from 'lucide-react';

export function QueryLoading({ label = 'Cargando…', className }: { label?: string; className?: string }) {
  return (
    <div className={className ?? 'flex min-h-32 items-center justify-center'} role="status" aria-live="polite">
      <Spinner className="h-5 w-5" />
      <span className="ml-2 text-sm text-muted">{label}</span>
    </div>
  );
}

function queryErrorCopy(error: unknown) {
  const apiError = toApiError(error);
  if (apiError.status === 401) {
    return { icon: Ban, title: 'Tu sesión expiró', description: 'Inicia sesión nuevamente para continuar.' };
  }
  if (apiError.status === 403) {
    return { icon: Ban, title: 'No tienes permiso para ver este contenido', description: 'Verifica tu rol o contacta al responsable de la materia.' };
  }
  if (apiError.status === 404) {
    return { icon: CircleAlert, title: 'El recurso no fue encontrado', description: 'Puede haber sido eliminado o la dirección no ser válida.' };
  }
  if (apiError.status === 429) {
    return { icon: AlertTriangle, title: 'Hay demasiadas solicitudes', description: 'Espera un momento antes de intentarlo de nuevo.' };
  }
  if (apiError.status === 0) {
    return { icon: WifiOff, title: 'No se pudo conectar con el servidor', description: 'Revisa tu conexión e intenta nuevamente.' };
  }
  return { icon: ServerCrash, title: 'No fue posible cargar la información', description: apiError.detail };
}

export function QueryError({
  error,
  onRetry,
  title,
  description,
  technicalId,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  description?: string;
  technicalId?: string;
  className?: string;
}) {
  const copy = queryErrorCopy(error);
  const Icon = copy.icon;
  return (
    <Card className={className ?? 'border-rose-200 p-6 dark:border-rose-500/30'} role="alert">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
        <span className="mb-3 grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300 sm:mb-0 sm:mr-4">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold">{title ?? copy.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{description ?? copy.description}</p>
          {technicalId && <p className="mt-2 text-xs text-muted">Referencia: {technicalId}</p>}
          {onRetry && <Button className="mt-4" size="sm" variant="outline" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Reintentar</Button>}
        </div>
      </div>
    </Card>
  );
}

export function QueryEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return <EmptyState icon={icon} title={title} description={description} action={action} />;
}

export function QueryState({
  isLoading,
  isError,
  error,
  onRetry,
  isEmpty = false,
  loading,
  empty,
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty?: boolean;
  loading?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) return <>{loading ?? <QueryLoading />}</>;
  if (isError) return <QueryError error={error} onRetry={onRetry} />;
  if (isEmpty) return <>{empty}</>;
  return <>{children}</>;
}