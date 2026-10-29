import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { PreviousGradeReference } from './PreviousGradeReference';

const load = vi.hoisted(() => vi.fn());
vi.mock('../api', () => ({ listGradingRevisions: load }));

it.each([{ unexpected: 'synthetic' }, [null], 'unexpected'])('rejects malformed history including cached data without crashing the grade review: %j', async (invalid) => {
  load.mockResolvedValue(invalid);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['grading-revisions','synthetic'],invalid);
  render(<QueryClientProvider client={client}>
    <PreviousGradeReference gradeId="synthetic" enabled onOpenHistory={vi.fn()} />
  </QueryClientProvider>);
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos consultar el historial');
  expect(screen.getByRole('button', { name: 'Consultar de nuevo' })).toBeEnabled();
});
