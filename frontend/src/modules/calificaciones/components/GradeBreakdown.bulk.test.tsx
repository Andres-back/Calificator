import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradeBreakdown } from './GradeBreakdown';
import type { GradeBreakdownData } from '@/types/api';

type Component = GradeBreakdownData['componentes'][number];

function question(number: number, overrides: Partial<Component> = {}): Component {
  return {
    id: `p${number}`, clave: `pregunta:${number}`, orden: number - 1, tipo: 'pregunta', numero: String(number),
    titulo: `Pregunta ${number}`, respuesta_estudiante: 'x', respuesta_referencia: 'y',
    puntos_obtenidos: 0, puntos_maximos: 1, estado: 'incorrecta', explicacion: 'No coincide con la respuesta esperada.',
    origen: 'consenso_ia', requiere_revision: false, evidencia_paginas: [1], valoraciones: [],
    ...overrides,
  };
}

const breakdown: GradeBreakdownData = {
  id: 'd1', calificacion_id: 'c1', version: 3, origen: 'automatico',
  cobertura_estado: 'incompleta', requiere_revision: true, created_at: new Date().toISOString(),
  formula: { puntos_obtenidos: 1, puntos_posibles: 4, nota_maxima: 5, nota_base: 1.25, ajuste_global: 0, nota_antes_redondeo: 1.25, regla_redondeo: 'half_up', decimales: 2, nota_final: 1.25 },
  componentes: [
    question(1, { estado: 'correcta', puntos_obtenidos: 1 }),
    question(2, { estado: 'no_evaluable', puntos_obtenidos: null, requiere_revision: true }),
    question(3),
    question(4),
  ],
};

function setup(props: Partial<Parameters<typeof GradeBreakdown>[0]> = {}) {
  const select = vi.fn();
  const mark = vi.fn();
  const view = render(<GradeBreakdown breakdown={breakdown} compactTeacher selectedComponentId="p1" onSelectComponent={select} onBulkMark={mark} {...props} />);
  return { select, mark, view };
}

const start = () => fireEvent.click(screen.getByRole('button', { name: 'Marcar varias preguntas' }));
const boxes = () => within(screen.getByRole('group', { name: 'Preguntas para marcar' })).getAllByRole('checkbox');

