import { ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui';
import type { UsageStats } from '../../api';

export function OverviewSection({
  activeConfiguredCount,
  totalProviders,
  usage,
}: {
  activeConfiguredCount: number;
  totalProviders: number;
  usage: UsageStats;
}) {
  return (
    <Card className="flex items-start gap-3 p-5">
      <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500" />
      <div>
        <p className="font-semibold">Estado general de IA</p>
        <p className="mt-1 text-sm text-muted">
          {activeConfiguredCount} de {totalProviders} proveedores activos y configurados · {usage.total_calls} llamadas registradas · costo estimado: ${usage.total_cost.toFixed(4)}.
        </p>
      </div>
    </Card>
  );
}
