import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PedagogicalApproachSelector, useBaseForm } from './base';

const mocks = vi.hoisted(() => ({
  listDbaCombinado: vi.fn(),
}));

vi.mock('@/modules/materias/dbaApi', () => ({
  listDbaCombinado: mocks.listDbaCombinado,
}));

function Harness({ onGenerate }: { onGenerate: (payload: Record<string, unknown>) => void }) {
  const form = useBaseForm();
  return (
    <>
      <button type="button" onClick={() => {
        form.set('titulo', 'Guía del agua');
        form.set('tema', 'El ciclo del agua');
      }}>
        Completar datos
      </button>
      <button type="button" onClick={() => form.set('materia_id', 'materia-1')}>
        Elegir materia
      </button>
      <PedagogicalApproachSelector base={form.base} set={form.set} />
      <button type="button" disabled={!form.valid} onClick={() => onGenerate(form.payload())}>
        Generar
      </button>
    </>
  );
}

function renderHarness(onGenerate = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness onGenerate={onGenerate} />
    </QueryClientProvider>,
  );
  return onGenerate;
}

describe('enfoque pedagógico de recursos', () => {
  beforeEach(() => {
    mocks.listDbaCombinado.mockReset();
    mocks.listDbaCombinado.mockResolvedValue([
      {
        id: 'dba-1',
        fuente: 'oficial',
        codigo: 'DBA-1',
        descripcion: 'Explica cambios de estado del agua.',
      },
    ]);
  });

  it('permite generar libremente sin DBA ni rúbrica', async () => {
    const user = userEvent.setup();
    const onGenerate = renderHarness();

    await user.click(screen.getByRole('button', { name: 'Completar datos' }));
    const generate = screen.getByRole('button', { name: 'Generar' });
    expect(generate).toBeEnabled();
    expect(screen.getByText('Generación libre')).toBeInTheDocument();

    await user.click(generate);

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      usar_dba: false,
      usar_rubrica: false,
      criterios_rubrica: [],
      dba_ids: [],
      dba_personalizado_ids: [],
    }));
  });

  it('admite rúbrica sin DBA y conserva los criterios docentes', async () => {
    const user = userEvent.setup();
    const onGenerate = renderHarness();

    await user.click(screen.getByRole('button', { name: 'Completar datos' }));
    await user.click(screen.getByRole('checkbox', { name: /Usar criterios de rúbrica/i }));
    await user.type(screen.getByPlaceholderText(/Claridad/i), 'Explica con claridad{Enter}');
    await user.click(screen.getByRole('button', { name: 'Generar' }));

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({
      usar_dba: false,
      usar_rubrica: true,
      criterios_rubrica: ['Explica con claridad'],
      dba_ids: [],
    }));
  });

  it('solo exige un DBA cuando el profesor activa ese enfoque', async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole('button', { name: 'Completar datos' }));
    await user.click(screen.getByRole('button', { name: 'Elegir materia' }));
    await user.click(screen.getByRole('checkbox', { name: /Alinear con DBA/i }));

    expect(screen.getByRole('button', { name: 'Generar' })).toBeDisabled();
    await waitFor(() => expect(screen.getByText('DBA-1')).toBeInTheDocument());
    await user.click(screen.getByRole('checkbox', { name: /DBA-1/i }));

    expect(screen.getByRole('button', { name: 'Generar' })).toBeEnabled();
  });
});
