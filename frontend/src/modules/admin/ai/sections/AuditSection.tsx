import { Activity, BarChart3 } from 'lucide-react';
import { Badge, Card, Select, Skeleton } from '@/components/ui';
import type { AIControlCenterUsage } from '../../api';
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

function Duration({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">Sin medición</span>;
  return <>{value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`}</>;
}

export function ControlCenterUsageExplorer({
  data,
  loading,
  period,
  onPeriodChange,
}: {
  data?: AIControlCenterUsage;
  loading: boolean;
  period: number;
  onPeriodChange: (days: number) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold">Rendimiento por etapa</h2>
          <p className="mt-1 text-sm text-muted">Datos observados; la espera en cola y la revisión humana solo aparecen cuando fueron medidas.</p>
        </div>
        <label className="w-full sm:w-44">
          <span className="sr-only">Periodo de métricas</span>
          <Select value={String(period)} onChange={(event) => onPeriodChange(Number(event.currentTarget.value))}>
            <option value="7">Últimos 7 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
          </Select>
        </label>
      </div>
      {loading ? <Skeleton className="mt-4 h-40" /> : !data?.rows.length ? (
        <p className="mt-4 rounded-xl bg-surface-2 p-4 text-sm text-muted">No hay ejecuciones registradas para este periodo.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-2">Función / etapa</th><th className="px-3 py-2">Modelo observado</th><th className="px-3 py-2">Muestra</th><th className="px-3 py-2">Éxito</th><th className="px-3 py-2">Fallos</th><th className="px-3 py-2">p50 ejecución</th><th className="px-3 py-2">p95 ejecución</th><th className="px-3 py-2">Cola</th><th className="px-3 py-2">Revisión humana</th></tr></thead>
            <tbody className="divide-y divide-border">{data.rows.map((row) => {
              const total = row.successes + row.failures;
              const successRate = total ? Math.round((row.successes / total) * 100) : null;
              return <tr key={`${row.feature}:${row.stage}:${row.provider}:${row.model}`}><td className="px-3 py-3"><strong className="block">{row.feature}</strong><span className="text-xs text-muted">{row.stage}</span></td><td className="px-3 py-3"><strong className="block">{row.model || 'No registrado'}</strong><span className="text-xs text-muted">{row.provider || 'Proveedor desconocido'}</span></td><td className="px-3 py-3">{row.sample_size}</td><td className="px-3 py-3">{successRate === null ? 'Sin datos' : `${successRate}%`}</td><td className="px-3 py-3">{row.failures}</td><td className="px-3 py-3"><Duration value={row.p50_ms} /></td><td className="px-3 py-3"><Duration value={row.p95_ms} /></td><td className="px-3 py-3"><Duration value={row.queue_ms} /></td><td className="px-3 py-3"><Duration value={row.human_review_ms} /></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
