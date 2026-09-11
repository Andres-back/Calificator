import { useMemo, useState } from 'react';
import { PauseCircle, PlayCircle, Search, Wrench } from 'lucide-react';
import { Badge, Card, Field, Input, Select } from '@/components/ui';
import type { AIModel, AIProvider, AIToolControl, FeatureRouting } from '../../api';

function compatibleModels(models: AIModel[], provider: string) {
  return models.filter((model) => model.provider_id === provider && model.active && model.capabilities.includes('text'));
}

export function ToolsSection({ tools, providers, models, features, onToolChange, onRouteUpsert, onRouteRemove }: {
  tools: AIToolControl[];
  providers: AIProvider[];
  models: AIModel[];
  features: FeatureRouting[];
  onToolChange: (toolId: string, changes: Partial<AIToolControl>) => void;
  onRouteUpsert: (feature: FeatureRouting) => void;
  onRouteRemove: (featureId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    return query ? tools.filter((tool) => `${tool.label} ${tool.category} ${tool.description}`.toLocaleLowerCase('es').includes(query)) : tools;
  }, [search, tools]);
  const parent = features.find((feature) => feature.feature === 'herramientas_educativas');

  return (
    <section className="space-y-4" aria-labelledby="tools-control-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 id="tools-control-title" className="font-display text-xl font-extrabold">Herramientas disponibles</h2><p className="mt-1 text-sm text-muted">Pausar bloquea generaciones nuevas; los materiales existentes siguen intactos.</p></div>
        <label className="relative block w-full sm:max-w-xs"><span className="sr-only">Buscar herramienta</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Buscar herramienta" /></label>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((tool) => {
          const routeId = `herramienta.${tool.tool_id}`;
          const route = features.find((feature) => feature.feature === routeId);
          const provider = route?.primary_provider ?? parent?.primary_provider ?? '';
          const availableProviders = providers.filter((item) => item.active && compatibleModels(models, item.id).length > 0);
          return (
            <Card key={tool.tool_id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"><Wrench className="h-5 w-5" /></span><div><h3 className="font-bold">{tool.label}</h3><p className="text-sm text-muted">{tool.description}</p></div></div><Badge tone={tool.generation_enabled ? 'success' : 'warning'}>{tool.generation_enabled ? 'Activa' : 'Pausada'}</Badge></div>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3 text-sm font-semibold">
                <span className="flex items-center gap-2">{tool.generation_enabled ? <PlayCircle className="h-4 w-4 text-emerald-600" /> : <PauseCircle className="h-4 w-4 text-amber-600" />} Nuevas generaciones</span>
                <input type="checkbox" checked={tool.generation_enabled} onChange={(event) => onToolChange(tool.tool_id, { generation_enabled: event.currentTarget.checked, pause_reason: event.currentTarget.checked ? null : tool.pause_reason })} className="h-5 w-5 accent-brand-600" />
              </label>
              {!tool.generation_enabled && <Field label="Motivo de la pausa"><Input value={tool.pause_reason ?? ''} onChange={(event) => onToolChange(tool.tool_id, { pause_reason: event.currentTarget.value })} placeholder="Ejemplo: mantenimiento del generador" /></Field>}
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={Boolean(route)} onChange={(event) => {
                if (!event.currentTarget.checked) return onRouteRemove(routeId);
                if (!parent) return;
                onRouteUpsert({ ...parent, feature: routeId, label: tool.label, config_version: parent.config_version });
              }} className="h-4 w-4 accent-brand-600" /> Usar modelo propio para esta herramienta</label>
              {route && <div className="grid gap-3 sm:grid-cols-2"><Field label="Proveedor"><Select value={route.primary_provider} onChange={(event) => {
                const nextProvider = event.currentTarget.value;
                const first = compatibleModels(models, nextProvider).find((model) => model.recommended) ?? compatibleModels(models, nextProvider)[0];
                onRouteUpsert({ ...route, primary_provider: nextProvider, primary_model: first?.model_id ?? null });
              }}>{availableProviders.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field><Field label="Modelo"><Select value={route.primary_model ?? ''} onChange={(event) => onRouteUpsert({ ...route, primary_model: event.currentTarget.value || null })}>{compatibleModels(models, provider).map((model) => <option key={model.model_id} value={model.model_id}>{model.label}</option>)}</Select></Field></div>}
              {!route && <p className="text-xs text-muted">Hereda la configuración general de recursos educativos.</p>}
            </Card>
          );
        })}
      </div>
      {visible.length === 0 && <Card className="p-6 text-center text-sm text-muted">No encontramos una herramienta con ese nombre.</Card>}
    </section>
  );
}
