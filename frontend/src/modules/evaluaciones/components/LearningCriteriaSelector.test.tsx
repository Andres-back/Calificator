import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearningCriteriaList } from '@/types/api';
import { LearningCriteriaSelector } from './LearningCriteriaSelector';

const version = {
  id: 'version-1', set_id: 'set-1', version_number: 2, revision: 1, estado: 'aprobada' as const,
  intencion_docente: { que_evaluar: 'Comprensión' }, cobertura: {}, fuentes: [],
  criterios: [
    { stable_key: 'literal', orden: 1, nombre: 'Comprensión literal', descripcion: 'Identifica datos.', evidencia_esperada: 'Respuesta basada en el texto.', peso_porcentaje: 60, niveles: [] },
    { stable_key: 'inferencia', orden: 2, nombre: 'Inferencia', descripcion: 'Relaciona pistas.', evidencia_esperada: 'Explicación breve.', peso_porcentaje: 40, niveles: [] },
  ],
  created_at: '2026-09-27T00:00:00Z', updated_at: '2026-09-27T00:00:00Z',
};

const list: LearningCriteriaList = {
  items: [
    {
      id: 'set-1', materia_id: 'materia-1', profesor_id: 'profesor-1', titulo: 'Lectura de un cuento',
      estado: 'activo', version_trabajo: null, version_aprobada: version, usos: 0,
      created_at: '2026-09-27T00:00:00Z', updated_at: '2026-09-27T00:00:00Z',
    },
    {
      id: 'set-draft', materia_id: 'materia-1', profesor_id: 'profesor-1', titulo: 'Borrador privado',
      estado: 'activo', version_trabajo: { ...version, id: 'draft-version', estado: 'borrador' }, version_aprobada: null, usos: 0,
      created_at: '2026-09-27T00:00:00Z', updated_at: '2026-09-27T00:00:00Z',
    },
  ],
  total: 1, limit: 25, offset: 0,
};

const apiMocks = vi.hoisted(() => ({
  getLearningCriteriaCapabilities: vi.fn(),
  listLearningCriteria: vi.fn(),
}));

vi.mock('@/modules/materias/criterios/api', () => apiMocks);

describe('LearningCriteriaSelector', () => {
  beforeEach(() => {
    apiMocks.getLearningCriteriaCapabilities.mockResolvedValue({ ui: true, write: true, generation: true });
    apiMocks.listLearningCriteria.mockResolvedValue(list);
  });

  it('previsualiza la versión aprobada y explica la relación con preguntas', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LearningCriteriaSelector materiaId="materia-1" value="version-1" onChange={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Lectura de un cuento')).toBeVisible();
    expect(screen.getByText(/Comprensión literal/)).toBeVisible();
    expect(screen.getByText(/Inferencia/)).toBeVisible();
    expect(screen.getByText(/propondrá qué criterio corresponde a cada pregunta/)).toBeVisible();
  });

  it('permite generación libre, ofrece solo versiones aprobadas y entrega sus criterios', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LearningCriteriaSelector materiaId="materia-1" value="" onChange={onChange} />
      </QueryClientProvider>,
    );

    const select = await screen.findByRole('combobox', { name: 'Versión que se aplicará' });
    expect(screen.getByRole('option', { name: 'No aplicar una versión guardada' })).toBeVisible();
    expect(screen.queryByRole('option', { name: /Borrador privado/ })).not.toBeInTheDocument();

    await user.selectOptions(select, 'version-1');

    expect(onChange).toHaveBeenCalledWith('version-1', [
      { key: 'literal', nombre: 'Comprensión literal' },
      { key: 'inferencia', nombre: 'Inferencia' },
    ]);
  });
});
