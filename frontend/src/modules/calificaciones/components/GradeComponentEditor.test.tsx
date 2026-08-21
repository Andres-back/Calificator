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
    }} onCancel={() => undefined} onSave={onSave} />);
    const save = screen.getByRole('button', { name: 'Guardar y recalcular' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motivo interno del cambio/), { target: { value: 'Revisión de procedimiento' } });
    fireEvent.change(screen.getByLabelText(/Explicación para el estudiante/), { target: { value: 'El procedimiento merece puntaje parcial.' } });
    fireEvent.change(screen.getByLabelText(/Puntos/), { target: { value: '0.5' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ componente_id: 'p1', puntos_obtenidos: 0.5 }));
  });
});
