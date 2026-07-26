import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import { toApiError } from '@/lib/api';

export function ConfigConsistencyCard({
  isLoading,
  error,
  data,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  data: { backend_hash: string; worker_hash: string | null; consistent: boolean; worker_error: string | null } | undefined;
  onRetry: () => void;
}) {
  if (isLoading) return <Skeleton className="h-24" />;
  if (error) {
    return (
      <Card className="border-amber-200 p-4 dark:border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">No se pudo verificar la consistencia backend-worker</p>
            <p className="mt-1 text-sm text-muted">{toApiError(error).detail}</p>
          </div>
          <Button size="sm" variant="outline" onClick={onRetry}>Reintentar</Button>
        </div>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {data.consistent ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" /> : <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />}
          <div>
            <p className="font-semibold">Consistencia backend-worker</p>
            <p className="mt-1 text-sm text-muted">
              Backend: <code className="rounded bg-surface-2 px-1.5 py-0.5">{data.backend_hash}</code> · Worker: <code className="rounded bg-surface-2 px-1.5 py-0.5">{data.worker_hash ?? 'sin respuesta'}</code>
            </p>
            {data.worker_error && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{data.worker_error}</p>}
          </div>
        </div>
        <Badge tone={data.consistent ? 'success' : 'warning'}>{data.consistent ? 'Consistente' : 'Revisar worker'}</Badge>
      </div>
    </Card>
  );
}
