import { Button, Select } from '@/components/ui';
import type { AIModel, AIProvider, FeatureRouting } from '../../api';
import { routePreparationIssues, type ModelPreparationSelection } from '../utils/routePreparation';

export function RouteModelReadiness({ route, previous, providers, models, onUpsert, onPrepare }: {
  route: FeatureRouting; previous?: FeatureRouting; providers: AIProvider[]; models: AIModel[];
  onUpsert: (route: FeatureRouting) => void; onPrepare?: (selection: ModelPreparationSelection) => void;
}) {
  const issues = routePreparationIssues(route, previous, providers, models);
  if (!issues.length) return null;
  const alternatives = models.filter((m) => m.active && m.runtime_profile && m.verification_id && m.capabilities.includes(route.capability ?? 'text')
    && providers.some((p) => p.id === m.provider_id && p.active && p.auth_configured)
    && !(m.provider_id === route.primary_provider && m.model_id === route.primary_model));
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
      <p className="font-semibold">Falta preparar esta selección antes de guardar</p>
      {issues.map((issue) => {
        const provider = providers.find((p) => p.id === issue.providerId);
        const native = issue.providerId === 'ollama';
        return <div key={issue.slot} className="space-y-2">
          <p><strong>{issue.slot === 'primary' ? 'Principal' : 'Respaldo'}: {issue.label}.</strong> {native ? 'Este modelo usa otro formato y no puede combinarse con la otra selección. Elige un modelo comprobado en el selector.' : 'Comprueba su conexión y formato con una prueba ficticia desde aquí.'}</p>
          {onPrepare && !native && provider?.base_url && <Button size="sm" variant="outline" onClick={() => onPrepare(issue)}>Comprobar modelo {issue.slot === 'primary' ? 'principal' : 'de respaldo'}</Button>}
          {issue.slot === 'fallback' && <div className="flex flex-col gap-2 sm:flex-row">
            {alternatives.length > 0 && <Select aria-label="Elegir respaldo comprobado" className="min-w-0 sm:max-w-sm" value="" onChange={(e) => {
              const chosen = alternatives.find((m) => JSON.stringify([m.provider_id, m.model_id]) === e.currentTarget.value);
              if (chosen) onUpsert({ ...route, fallback_provider: chosen.provider_id, fallback_model: chosen.model_id });
            }}><option value="">Elegir respaldo comprobado…</option>{alternatives.map((m) => <option key={`${m.provider_id}:${m.model_id}`} value={JSON.stringify([m.provider_id, m.model_id])}>{providers.find((p) => p.id === m.provider_id)?.label} · {m.label}</option>)}</Select>}
            <Button size="sm" variant="outline" onClick={() => onUpsert({ ...route, fallback_provider: null, fallback_model: null })}>Quitar respaldo</Button>
          </div>}
        </div>;
      })}
      <p className="text-xs">La configuración actual seguirá funcionando hasta que confirmes «Guardar cambios». No quitaremos ni cambiaremos un respaldo sin que lo elijas.</p>
    </div>
  );
}
