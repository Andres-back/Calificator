import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsPage } from './AnalyticsPage';

const http = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: http, toApiError: (error: Error) => ({ detail: error.message }) }));
vi.mock('@/stores/auth', () => ({ useAuth: (select: (state: unknown) => unknown) => select({ user: { id: 't1', rol: 'profesor', permissions: [] } }) }));
vi.mock('@/modules/materias/MateriaSelect', () => ({ useMaterias: () => ({ data: [] }) }));

const overview = (observed: Record<string, unknown>) => ({
  periodo: { desde: '2026-10-15', hasta: '2026-11-14' },
  evaluaciones_activas: 2,
  entregas: { total: 4, pendientes_revision: 1, confirmadas: 3, publicadas: 2 },
  ia: { coincidencia_exacta: 0.75, tasa_ajustes: 0.25, confianza_promedio: 0.8, incidencias_abiertas: 0 },
  productividad: { tiempo_revision_segundos: 0, tiempo_promedio_por_entrega: 0, tiempo_estimado_ahorrado_segundos: 0, entregas_con_tiempo: 0, tiempos_observados: observed },
});
const notAvailable = { metodo: 'observado', datos_suficientes: false, motivo_no_disponible: 'La medición observada no está habilitada.', tiempo_manual_promedio_ms: null, tiempo_asistido_promedio_ms: null, ahorro_ms: null, ahorro_porcentaje: null, cobertura: { unidades_comparables: 0, incertidumbre_ms: 0 } };
const evaluations = [{ id: 'e1', nombre: 'Ciclo del agua', estado: 'borrador', total_entregas: 4, pendientes: 1, confirmadas: 3, publicadas: 2, promedio: 3.4, tasa_aprobacion: 0.75 }];

function setup(observed: Record<string, unknown>) {
  http.get.mockImplementation(async (url: string) => {
    if (url === '/analytics/overview') return { data: overview(observed) };
    if (url === '/analytics/evaluaciones') return { data: evaluations };
    return { data: [] };
  });
  return render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AnalyticsPage /></QueryClientProvider></MemoryRouter>);
}

beforeEach(() => http.get.mockReset());

describe('190 Analítica sin métricas vacías ni jerga', () => {
  it('sin mediciones no muestra el ahorro ni la tarjeta de tiempo', async () => {
    setup(notAvailable);
    expect(await screen.findByText('Coincidiste con la IA')).toBeInTheDocument();
    expect(screen.queryByText('Ahorro observado')).not.toBeInTheDocument();
    expect(screen.queryByText('Tiempo ahorrado')).not.toBeInTheDocument();
    expect(screen.queryByText('Tiempo docente observado')).not.toBeInTheDocument();
    expect(screen.queryByText(/La medición observada no está habilitada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/línea base/)).not.toBeInTheDocument();
  });

  it('con mediciones muestra cuánto tiempo ahorra la IA', async () => {
    setup({ ...notAvailable, datos_suficientes: true, motivo_no_disponible: null, tiempo_manual_promedio_ms: 180000, tiempo_asistido_promedio_ms: 60000, ahorro_ms: 120000, ahorro_porcentaje: 67, cobertura: { unidades_comparables: 5, incertidumbre_ms: 0 } });
    expect(await screen.findByText('Tiempo ahorrado')).toBeInTheDocument();
    expect(screen.getByText('Tiempo que te ahorra la IA')).toBeInTheDocument();
  });

  it('en celular las evaluaciones son tarjetas legibles con el estado traducido', async () => {
    setup(notAvailable);
    const cards = await screen.findByRole('list', { name: 'Evaluaciones recientes' });
    expect(cards).toHaveClass('sm:hidden');
    const card = within(cards).getByRole('listitem');
    expect(card).toHaveTextContent('Ciclo del agua');
    expect(card).toHaveTextContent('Borrador');
    expect(card).toHaveTextContent('Por revisar');
    expect(card).toHaveTextContent('75 %');
  });
});
