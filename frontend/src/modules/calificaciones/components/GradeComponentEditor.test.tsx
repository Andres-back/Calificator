import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeComponentEditor } from './GradeComponentEditor';

describe('GradeComponentEditor', () => {
  it('exige motivo y explicación antes de guardar', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{
      id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta',
      respuesta_estudiante: 'A', respuesta_referencia: 'B', puntos_obtenidos: 0, puntos_maximos: 1,
      estado: 'incorrecta', explicacion: '', origen: 'ia', requiere_revision: false, evidencia_paginas: [],
    }} formula={{ puntos_obtenidos: 0, puntos_posibles: 1, nota_maxima: 5, nota_base: 0, ajuste_global: 0, nota_antes_redondeo: 0, regla_redondeo: 'half_up', decimales: 2, nota_final: 0 }} onCancel={() => undefined} onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Guardar y recalcular' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo interno del cambio/), { target: { value: 'Revisión de procedimiento' } });
    fireEvent.change(screen.getByLabelText(/Explicación para el estudiante/), { target: { value: 'El procedimiento merece puntaje parcial.' } });
    fireEvent.change(screen.getByLabelText(/Puntos/), { target: { value: '0.5' } });
    expect(save).toBeEnabled();
    expect(screen.getByText(/2.50/)).toBeInTheDocument();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ componente_id: 'p1', puntos_obtenidos: 0.5 }));
  });
});
