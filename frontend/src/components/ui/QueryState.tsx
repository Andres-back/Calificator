import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui';

/* ─── Loading ─── */

export function QueryLoading({ count = 3, className = '', label }: { count?: number; className?: string; label?: string }) {
  return (
    <div className={`grid gap-3 ${className}`} role="status" aria-label={label ?? 'Cargando contenido'}>
      {label && <p className="px-2 text-sm font-medium text-secondary">{label}</p>}
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

/* ─── Empty ─── */

export function QueryEmpty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-lg font-bold text-fg">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── Error ─── */

interface QueryErrorProps {
  title?: string;
  message?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  onBack?: () => void;
  /** HTTP status or error code */
  code?: number | string;
}

function friendlyMessage(code?: number | string, fallback?: string): string {
  switch (code) {
    case 401:
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    case 403:
      return 'No tienes permiso para acceder a esta información.';
    case 404:
      return 'El recurso solicitado no existe o ya no está disponible.';
    case 422:
      return 'Los datos enviados no son válidos. Revisa la información e inténtalo de nuevo.';
    case 429:
      return 'Has realizado demasiadas solicitudes. Espera unos segundos y vuelve a intentar.';
    case 500:
    case 502:
    case 503:
      return 'El servicio no está disponible en este momento. Intenta más tarde.';
    default:
      return fallback ?? 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}

export function QueryError({
  title,
  message,
  description,
  error,
  onRetry,
  onBack,
  code,
}: QueryErrorProps) {
  const candidate = error as { response?: { status?: number }; status?: number } | undefined;
  const statusCode = code ?? candidate?.response?.status ?? candidate?.status;
  const displayMessage = message ?? description ?? friendlyMessage(statusCode);
  const displayTitle = title ?? 'Algo salió mal';

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-rose-300 bg-surface px-6 py-14 text-center dark:border-rose-500/40" role="alert">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold text-fg">{displayTitle}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{displayMessage}</p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            Volver
          </Button>
        )}
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Boundary ─── */

interface QueryBoundaryProps<T> {
  query: {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    isSuccess: boolean;
    error?: unknown;
    refetch?: () => void;
  };
  loading?: ReactNode;
  empty?: ReactNode;
  error?: ReactNode;
  errorTitle?: string;
  onRetry?: () => void;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>({
  query,
  loading,
  empty,
  error,
  errorTitle,
  onRetry,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) {
    return <>{loading ?? <QueryLoading />}</>;
  }
  if (query.isError) {
    if (error) return <>{error}</>;
    return (
      <QueryError
        title={errorTitle}
        error={query.error}
        onRetry={onRetry ?? query.refetch}
      />
    );
  }
  if (query.isSuccess && (query.data == null || (Array.isArray(query.data) && query.data.length === 0))) {
    return <>{empty ?? <QueryEmpty title="Sin resultados" />}</>;
  }
  if (query.isSuccess && query.data != null) {
    return <>{children(query.data)}</>;
  }
  return <QueryLoading />;
}

/**
 * Compatibilidad con el componente QueryState anterior (interfaz plana).
 * Se usaba como: <QueryState isLoading={} isError={} error={} isEmpty={}
 *                     onRetry={} loading={} empty={}>children</QueryState>
 */
interface QueryStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  isEmpty: boolean;
  onRetry?: () => void;
  loading?: ReactNode;
  empty?: ReactNode;
  children?: ReactNode;
}

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty,
  onRetry,
  loading,
  empty,
  children,
}: QueryStateProps) {
  if (isLoading) {
    return <>{loading ?? <QueryLoading />}</>;
  }
  if (isError) {
    return (
      <QueryError
        title="Algo salió mal"
        error={error}
        onRetry={onRetry}
      />
    );
  }
  if (isEmpty) {
    return <>{empty ?? <QueryEmpty title="Sin resultados" />}</>;
  }
  return <>{children}</>;
}
