import { Activity, BarChart3 } from 'lucide-react';
import { Badge, Card, Skeleton } from '@/components/ui';
import { formatDate } from '../utils/validation';

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-4 text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

export function UsageAndAudit({
  usage,
  audit,
  isAuditLoading,
}: {
  usage: { total_calls: number; total_tokens_input: number; total_tokens_output: number; total_cost: number; by_provider: { provider: string; calls: number; cost: number }[] };
  audit: { action: string; entity: string; result: string; created_at: string | null }[];
  isAuditLoading: boolean;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-500" />
          <h2 className="font-display text-lg font-bold">Uso registrado</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric value={`${usage.total_calls}`} label="Llamadas" />
          <Metric value={(usage.total_tokens_input + usage.total_tokens_output).toLocaleString()} label="Tokens" />
          <Metric value={`$${usage.total_cost.toFixed(4)}`} label="Costo estimado" />
        </div>
        {usage.by_provider.length > 0 && (
          <div className="mt-4 space-y-2">
            {usage.by_provider.map((provider) => (
              <div key={provider.provider} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="font-medium">{provider.provider}</span>
                <span className="text-muted">{provider.calls} llamadas · ${provider.cost.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-500" />
          <h2 className="font-display text-lg font-bold">Auditoría reciente</h2>
        </div>
        {isAuditLoading ? <Skeleton className="h-24" /> : audit.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay eventos de configuración registrados.</p>
        ) : (
          <ul className="divide-y divide-border">
            {audit.map((entry, index) => (
              <li key={`${entry.action}-${entry.entity}-${index}`} className="py-2.5 text-sm">
                <div className="flex items-center justify-between gap-3"><span className="font-medium">{entry.action}</span><Badge tone={entry.result === 'ok' ? 'success' : 'warning'}>{entry.result}</Badge></div>
                <p className="mt-0.5 text-xs text-muted">{entry.entity} · {formatDate(entry.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
