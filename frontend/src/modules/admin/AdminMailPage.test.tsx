import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminMailConfigPage } from './AdminMailConfigPage';

const mail = vi.hoisted(() => ({
  getConfig: vi.fn(),
  getStatus: vi.fn(),
  save: vi.fn(),
  test: vi.fn(),
}));
vi.mock('./mailApi', () => ({
  getMailConfig: mail.getConfig,
  getRecoveryStatus: mail.getStatus,
  saveMailConfig: mail.save,
  testMailConfig: mail.test,
}));

describe('AdminMailConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mail.getConfig.mockResolvedValue({
      host: 'smtp.gmail.com',
      port: 587,
      use_starttls: true,
      username: 'configured@example.com',
      from_email: 'configured@example.com',
      configured: true,
      has_password: true,
      source: 'database',
      last_test_status: null,
      last_test_latency_ms: null,
      last_test_error_code: null,
      last_test_at: null,
    });
    mail.getStatus.mockResolvedValue({
      pending: 0,
      sent_last_24h: 1,
      failed_last_24h: 0,
    });
  });

  it('shows only password presence and never renders the stored secret', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <AdminMailConfigPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Configurado')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Clave configurada/)).toHaveValue('');
    expect(screen.queryByDisplayValue(/secret|password/i)).not.toBeInTheDocument();
  });
});