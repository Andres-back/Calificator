import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cpu } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import type { AIProvider } from '../../api';
import { ProvidersSection } from './ProvidersSection';

const provider: AIProvider = {
  id: 'ollama_internal', name: 'ollama_internal', tipo: 'embedding', label: 'Ollama Embeddings',
  active: true, base_url: 'http://ollama:11434', model: 'qwen3-embedding:0.6b', priority: 1,
  timeout_seconds: 30, max_retries: 0, auth_configured: false,
};

function show(changes: Partial<AIProvider> = {}, testing = false) {
  const onTest = vi.fn();
  render(<ProvidersSection title="Embeddings" icon={Cpu} providers={[{ ...provider, ...changes }]}
    testingProvider={testing ? provider.id : null} isTesting={testing} onUpdate={vi.fn()}
    onTest={onTest} onRefreshModels={vi.fn()} refreshingProvider={null} />);
  return onTest;
}

describe('ProvidersSection internal embeddings', () => {
  it('identifies internal configuration without pretending a connection was checked', async () => {
    const onTest = show();
    expect(screen.getByText('Servicio interno')).toBeInTheDocument();
    expect(screen.queryByText('Sin configurar')).not.toBeInTheDocument();
    expect(screen.queryByText('Permitir API propia del docente')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actualizar modelos/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('URL base')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    expect(onTest).toHaveBeenCalledWith('ollama_internal');
  });

  it('shows a successful probe and its measured latency', () => {
    show({ last_test_status: 'ok', last_test_latency_ms: 5200, last_test_http_code: 200 });
    expect(screen.getByText('Conexión comprobada')).toBeInTheDocument();
    expect(screen.getByText('5200 ms')).toBeInTheDocument();
    expect(screen.getByText('HTTP 200')).toBeInTheDocument();
  });

  it('shows failure and keeps retry available', () => {
    show({ last_test_status: 'error', last_test_error: 'El servicio no respondió' });
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('El servicio no respondió')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeEnabled();
  });

  it('disables duplicate probes while one is running', () => {
    show({}, true);
    expect(screen.getByRole('button', { name: /Probar conexión/ })).toBeDisabled();
  });

  it('keeps inactive state even when previous probe succeeded', () => {
    show({ active: false, last_test_status: 'ok' });
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('still requires credentials for Ollama Cloud', () => {
    show({ id: 'ollama', name: 'ollama', label: 'Ollama Cloud' });
    expect(screen.getByText('Sin configurar')).toBeInTheDocument();
    expect(screen.getByText('Permitir API propia del docente')).toBeInTheDocument();
  });

  it('does not equate a configured cloud key with a checked connection', () => {
    show({ id: 'ollama', name: 'ollama', label: 'Ollama Cloud', auth_configured: true });
    expect(screen.getByText('Configurado')).toBeInTheDocument();
    expect(screen.queryByText('Conexión comprobada')).not.toBeInTheDocument();
  });
});
