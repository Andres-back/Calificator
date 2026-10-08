import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StudentResourcePage } from './StudentResourcePage';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('./api', () => ({ getMaterial: mocks.get, pdfUrl: (id: string) => `/api/herramientas/${id}/pdf?descargar=true` }));
const content = { crucigrama: { grid: [['A', 'B']] }, preguntas_horizontales: [{ numero: 1, pista: 'Dos letras', fila: 0, columna: 0, longitud: 2 }] };
const material = { id: 'resource-1', titulo: 'Actividad de Ciencias', materia_id: 'subject-1', materia_nombre: 'Ciencias', tipo: 'crucigrama', asignacion_tipo: 'actividad', evaluacion_id: 'eval-1', contenido_json: content };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/app/recursos/resource-1']}><Routes><Route path="/app/recursos/:id" element={<StudentResourcePage />} /></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(material); });

describe('recurso estudiantil', () => {
  it.each(['crucigrama', 'emparejar', 'unir_columnas'])('uses the delivery player instead of a local solution/check form for %s', async (tipo) => {
    mocks.get.mockResolvedValue({ ...material, tipo });
    renderPage();
    const link = await screen.findByRole('link', { name: 'Resolver actividad' });
    expect(link).toHaveAttribute('href', '/app/evaluaciones/eval-1/resolver');
    expect(link.querySelector('button')).toBeNull();
    expect(screen.queryByRole('button', { name: /Ver solución|Verificar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Descargar PDF' }).querySelector('button')).toBeNull();
  });
  it('preserves support practice and identifies that it is not graded', async () => {
    mocks.get.mockResolvedValue({ ...material, asignacion_tipo: 'apoyo', evaluacion_id: null });
    renderPage();
    expect(await screen.findByRole('button', { name: 'Ver solución' })).toBeVisible();
    expect(screen.getByText(/No requiere entrega/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resolver actividad' })).not.toBeInTheDocument();
  });
  it('does not invent a delivery link when no evaluation is attached', async () => {
    mocks.get.mockResolvedValue({ ...material, evaluacion_id: null });
    renderPage();
    expect(await screen.findByText('Actividad no disponible para entregar')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Resolver actividad|Ir a entregar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver solución' })).not.toBeInTheDocument();
  });
});
