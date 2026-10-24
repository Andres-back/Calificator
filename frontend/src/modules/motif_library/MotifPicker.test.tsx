import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MotifPicker } from './MotifPicker';
import { listCollections, listMotifs } from './api';
vi.mock('./api', () => ({ listCollections: vi.fn(), listMotifs: vi.fn() }));
const collections = [{ id: 'general', label: 'Generales', total: 20 }, { id: 'matematicas', label: 'Matemáticas', total: 30 }];
const items = Array.from({ length: 12 }, (_, i) => ({ id: `matematicas-${i + 1}`, collection_id: 'matematicas', label: `Diseño ${i + 1}`, description: 'Ilustración temática', thumbnail_url: `/thumb-${i + 1}`, full_url: `/full-${i + 1}`, width: 1024, height: 1024 }));
function setup() {
  const onSelect = vi.fn();
  const onCancel = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MotifPicker suggestedArea="Matemáticas" onSelect={onSelect} onCancel={onCancel} /></QueryClientProvider>);
  return { onSelect, onCancel };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listCollections).mockResolvedValue({ catalog_version: 'test', collections });
  vi.mocked(listMotifs).mockImplementation(async (collection, offset = 0) => ({ catalog_version: 'test', collection, total: 30, offset, limit: 12, items }));
});
describe('progressive motif picker', () => {
  it('loads at most twelve thumbnails and only the current collection', async () => {
    const { onSelect } = setup();
    expect(await screen.findByRole('button', { name: 'Diseño 1' })).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(12);
    expect(listMotifs).toHaveBeenCalledWith('matematicas', 0);
    expect(screen.getByText('1–12 de 30')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Diseño 1' }));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });
  it('pages and changes collection without selecting or saving anything', async () => {
    const { onSelect, onCancel } = setup();
    await screen.findByRole('button', { name: 'Diseño 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente página de motivos' }));
    await waitFor(() => expect(listMotifs).toHaveBeenCalledWith('matematicas', 12));
    fireEvent.change(screen.getByLabelText('Área de los motivos'), { target: { value: 'general' } });
    await waitFor(() => expect(listMotifs).toHaveBeenCalledWith('general', 0));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar selección' }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });
  it('explains failure and offers retry, not generation', async () => {
    vi.mocked(listMotifs).mockRejectedValue(new Error('network'));
    setup();
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los motivos');
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
