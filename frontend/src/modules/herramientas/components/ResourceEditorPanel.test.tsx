import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ResourceEditorPanel } from './ResourceEditorPanel';
import type { Material } from '@/types/api';
import { editMaterial } from '../api';
vi.mock('../api', () => ({ editMaterial: vi.fn() }));
vi.mock('@/modules/motif_library/MotifPicker', () => ({ MotifPicker: ({ onSelect }: { onSelect: (motif: object) => void }) => <button onClick={() => onSelect({ id: 'naturales-001', label: 'Semilla', full_url: '/api/biblioteca-motivos/archivos/naturales-001/full/' + 'a'.repeat(64) })}>Elegir semilla de biblioteca</button> }));
const material: Material = { id: 'a', tipo: 'guia', titulo: 'Original', contenido_json: { texto: 'Texto original', puntaje: 0.625, _xcalificator: { preserved: true } }, materia_id: null, materia_nombre: null, archivo_url: null, created_at: '' };
function setup() {
  const close = vi.fn();
  const router = createMemoryRouter([{ path: '/', element: <ResourceEditorPanel material={material} onClose={close} /> }, { path: '/next', element: <p>Otro recurso</p> }]);
  render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
  return { close, router };
}
describe('resource editor exit guards', () => {
  it('sends decoration alone without resaving title, questions or criteria', async () => {
    const { close } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir decoración' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir semilla de biblioteca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(editMaterial).toHaveBeenCalledWith('a', { decoracion: { motif_id: 'naturales-001', placement: 'header' } }));
    await waitFor(() => expect(close).toHaveBeenCalled());
    expect(material.contenido_json).toEqual({ texto: 'Texto original', puntaje: 0.625, _xcalificator: { preserved: true } });
  });
  it('focuses criteria without scrolling outer ancestors', async () => {
    const outerScroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
    const criterionMaterial = { ...material, contenido_json: { ...material.contenido_json, criterios: [{ nombre: 'Comprende', descripcion: 'Explica', peso_porcentaje: 100 }] } };
    const router = createMemoryRouter([{ path: '/', element: <ResourceEditorPanel material={criterionMaterial} criteria onClose={() => {}} /> }]);
    render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
    const section = document.querySelector('[data-resource-field="criterios"]');
    await waitFor(() => expect(section).toHaveFocus());
    expect(outerScroll).not.toHaveBeenCalled();
    outerScroll.mockRestore();
  });
  it('closes a clean editor without asking', () => {
    const { close } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(close).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument();
  });
  it('guards reload and navigation while preserving exact numbers and hidden metadata', async () => {
    const { router } = setup();
    fireEvent.change(screen.getByLabelText('Texto'), { target: { value: 'Nuevo texto' } });
    expect(screen.getByLabelText('Puntaje')).toHaveValue(0.625);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await act(async () => { await router.navigate('/next'); });
    const confirmation = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Texto')).toHaveValue('Nuevo texto');
    expect(router.state.location.pathname).toBe('/');
    await act(async () => { await router.navigate('/next'); });
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Descartar los cambios?' })).getByRole('button', { name: 'Descartar cambios' }));
    await waitFor(() => expect(screen.getByText('Otro recurso')).toBeInTheDocument());
    expect(material.contenido_json).toEqual({ texto: 'Texto original', puntaje: 0.625, _xcalificator: { preserved: true } });
  });
});
