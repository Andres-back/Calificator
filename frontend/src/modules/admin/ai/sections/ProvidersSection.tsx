import { Activity, Cpu, ImageIcon, Server, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import { Badge, Button, Card, Field, Input } from '@/components/ui';
import type { AIProvider } from '../../api';

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  open_code: Sparkles,
  groq: Activity,
  ollama: Server,
  template: ShieldCheck,
  openai_image: ImageIcon,
  cloudflare_image: Cpu,
};

function providerStatus(provider: AIProvider) {
  if (!provider.active) return <Badge tone="neutral">Inactivo</Badge>;
  if (provider.last_test_status === 'error' || provider.last_test_error) return <Badge tone="error">Error</Badge>;
  if (provider.auth_configured) return <Badge tone="success">Disponible</Badge>;
  return <Badge tone="warning">Sin configurar</Badge>;
}

function ProviderEditor({
  provider,
  isTesting,
  testsDisabled,
  onUpdate,
  onTest,
}: {
  provider: AIProvider;
  isTesting: boolean;
  testsDisabled: boolean;
  onUpdate: (providerId: string, changes: Partial<AIProvider>) => void;
  onTest: (providerId: string) => void;
}) {
  const Icon = PROVIDER_ICONS[provider.id] ?? Cpu;
  const isTemplate = provider.id === 'template';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-200">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">{provider.label}</p>
            <p className="text-xs text-muted">{provider.id}</p>
          </div>
        </div>
        {providerStatus(provider)}
      </div>

      <div className="mt-4 space-y-3">
        <Field label="Modelo">
          <Input
            value={provider.model ?? ''}
            onChange={(event) => onUpdate(provider.id, { model: event.currentTarget.value || null })}
            placeholder="Modelo configurado"
            disabled={isTemplate}
          />
        </Field>
        <Field label="Prioridad" hint={isTemplate ? 'El fallback por plantilla permanece al final.' : 'Un número menor se intenta primero.'}>
          <Input
            type="number"
            min={1}
            value={provider.priority}
            onChange={(event) => onUpdate(provider.id, { priority: Math.max(1, Number(event.currentTarget.value) || 1) })}
            disabled={isTemplate}
          />
        </Field>
      </div>

      <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface-2/60 p-3 text-sm">
        <span>
          <span className="block font-semibold">Proveedor activo</span>
          <span className="block text-xs text-muted">{isTemplate ? 'Fallback obligatorio de seguridad.' : 'Disponible para el ruteo de IA.'}</span>
        </span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-600 focus-ring"
          checked={provider.active}
          onChange={(event) => onUpdate(provider.id, { active: event.currentTarget.checked })}
          disabled={isTemplate}
          aria-label={`Activar ${provider.label}`}
        />
      </label>

      {!isTemplate && (
        <details className="mt-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2">
          <summary className="cursor-pointer text-sm font-semibold text-fg">Ajustes avanzados</summary>
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            {provider.id !== 'cloudflare_image' && (
              <Field label="URL base" hint="Cámbiala solo si usas un gateway o despliegue compatible.">
                <Input
                  type="url"
                  value={provider.base_url ?? ''}
                  onChange={(event) => onUpdate(provider.id, { base_url: event.currentTarget.value || null })}
                  placeholder="https://api.proveedor.com/v1"
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timeout (s)">
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={provider.timeout_seconds}
                  onChange={(event) => onUpdate(provider.id, { timeout_seconds: Math.min(300, Math.max(5, Number(event.currentTarget.value) || 5)) })}
                />
              </Field>
              <Field label="Reintentos">
                <Input
                  type="number"
                  min={0}
                  max={5}
                  value={provider.max_retries}
                  onChange={(event) => onUpdate(provider.id, { max_retries: Math.min(5, Math.max(0, Number(event.currentTarget.value) || 0)) })}
                />
              </Field>
            </div>
          </div>
        </details>
      )}

      {provider.last_test_error && (
        <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{provider.last_test_error}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{provider.last_test_latency_ms != null ? `${provider.last_test_latency_ms} ms` : 'Sin latencia registrada'}</span>
        <span>{provider.last_test_http_code ? `HTTP ${provider.last_test_http_code}` : ''}</span>
      </div>
      <Button size="sm" variant="outline" className="mt-3 w-full" loading={isTesting} disabled={testsDisabled} onClick={() => onTest(provider.id)}>
        Probar conexión
      </Button>
    </Card>
  );
}

export function ProvidersSection({
  title,
  icon: Icon,
  providers,
  testingProvider,
  isTesting,
  onUpdate,
  onTest,
}: {
  title: string;
  icon: LucideIcon;
  providers: AIProvider[];
  testingProvider: string | null;
  isTesting: boolean;
  onUpdate: (providerId: string, changes: Partial<AIProvider>) => void;
  onTest: (providerId: string) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-brand-500" />
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderEditor
            key={provider.id}
            provider={provider}
            isTesting={isTesting && testingProvider === provider.id}
            testsDisabled={isTesting}
            onUpdate={onUpdate}
            onTest={onTest}
          />
        ))}
      </div>
    </section>
  );
}
