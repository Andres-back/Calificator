import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { PreviousGradeReference } from './PreviousGradeReference';

const history = vi.hoisted(() => vi.fn());
vi.mock('../api', () => ({ listGradingRevisions: history }));
beforeEach(() => { history.mockReset(); history.mockResolvedValue([]); });
function setup(enabled = true) {
  const open = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <PreviousGradeReference gradeId="synthetic" enabled={enabled} onOpenHistory={open} />
  </QueryClientProvider>);
  return open;
}
it('finds zero behind recent empty retries and labels it as reference, not current grade', async () => {
  history.mockResolvedValue([{ nota_anterior: null }, { nota_anterior: '' }, { nota_anterior: 'NaN' }, { nota_anterior: '0', created_at: '2026-10-28T00:00:00' }, { nota_anterior: 4 }]);
  const open = setup();
  expect(await screen.findByText('0.0')).toBeInTheDocument();
  expect(screen.getByText(/solo referencia/i)).toBeInTheDocument();
  expect(screen.getByText(/no es una nota vigente/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver historial' }));
  expect(open).toHaveBeenCalledOnce();
});
it('never requests private history when not authorized or a current score exists', () => {
  setup(false);
  expect(history).not.toHaveBeenCalled();
  expect(screen.queryByText(/solo referencia/i)).not.toBeInTheDocument();
});
it('empty or invalid history does not invent a score', async () => {
  history.mockResolvedValue([{ nota_anterior: true }, { nota_anterior: ' ' }, { nota_anterior: Infinity }, { nota_anterior: -1 }]);
  setup();
  expect(await screen.findByText(/No hay una nota anterior/i)).toBeInTheDocument();
});
it('history error does not erase data and offers a read-only retry', async () => {
  history.mockRejectedValueOnce(new Error('synthetic'));
  setup();
  expect(await screen.findByRole('alert')).toHaveTextContent(/historial/i);
  history.mockResolvedValue([{ nota_anterior: '3.5' }]);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar de nuevo' }));
  expect(await screen.findByText('3.5')).toBeInTheDocument();
});