describe('215 marcar varias preguntas en la revisión', () => {
  it('solo se ofrece al docente que puede calificar y con más de una pregunta', () => {
    const { view } = setup({ onBulkMark: undefined });
    expect(screen.queryByRole('button', { name: 'Marcar varias preguntas' })).not.toBeInTheDocument();

    view.rerender(<GradeBreakdown breakdown={breakdown} student onBulkMark={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Marcar varias preguntas' })).not.toBeInTheDocument();

    const single = { ...breakdown, componentes: [breakdown.componentes[0], question(9, { tipo: 'rubrica' })] };
    view.rerender(<GradeBreakdown breakdown={single} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} onBulkMark={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Marcar varias preguntas' })).not.toBeInTheDocument();
  });

  it('al activar el modo, los números seleccionan en vez de abrir la pregunta', () => {
    const { select } = setup();
    expect(screen.getByRole('navigation', { name: 'Preguntas y criterios' })).toBeInTheDocument();

    start();

    expect(screen.queryByRole('navigation', { name: 'Preguntas y criterios' })).not.toBeInTheDocument();
    expect(boxes()).toHaveLength(4);
    expect(screen.getByText('Ninguna pregunta seleccionada')).toBeInTheDocument();
    fireEvent.click(boxes()[1]);
    expect(screen.getByText('1 pregunta seleccionada')).toBeInTheDocument();
    fireEvent.click(boxes()[2]);
    expect(boxes().map((box) => box.getAttribute('aria-checked'))).toEqual(['false', 'true', 'true', 'false']);
    expect(screen.getByText('2 preguntas seleccionadas')).toBeInTheDocument();
    fireEvent.click(boxes()[2]);
    expect(boxes()[2]).toHaveAttribute('aria-checked', 'false');
    expect(select).not.toHaveBeenCalled();
    // Los botones cumplen el tamaño táctil del proyecto.
    for (const box of boxes()) expect(box).toHaveClass('min-h-11', 'min-w-11');
  });

  it('el foco entra a la primera pregunta y vuelve al botón al cancelar', () => {
    setup();
    start();
    expect(boxes()[0]).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: 'Marcar varias preguntas' })).toHaveFocus();
  });

  it('si deja de ofrecerse, por ejemplo al editar una pregunta, el modo no reaparece con la selección anterior', () => {
    const { view, mark } = setup();
    start();
    fireEvent.click(boxes()[1]);

    view.rerender(<GradeBreakdown breakdown={breakdown} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Marcar varias preguntas' })).not.toBeInTheDocument();
    view.rerender(<GradeBreakdown breakdown={breakdown} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} onBulkMark={mark} />);

    expect(screen.getByRole('navigation', { name: 'Preguntas y criterios' })).toBeInTheDocument();
    start();
    expect(boxes().every((box) => box.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('sin selección no deja marcar', () => {
    const { mark } = setup();
    start();

    expect(screen.getByRole('button', { name: 'Marcar correctas' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Marcar incorrectas' })).toBeDisabled();
    expect(mark).not.toHaveBeenCalled();
  });

  it('pide confirmar con la nota anticipada y guarda una sola vez', () => {
    const { mark } = setup();
    start();
    fireEvent.click(boxes()[1]);
    fireEvent.click(boxes()[2]);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar correctas' }));

    expect(mark).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('2 preguntas quedarán correctas: 2 y 3.');
    expect(screen.getByTestId('bulk-mark-preview')).toHaveTextContent('Nota: 1.25 → 3.75');
    // Mientras se confirma, la selección no cambia.
    for (const box of boxes()) expect(box).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(mark).toHaveBeenCalledTimes(1);
    expect(mark).toHaveBeenCalledWith(['p2', 'p3'], 'correcta');
  });

  it('una sola pregunta se anuncia en singular, también como incorrecta', () => {
    setup();
    start();
    fireEvent.click(boxes()[0]);

    fireEvent.click(screen.getByRole('button', { name: 'Marcar incorrectas' }));

    expect(screen.getByRole('status')).toHaveTextContent('La pregunta 1 quedará incorrecta.');
    expect(screen.getByTestId('bulk-mark-preview')).toHaveTextContent('Nota: 1.25 → 0.00');
  });

  it('«Volver» conserva la selección y «Cancelar» devuelve la navegación', () => {
    const { select, mark } = setup();
    start();
    fireEvent.click(boxes()[2]);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar correctas' }));

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(boxes()[2]).toHaveAttribute('aria-checked', 'true');
    expect(boxes()[2]).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const nav = screen.getByRole('navigation', { name: 'Preguntas y criterios' });
    fireEvent.click(within(nav).getAllByRole('button')[2]);
    expect(select).toHaveBeenCalledWith('p3');
    expect(mark).not.toHaveBeenCalled();
    // Al volver a entrar no queda nada seleccionado.
    start();
    expect(boxes().every((box) => box.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('«Seleccionar todas» deja fuera los criterios de rúbrica', () => {
    const withRubric = { ...breakdown, componentes: [...breakdown.componentes, question(5, { tipo: 'rubrica', numero: null })] };
    const { mark } = setup({ breakdown: withRubric });
    start();

    expect(boxes()[4]).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar todas' }));
    expect(boxes().map((box) => box.getAttribute('aria-checked'))).toEqual(['true', 'true', 'true', 'true', 'false']);
    expect(screen.getByText('4 preguntas seleccionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar incorrectas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(mark).toHaveBeenCalledWith(['p1', 'p2', 'p3', 'p4'], 'incorrecta');

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar selección' }));
    expect(screen.getByText('Ninguna pregunta seleccionada')).toBeInTheDocument();
  });

  it('mientras guarda no admite otra acción y al llegar la versión nueva sale del modo', () => {
    const { view, mark } = setup();
    start();
    fireEvent.click(boxes()[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Marcar correctas' }));

    view.rerender(<GradeBreakdown breakdown={breakdown} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} onBulkMark={mark} bulkSaving />);
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Marcar varias preguntas' }).querySelector('[aria-busy="true"]')).not.toBeNull();

    view.rerender(<GradeBreakdown breakdown={{ ...breakdown, version: 4 }} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} onBulkMark={mark} />);
    expect(screen.getByRole('navigation', { name: 'Preguntas y criterios' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Marcar varias preguntas' })).toBeInTheDocument();
  });
});
