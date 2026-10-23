import { useState } from 'react';
import { Button, Card, Field, Input, Select } from '@/components/ui';
import { toApiError } from '@/lib/api';
import {
  discoverCompatibleModels, prepareCompatibleConnection, probeCompatibleModel,
  type AIModel, type AIProvider, type ModelRuntimeProfile,
} from '../../api';

type Props = {
  providers: AIProvider[];
  models: AIModel[];
  onProvider: (provider: AIProvider) => void;
  onModels: (models: AIModel[]) => void;
};

export function CompatibleAPISection({ providers, models, onProvider, onModels }: Props) {
  const [providerId, setProviderId] = useState('');
  const [rotationId, setRotationId] = useState('');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [modelId, setModelId] = useState('');
  const [vision, setVision] = useState(false);
  const [profile, setProfile] = useState<ModelRuntimeProfile>({ protocol: 'chat_completions', auth_style: 'auto' });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const provider = providers.find((p) => p.id === providerId);

  async function run(action: string, operation: () => Promise<void>) {
    if (busy) return;
    setBusy(action);
    setMessage('');
    try { await operation(); }
    catch (error) { setMessage(toApiError(error).detail); }
    finally { setBusy(null); }
  }

  function selectModel(value: string) {
    setModelId(value);
    const existing = models.find((m) => m.provider_id === providerId && m.model_id === value);
    if (existing) {
      setVision(existing.capabilities.includes('vision'));
      setProfile(existing.runtime_profile ?? { protocol: 'chat_completions', auth_style: 'auto' });
    }
  }

  return (
    <Card className="space-y-5 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-bold">APIs compatibles y formatos de modelos</h2>
        <p className="mt-1 text-sm text-muted">Conecta una API directa o un gateway. Cambiar un modelo compatible no requiere modificar el programa. La clave queda cifrada; solo se publica la selección después de comprobarla.</p>
      </div>
      <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-4">
        <details className="rounded-lg border border-border p-3">
          <summary className="min-h-11 cursor-pointer font-semibold">Añadir una API o actualizar su clave</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Conexión que preparar">
              <Select value={rotationId} onChange={(event) => {
                const id = event.currentTarget.value;
                setRotationId(id);
                const selected = providers.find((p) => p.id === id);
                setLabel(selected?.label ?? ''); setUrl(selected?.base_url ?? '');
              }}>
                <option value="">Nueva conexión independiente</option>
                {providers.filter((p) => p.tipo === 'texto' && p.credential_revision).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </Field>
            <Field label="Nombre de la conexión"><Input value={label} onChange={(e) => setLabel(e.currentTarget.value)} placeholder="Mi API directa" /></Field>
            <Field label="URL HTTPS de la API"><Input type="url" value={url} onChange={(e) => setUrl(e.currentTarget.value)} placeholder="https://api.proveedor.com/v1" /></Field>
            <Field label="Clave de esta API"><Input type="password" autoComplete="new-password" value={secret} onChange={(e) => setSecret(e.currentTarget.value)} /></Field>
          </div>
          <p className="my-3 text-xs text-muted">Cada conexión usa su propia clave. Preparar una nueva clave no cambia los trabajos ni las rutas ya publicados; prueba de nuevo sus modelos en uso y guarda los cambios. Las claves del adaptador original se gestionan por separado, más abajo.</p>
          <Button variant="outline" disabled={!label.trim() || !url.trim() || !secret.trim() || Boolean(busy)} loading={busy === 'connection'} onClick={() => void run('connection', async () => {
            const created = await prepareCompatibleConnection({ label: label.trim(), base_url: url.trim(), api_key: secret }, rotationId || undefined);
            setSecret(''); onProvider(created); setProviderId(created.id);
            setMessage('Conexión preparada. Consulta o escribe un modelo y comprueba su formato antes de publicar.');
          })}>Preparar conexión</Button>
        </details>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="API para el modelo">
            <Select value={providerId} onChange={(e) => { setProviderId(e.currentTarget.value); setModelId(''); setMessage(''); }}>
              <option value="">Selecciona una conexión</option>
              {providers.filter((p) => p.tipo === 'texto' && p.base_url).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <div className="flex items-end"><Button variant="outline" disabled={!provider || Boolean(busy)} loading={busy === 'catalog'} onClick={() => void run('catalog', async () => {
            if (!provider) return;
            const catalog = await discoverCompatibleModels(provider);
            onModels(catalog.map((entry) => {
              const prior = models.find((m) => m.provider_id === entry.provider_id && m.model_id === entry.model_id);
              return prior ? { ...entry, capabilities: [...new Set([...entry.capabilities, ...prior.capabilities])], runtime_profile: prior.runtime_profile, verification_id: prior.verification_id } : entry;
            }));
            setMessage(`${catalog.length} modelos consultados. Si tu API no ofrece catálogo, puedes escribir el identificador exacto.`);
          })}>Consultar modelos disponibles</Button></div>
          <Field label="Modelo (identificador exacto)">
            <Input list="compatible-api-models" value={modelId} onChange={(e) => selectModel(e.currentTarget.value)} placeholder="Selecciona del catálogo o escribe el modelo" />
          </Field>
          <datalist id="compatible-api-models">{models.filter((m) => m.provider_id === providerId && m.active).map((m) => <option key={m.model_id} value={m.model_id}>{m.label}</option>)}</datalist>
          <Field label="Formato de la API">
            <Select value={profile.protocol} onChange={(e) => setProfile({ ...profile, protocol: e.currentTarget.value as ModelRuntimeProfile['protocol'], reasoning_effort: null, thinking: null })}>
              <option value="chat_completions">Chat Completions</option><option value="responses">Responses</option><option value="messages">Messages</option>
            </Select>
          </Field>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={vision} onChange={(e) => setVision(e.currentTarget.checked)} />El modelo recibe imágenes (se comprobará con una imagen ficticia)</label>
        <details className="rounded-lg border border-border p-3">
          <summary className="min-h-11 cursor-pointer font-semibold">Opciones avanzadas del formato</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Ruta relativa (opcional)"><Input value={profile.endpoint ?? ''} onChange={(e) => setProfile({ ...profile, endpoint: e.currentTarget.value || null })} placeholder="Automática según el formato" /></Field>
            <Field label="Autenticación"><Select value={profile.auth_style ?? 'auto'} onChange={(e) => setProfile({ ...profile, auth_style: e.currentTarget.value as ModelRuntimeProfile['auth_style'] })}><option value="auto">Automática según el formato</option><option value="bearer">Bearer</option><option value="api_key">API key (Messages)</option></Select></Field>
            {profile.protocol !== 'messages' && <Field label="Esfuerzo de razonamiento"><Select value={profile.reasoning_effort ?? ''} onChange={(e) => setProfile({ ...profile, reasoning_effort: (e.currentTarget.value || null) as ModelRuntimeProfile['reasoning_effort'] })}><option value="">Decide el proveedor</option>{['none', 'minimal', 'low', 'medium', 'high'].map((v) => <option key={v} value={v}>{v}</option>)}</Select></Field>}
            {profile.protocol !== 'responses' && <Field label="Modo de pensamiento"><Select value={profile.thinking ?? ''} onChange={(e) => setProfile({ ...profile, thinking: (e.currentTarget.value || null) as ModelRuntimeProfile['thinking'] })}><option value="">Decide el proveedor</option><option value="disabled">Desactivado</option><option value="enabled">Activado</option></Select></Field>}
            {profile.protocol === 'chat_completions' && <Field label="Parámetro del límite de salida"><Select value={profile.chat_token_field ?? 'max_tokens'} onChange={(e) => setProfile({ ...profile, chat_token_field: e.currentTarget.value as ModelRuntimeProfile['chat_token_field'] })}><option value="max_tokens">max_tokens</option><option value="max_completion_tokens">max_completion_tokens</option></Select></Field>}
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={profile.send_temperature ?? false} onChange={(e) => setProfile({ ...profile, send_temperature: e.currentTarget.checked })} />Enviar temperatura cuando el modelo la admita</label>
        </details>
        <Button disabled={!provider || !modelId.trim() || Boolean(busy)} loading={busy === 'probe'} onClick={() => void run('probe', async () => {
          if (!provider) return;
          const model: AIModel = { provider_id: provider.id, model_id: modelId.trim(), label: modelId.trim(), capabilities: vision ? ['text', 'vision'] : ['text'], recommended: false, active: true, runtime_profile: profile };
          const result = await probeCompatibleModel(provider, model);
          if (result.status === 'ok' && result.provider && result.model) { onProvider(result.provider); onModels([result.model]); }
          setMessage(`${result.detail}${result.status === 'ok' ? ` (${(result.latency_ms / 1000).toFixed(1)} s). Ahora puedes seleccionarlo por función y guardar los cambios.` : ''}`);
        })}>Probar y preparar modelo</Button>
        <p className="text-xs text-muted">Una sola solicitud por prueba; puede tener costo. No utiliza fotos ni información de estudiantes. Admite estos tres formatos compatibles, no protocolos propietarios diferentes. Imágenes generadas y embeddings conservan sus adaptadores.</p>
      </fieldset>
      {message && <p role="status" className="break-words rounded-lg bg-surface-2 p-3 text-sm">{message}</p>}
    </Card>
  );
}
