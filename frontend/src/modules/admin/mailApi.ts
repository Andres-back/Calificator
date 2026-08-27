import { api } from '@/lib/api';

export interface MailConfig {
  host: string;
  port: number;
  use_starttls: boolean;
  username: string;
  from_email: string;
  configured: boolean;
  has_password: boolean;
  source: string;
  last_test_status: string | null;
  last_test_latency_ms: number | null;
  last_test_error_code: string | null;
  last_test_at: string | null;
}

export interface MailConfigUpdate {
  host: string;
  port: number;
  use_starttls: boolean;
  username: string;
  from_email: string;
  password?: string;
}

export interface MailTestResult {
  status: string;
  detail: string;
  latency_ms: number | null;
  error_code: string | null;
}

export interface RecoveryStatus {
  pending: number;
  sent_last_24h: number;
  failed_last_24h: number;
}

export async function getMailConfig() {
  const { data } = await api.get<MailConfig>('/admin/mail/config');
  return data;
}

export async function saveMailConfig(payload: MailConfigUpdate) {
  const { data } = await api.put<MailConfig>('/admin/mail/config', payload);
  return data;
}

export async function testMailConfig() {
  const { data } = await api.post<MailTestResult>('/admin/mail/test');
  return data;
}

export async function getRecoveryStatus() {
  const { data } = await api.get<RecoveryStatus>('/admin/mail/recovery-status');
  return data;
}


