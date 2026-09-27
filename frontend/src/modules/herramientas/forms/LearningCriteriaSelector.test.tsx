import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PedagogicalApproachSelector, useBaseForm } from './base';

const api = vi.hoisted(() => ({
  getLearningCriteriaCapabilities: vi.fn(),
  listLearningCriteria: vi.fn(),
}));

vi.mock('@/modules/materias/criterios/api', () => api);
vi.mock('@/modules/materias/dbaApi', () => ({
  listDbaCombinado: vi.fn().mockResolvedValue([]),
}));

function Harness({ onGenerate }: { onGenerate: (payload: Record<string, unknown>) => void }) {
  const form = useBaseForm({
    titulo: 'Guía de lectura',
    tema: 'Idea principal',
    materia_id: 'materia-1',
  });
  return (
    <>
      <PedagogicalApproachSelector base={form.base} set={form.set} />
      <button type="button" disabled={!form.valid} onClick={() => onGenerate(form.payload())}>Generar</button>
    </>
  );
}

describe('criterios aprobados en recursos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getLearningCriteriaCapabilities.mockResolvedValue({ ui: true, write: true, generation: true });
    api.listLearningCriteria.mockResolvedValue({
      items: [
        {
          id: 'set-1',
          titulo: 'Comprensión lectora',
          version_aprobada: {
            id: 'version-2',
            version_number: 2,
            estado: 'aprobada',
            criterios: [
              { stable_key: 'idea-principal', nombre: 'Identifica la idea principal', peso_porcentaje: 100 },
            ],
          },
        },
      ],
      total: 1,
      limit: 30,
      offset: 0,
    });
  });

  it('aplica una sola opción pedagógica y conserva el dual-write legado', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <Harness onGenerate={onGenerate} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Criterios aprobados/i }));
    const select = await screen.findByRole('combobox', { name: 'Versión que se aplicará' });
    expect(screen.getByRole('button', { name: /Criterios aprobados/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Estándares oficiales/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Generar' })).toBeDisabled();

    await user.selectOptions(select, 'version-2');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generar' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Generar' }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      criterios_aprendizaje_version_id: 'version-2',
      usar_dba: false,
      dba_ids: [],
      usar_rubrica: true,
      criterios_rubrica: ['Identifica la idea principal'],
    }));
  });
});
