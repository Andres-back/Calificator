import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeGlobalAdjustmentEditor } from './GradeGlobalAdjustmentEditor';

const formula = { puntos_obtenidos: 3, puntos_posibles: 4, nota_maxima: 5, nota_base: 3.75, ajuste_global: 0, nota_antes_redondeo: 3.75, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.75 };

describe('GradeGlobalAdjustmentEditor', () => {
  it('muestra la nota resultante y exige justificación doble', () => {
    const onSave = vi.fn();
    render(<GradeGlobalAdjustmentEditor formula={formula} onCancel={() => undefined} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Ajuste a la nota/), { target: { value: '0.25' } });
    expect(screen.getByText('4.00 / 5.0')).toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Guardar ajuste y recalcular' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo interno/), { target: { value: 'Corrección del criterio' } });
    fireEvent.change(screen.getByLabelText(/Explicación para el estudiante/), { target: { value: 'Se reconoció el procedimiento correcto.' } });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ valor: 0.25 }));
  });
});
