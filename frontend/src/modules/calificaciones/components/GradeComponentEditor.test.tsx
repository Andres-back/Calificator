import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeComponentEditor } from './GradeComponentEditor';

describe('GradeComponentEditor', () => {
  it.each(['0.0000', '0.7000', '0.6250'])('abrir %s elimina ceros, conserva precisión y no marca dirty', (points) => {
    const onDirtyChange = vi.fn();
    render(<GradeComponentEditor component={{ id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta', respuesta_estudiante: 'A', respuesta_referencia: 'A', puntos_obtenidos: points, puntos_maximos: '1.0000', estado: 'correcta', explicacion: 'Respuesta registrada.', origen: 'ia', requiere_revision: false, evidencia_paginas: [] }} formula={{ puntos_obtenidos: points, puntos_posibles: 1, nota_maxima: 5, nota_base: 0, ajuste_global: 0, nota_antes_redondeo: 0, regla_redondeo: 'half_up', decimales: 2, nota_final: 0 }} onCancel={vi.fn()} onSave={vi.fn()} onDirtyChange={onDirtyChange} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(Number(points));
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe(String(Number(points)));
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('step', 'any');
  });
  it('mantiene máximo 0.625 exacto, rechaza 0.63 y no redondea al guardar', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{ id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta', respuesta_estudiante: 'A', respuesta_referencia: 'A', puntos_obtenidos: '0.6250', puntos_maximos: '0.6250', estado: 'correcta', explicacion: 'Respuesta registrada.', origen: 'ia', requiere_revision: false, evidencia_paginas: [] }} formula={{ puntos_obtenidos: '0.6250', puntos_posibles: 5, nota_maxima: 5, nota_base: 0.625, ajuste_global: 0, nota_antes_redondeo: 0.625, regla_redondeo: 'half_up', decimales: 2, nota_final: 0.63 }} onCancel={vi.fn()} onSave={onSave} />);
    const input = screen.getByLabelText(/Puntos \(máximo 0.625\)/);
    expect(input).toHaveAttribute('max', '0.625');
    fireEvent.change(screen.getByLabelText(/Motivo interno/), { target: { value: 'Revisión sustentada' } });
    fireEvent.change(input, { target: { value: '0.63' } });
    expect(screen.getByRole('button', { name: 'Guardar y recalcular' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '0.625' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y recalcular' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ puntos_obtenidos: 0.625 }));
  });
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

  it('conserva el borrador cuando el guardado falla y permite recargar de forma explícita', () => {
    const onReload = vi.fn();
    const component = {
      id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta',
      respuesta_estudiante: 'A', respuesta_referencia: 'B', puntos_obtenidos: 0, puntos_maximos: 1,
      estado: 'incorrecta', explicacion: '', origen: 'ia', requiere_revision: false, evidencia_paginas: [],
    };
    const formula = { puntos_obtenidos: 0, puntos_posibles: 1, nota_maxima: 5, nota_base: 0, ajuste_global: 0, nota_antes_redondeo: 0, regla_redondeo: 'half_up', decimales: 2, nota_final: 0 };
    const view = render(<GradeComponentEditor component={component} formula={formula} onCancel={() => undefined} onSave={() => undefined} />);
    fireEvent.change(screen.getByLabelText(/Puntos/), { target: { value: '0.5' } });
    fireEvent.change(screen.getByLabelText(/Motivo interno/), { target: { value: 'Revisión concurrente' } });
    fireEvent.change(screen.getByLabelText(/Explicación para/), { target: { value: 'Se reconoce parte del procedimiento.' } });

    view.rerender(<GradeComponentEditor component={component} formula={formula} onCancel={() => undefined} onSave={() => undefined} saveError="La versión cambió." onReload={onReload} />);

    expect(screen.getByLabelText(/Puntos/)).toHaveValue(0.5);
    expect(screen.getByLabelText(/Motivo interno/)).toHaveValue('Revisión concurrente');
    expect(screen.getByText(/La versión cambió/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recargar versión vigente' }));
    expect(onReload).toHaveBeenCalledOnce();
  });

  it('guarda y solicita avanzar sin confirmar ni publicar', () => {
    const onSaveAndNext = vi.fn();
    render(<GradeComponentEditor component={{
      id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta',
      respuesta_estudiante: 'A', respuesta_referencia: 'B', puntos_obtenidos: 0, puntos_maximos: 1,
      estado: 'incorrecta', explicacion: '', origen: 'ia', requiere_revision: false, evidencia_paginas: [],
    }} formula={{ puntos_obtenidos: 0, puntos_posibles: 1, nota_maxima: 5, nota_base: 0, ajuste_global: 0, nota_antes_redondeo: 0, regla_redondeo: 'half_up', decimales: 2, nota_final: 0 }} onCancel={() => undefined} onSave={() => undefined} onSaveAndNext={onSaveAndNext} />);
    fireEvent.change(screen.getByLabelText(/Motivo interno/), { target: { value: 'Ajuste sustentado' } });
    fireEvent.change(screen.getByLabelText(/Explicación para/), { target: { value: 'Debes revisar el procedimiento.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y siguiente alumno' }));
    expect(onSaveAndNext).toHaveBeenCalledWith(expect.objectContaining({ componente_id: 'p1' }));
    expect(screen.getByText(/no confirma ni publica/i)).toBeInTheDocument();
  });
});
