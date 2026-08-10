const PROVIDER_LABELS: Record<string, string> = {
  opencode: 'OpenCode Go',
  open_code: 'OpenCode Go',
  vision_router: 'OpenAI/Groq (contingencia)',
  llm_router: 'Cascada externa (contingencia)',
  comparator: 'Consolidador',
};

export function formatAIModelSource(stage: Record<string, unknown> | undefined): string {
  const provider = String(stage?.proveedor ?? '').trim();
  const model = String(stage?.modelo ?? '').trim();
  const providerLabel = PROVIDER_LABELS[provider] ?? provider;
  if (providerLabel && model && providerLabel !== model) return `${providerLabel} · ${model}`;
  return providerLabel || model || '—';
}