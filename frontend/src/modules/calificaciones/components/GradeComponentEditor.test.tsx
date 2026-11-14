import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeComponentEditor } from './GradeComponentEditor';

const pending = {
  id: 'p13', clave: 'pregunta:13', orden: 12, tipo: 'pregunta', numero: '13', titulo: '¿Cuál es uno de los principales ríos de América del Sur?',
  respuesta_estudiante: 'C', respuesta_referencia: 'C. Amazonas', puntos_obtenidos: 0, puntos_maximos: 0.25,
  estado: 'revision_pendiente', explicacion: 'La valoración de esta respuesta no tiene consenso verificable.', origen: 'ia', requiere_revision: true, evidencia_paginas: [2],
};
const formula = { puntos_obtenidos: 2, puntos_posibles: 5, nota_maxima: 5, nota_base: 2, ajuste_global: 0, nota_antes_redondeo: 2, regla_redondeo: 'half_up', decimales: 2, nota_final: 2 };

const STATE_LABELS: Record<string, string> = { correcta: 'Correcta', parcial: 'Parcial', incorrecta: 'Incorrecta', sin_respuesta: 'Sin respuesta' };

describe('GradeComponentEditor', () => {
  it('asigna máximo exacto o cero al cambiar el estado, sin guardar automáticamente', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{
      id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta',
      respuesta_estudiante: 'A', respuesta_referencia: 'B',
      puntos_obtenidos: '0.25', puntos_maximos: '0.6250', estado: 'parcial',
      explicacion: 'Respuesta registrada.', origen: 'ia', requiere_revision: false, evidencia_paginas: [],
    }} formula={{ puntos_obtenidos: 0.25, puntos_posibles: 5, nota_maxima: 5, nota_base: 0.25, ajuste_global: 0, nota_antes_redondeo: 0.25, regla_redondeo: 'half_up', nota_final: 0.25, decimales: 2 }} onCancel={vi.fn()} onSave={onSave} />);
    const pick = (name: string) => fireEvent.click(screen.getByRole('radio', { name }));
    const points = screen.getByRole('spinbutton');
    pick('Correcta');
    expect(points).toHaveValue(0.625);
    pick('Incorrecta');
    expect(points).toHaveValue(0);
    pick('Parcial');
    fireEvent.change(points, { target: { value: '0.35' } });
    expect(points).toHaveValue(0.35);
    pick('Sin respuesta');
    expect(points).toHaveValue(0);
    expect(onSave).not.toHaveBeenCalled();
  });
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
    expect(screen.getByRole('button', { name: /^Guardar$/ })).toBeDisabled();
    fireEvent.change(input, { target: { value: '0.625' } });
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ puntos_obtenidos: 0.625 }));
  });
  it('exige explicación, pero no motivo: el historial recibe uno según el estado', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{
      id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'Pregunta',
      respuesta_estudiante: 'A', respuesta_referencia: 'B', puntos_obtenidos: 0, puntos_maximos: 1,
      estado: 'incorrecta', explicacion: '', origen: 'ia', requiere_revision: false, evidencia_paginas: [],
    }} formula={{ puntos_obtenidos: 0, puntos_posibles: 1, nota_maxima: 5, nota_base: 0, ajuste_global: 0, nota_antes_redondeo: 0, regla_redondeo: 'half_up', decimales: 2, nota_final: 0 }} onCancel={() => undefined} onSave={onSave} />);
    const save = screen.getByRole('button', { name: /^Guardar$/ });
    expect(save).toBeDisabled();
    expect(screen.getByLabelText(/Motivo interno del cambio \(opcional\)/)).not.toBeRequired();
    fireEvent.change(screen.getByLabelText(/Explicación para el estudiante/), { target: { value: 'El procedimiento merece puntaje parcial.' } });
    fireEvent.change(screen.getByLabelText(/Puntos/), { target: { value: '0.5' } });
    expect(save).toBeEnabled();
    expect(screen.getByText(/2.50/)).toBeInTheDocument();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      componente_id: 'p1', puntos_obtenidos: 0.5, motivo_interno: 'Se ajustó el puntaje tras revisar la evidencia.',
    }));
  });

  it.each([
    ['correcta', 'Se determinó que la respuesta es correcta.'],
    ['parcial', 'Se determinó que la respuesta es parcialmente correcta.'],
    ['incorrecta', 'Se determinó que la respuesta es incorrecta.'],
    ['sin_respuesta', 'Se determinó que no hay respuesta.'],
  ])('al elegir %s llena el motivo y lo guarda', (state, reason) => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('radio', { name: STATE_LABELS[state] }));
    expect(screen.getByLabelText(/Motivo interno/)).toHaveValue(reason);
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estado: state, motivo_interno: reason }));
  });

  it('no reemplaza el motivo que el docente escribió', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Motivo interno/), { target: { value: 'La marca está borrada a medias.' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Correcta' }));
    expect(screen.getByLabelText(/Motivo interno/)).toHaveValue('La marca está borrada a medias.');
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ motivo_interno: 'La marca está borrada a medias.' }));
  });

  it('al elegir el estado la IA redacta la explicación con el estado y los puntos elegidos', async () => {
    const onDraftExplanation = vi.fn().mockResolvedValue('Marcaste la C, el Amazonas. Identificaste bien el río principal.');
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={onSave} onDraftExplanation={onDraftExplanation} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Correcta' }));
    expect(onDraftExplanation).toHaveBeenCalledWith({ estado: 'correcta', puntos_obtenidos: 0.25 });
    expect(screen.getByText('Redactando la explicación…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Guardar$/ })).toBeDisabled();
    await waitFor(() => expect(screen.getByLabelText(/Explicación para el estudiante/)).toHaveValue('Marcaste la C, el Amazonas. Identificaste bien el río principal.'));
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      estado: 'correcta', puntos_obtenidos: 0.25,
      explicacion_estudiante: 'Marcaste la C, el Amazonas. Identificaste bien el río principal.',
    }));
  });

  it('no pisa la explicación que el docente escribió; puede pedirla de nuevo con el botón', async () => {
    const onDraftExplanation = vi.fn().mockResolvedValue('Revisa el párrafo de los ríos y subraya el más largo.');
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={vi.fn()} onDraftExplanation={onDraftExplanation} />);
    fireEvent.change(screen.getByLabelText(/Explicación para el estudiante/), { target: { value: 'Mi explicación.' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Incorrecta' }));
    expect(onDraftExplanation).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Explicación para el estudiante/)).toHaveValue('Mi explicación.');
    fireEvent.click(screen.getByRole('button', { name: /Redactar de nuevo con IA/ }));
    expect(onDraftExplanation).toHaveBeenCalledWith({ estado: 'incorrecta', puntos_obtenidos: 0 });
    await waitFor(() => expect(screen.getByLabelText(/Explicación para el estudiante/)).toHaveValue('Revisa el párrafo de los ríos y subraya el más largo.'));
  });

  it('si la IA no responde conserva el texto y avisa en lenguaje claro', async () => {
    const onDraftExplanation = vi.fn().mockRejectedValue(new Error('503'));
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={vi.fn()} onDraftExplanation={onDraftExplanation} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Correcta' }));
    expect(await screen.findByText(/No pudimos redactar la explicación esta vez/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Explicación para el estudiante/)).toHaveValue('La valoración de esta respuesta no tiene consenso verificable.');
    expect(screen.getByRole('button', { name: /^Guardar$/ })).toBeEnabled();
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

  it('186 el estado se elige con botones; parcial propone la mitad y bloquea cero o el máximo', () => {
    const onSave = vi.fn();
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={onSave} />);
    const group = screen.getByRole('radiogroup', { name: 'Estado' });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('Elige una opción después de mirar la hoja.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Parcial' }));
    expect(screen.getByRole('radio', { name: 'Parcial' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('spinbutton')).toHaveValue(0.13);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0.25' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Una respuesta parcial debe tener más de 0 y menos de 0.25 puntos.');
    expect(screen.getByRole('button', { name: /^Guardar$/ })).toBeDisabled();
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '0.1' } });
    fireEvent.click(screen.getByRole('button', { name: /^Guardar$/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estado: 'parcial', puntos_obtenidos: 0.1 }));
  });

  it('186 las flechas recorren los estados como un grupo de radio', () => {
    render(<GradeComponentEditor component={{ ...pending }} formula={formula} onCancel={vi.fn()} onSave={vi.fn()} />);
    const correct = screen.getByRole('radio', { name: 'Correcta' });
    expect(correct).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(correct, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Parcial' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Parcial' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Parcial' }), { key: 'ArrowLeft' });
    expect(correct).toHaveAttribute('aria-checked', 'true');
  });

  it('186 la nota muestra el antes y el después del cambio', () => {
    render(<GradeComponentEditor component={{ ...pending, estado: 'correcta', puntos_obtenidos: 0.25 }} formula={formula} onCancel={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Incorrecta' }));
    expect(screen.getByTestId('grade-preview')).toHaveTextContent('Nota del estudiante: 2.00 → 1.75 de 5.00');
  });

  it('186 la acción principal lleva a la siguiente pregunta; en la última, al siguiente alumno', () => {
    const onSaveAndNextQuestion = vi.fn();
    const onSaveAndNext = vi.fn();
    const component = { ...pending, estado: 'correcta', puntos_obtenidos: 0.25 };
    const view = render(<GradeComponentEditor component={component} formula={formula} onCancel={vi.fn()} onSave={vi.fn()}
      nextQuestionAction="Guardar e ir a la pregunta 14" onSaveAndNextQuestion={onSaveAndNextQuestion} onSaveAndNext={onSaveAndNext} />);
    expect(screen.queryByRole('button', { name: 'Guardar y siguiente alumno' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar e ir a la pregunta 14' }));
    expect(onSaveAndNextQuestion).toHaveBeenCalledWith(expect.objectContaining({ componente_id: 'p13' }));
    view.rerender(<GradeComponentEditor component={component} formula={formula} onCancel={vi.fn()} onSave={vi.fn()}
      onSaveAndNextQuestion={onSaveAndNextQuestion} onSaveAndNext={onSaveAndNext} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y siguiente alumno' }));
    expect(onSaveAndNext).toHaveBeenCalledOnce();
  });

  it('186 al abrir, el editor queda a la vista y el foco en el estado', () => {
    // La configuración de pruebas define scrollIntoView vacío; aquí se observa la llamada.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')!;
    const scroll = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { value: scroll, configurable: true });
    render(<GradeComponentEditor component={{ ...pending, estado: 'incorrecta', puntos_obtenidos: 0 }} formula={formula} onCancel={vi.fn()} onSave={vi.fn()} />);
    expect(scroll).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    expect(screen.getByRole('radio', { name: 'Incorrecta' })).toHaveFocus();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', original);
  });
});
