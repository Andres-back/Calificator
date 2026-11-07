// Browser-only synthetic harness (Spec 157). Not imported by the application/build.
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DigitalizarEvaluacionModal } from '../../src/modules/evaluaciones/components/DigitalizarEvaluacionModal';

export function mount() {
  const app = document.getElementById('root'); if (app) app.style.display = 'none';
  const container = document.createElement('div'); container.id = 'digitalization-scan-harness'; document.body.append(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  createRoot(container).render(<QueryClientProvider client={client}>
    <DigitalizarEvaluacionModal open materiaId="00000000-0000-4000-8000-000000000157" onClose={() => undefined} onCompleted={() => undefined} />
  </QueryClientProvider>);
}
