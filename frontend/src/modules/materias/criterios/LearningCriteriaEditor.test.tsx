import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LearningCriteriaEditor } from './LearningCriteriaEditor';
import type { LearningCriterion, LearningSource } from '@/types/api';

const criterion: LearningCriterion = {
  stable_key: 'procedimiento', orden: 1, nombre: 'Procedimiento',
  descripcion: 'Explica los pasos.', evidencia_esperada: 'Cálculo visible.',
  peso_porcentaje: 100, niveles: [], source_refs: [], official_standard_refs: [],
};
const source: LearningSource = {
  id: 'source-1', tipo: 'foto', orden: 1, display_name: 'Libro de fracciones',
  page_count: 2, extraction_status: 'lista', visible_to_student: false,
};

describe('LearningCriteriaEditor', () => {
  it('does not claim readiness when required fields are empty despite 100 percent weight', () => {
    const view = render(<LearningCriteriaEditor value={[{ ...criterion, nombre: '', descripcion: '', evidencia_esperada: '' }]} onChange={vi.fn()} />);
    expect(screen.getByText('Completa los campos obligatorios')).toBeInTheDocument();
    view.rerender(<LearningCriteriaEditor value={[criterion]} onChange={vi.fn()} />);
    expect(screen.getByText('Lista para aprobación')).toBeInTheDocument();
  });

  it('links a criterion to the teacher source and its specific page', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const view = render(<LearningCriteriaEditor value={[criterion]} sources={[source]} onChange={onChange} />);

    await user.click(screen.getByText('Configuración avanzada'));
    await user.click(screen.getByRole('checkbox', { name: 'Libro de fracciones' }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({
      source_refs: [{ source_id: 'source-1' }],
    })]);
    const linked = onChange.mock.lastCall?.[0] as LearningCriterion[];
    view.rerender(<LearningCriteriaEditor value={linked} sources={[source]} onChange={onChange} />);
    await user.type(screen.getByLabelText('Página que aporta evidencia'), '2');
    expect(onChange.mock.lastCall?.[0][0].source_refs).toEqual([{ source_id: 'source-1', pagina: 2 }]);
  });

  it('distribuye exactamente 100 por ciento incluso cuando no divide de forma exacta', () => {
    const onChange = vi.fn();
    render(<LearningCriteriaEditor value={[
      criterion,
      { ...criterion, stable_key: 'comprension', orden: 2 },
      { ...criterion, stable_key: 'argumentacion', orden: 3 },
    ]} onChange={onChange} />);

    screen.getByRole('button', { name: 'Distribuir automáticamente' }).click();
    const distributed = onChange.mock.lastCall?.[0] as LearningCriterion[];

    expect(distributed.map((item) => item.peso_porcentaje)).toEqual([33.33, 33.33, 33.34]);
    expect(distributed.reduce((total, item) => total + item.peso_porcentaje, 0)).toBe(100);
  });

  it('agrega un criterio y deja los pesos listos sin corrección manual', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LearningCriteriaEditor value={[criterion]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Agregar otro criterio' }));
    const next = onChange.mock.lastCall?.[0] as LearningCriterion[];
    expect(next).toHaveLength(2);
    expect(next.map((item) => item.peso_porcentaje)).toEqual([50, 50]);
  });
});
