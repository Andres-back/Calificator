import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GradeBreakdownData, GradeComponentData } from '@/types/api';
import { buildReviewTriage } from './buildReviewTriage';
import { ReviewTriagePanel } from './ReviewTriagePanel';

const component = (id: string, order: number, overrides: Partial<GradeComponentData> = {}): GradeComponentData => ({
  id, clave: `pregunta:${order + 1}`, orden: order, tipo: 'pregunta', numero: String(order + 1), titulo: `Pregunta ${order + 1}`,
  respuesta_estudiante: 'x', respuesta_referencia: 'x', puntos_obtenidos: 1, puntos_maximos: 1,
  estado: 'correcta', explicacion: 'Explicación verificable', origen: 'objetivo', requiere_revision: false,
  evidencia_paginas: [order + 1], valoraciones: [], ...overrides,
});
const breakdown = (components: GradeComponentData[]): GradeBreakdownData => ({
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa',
  requiere_revision: false, formula: { puntos_obtenidos: 1, puntos_posibles: 1, nota_maxima: 5, nota_base: 5,
    ajuste_global: 0, nota_antes_redondeo: 5, regla_redondeo: 'half_up', decimales: 2, nota_final: 5 },
  componentes: components, created_at: '2026-09-19T00:00:00Z',
});

describe('ReviewTriagePanel', () => {
  it('muestra conteos, razones y el estado sin alertas sin prometer exactitud', () => {
    const safe = buildReviewTriage(breakdown([component('p1', 0)]));
    const view = render(<ReviewTriagePanel summary={safe} onSelectComponent={() => undefined} />);
    expect(screen.getByText('1 segura')).toBeInTheDocument();
    expect(screen.getByText(/No detectamos señales de incertidumbre/)).toBeInTheDocument();
    expect(screen.getByText(/confirma la nota/)).toBeInTheDocument();

    const attention = buildReviewTriage(breakdown([component('p2', 1, { explicacion: '' })]));
    view.rerender(<ReviewTriagePanel summary={attention} onSelectComponent={() => undefined} />);
    expect(screen.getByText('Falta explicar cómo se obtuvo el puntaje')).toBeInTheDocument();
  });

  it('informa bloqueos globales sin asignarlos a una respuesta', () => {
    const summary = buildReviewTriage({ ...breakdown([component('p1', 0)]), cobertura_estado: 'incompleta', bloqueos: ['hoja_faltante'] });
    render(<ReviewTriagePanel summary={summary} onSelectComponent={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Cobertura incompleta');
    expect(screen.getByRole('alert')).toHaveTextContent('hoja faltante');
  });

  it('salta a la primera y siguiente excepción sin recorrer respuestas seguras', () => {
    const summary = buildReviewTriage(breakdown([
      component('safe', 0),
      component('attention', 1, { explicacion: '' }),
      component('blocked', 2, { estado: 'ilegible' }),
    ]));
    const select = vi.fn();
    const view = render(<ReviewTriagePanel summary={summary} onSelectComponent={select} />);
    fireEvent.click(screen.getByRole('button', { name: /Revisar primera excepción/ }));
    expect(select).toHaveBeenLastCalledWith('blocked', 'blocked', 1);
    view.rerender(<ReviewTriagePanel summary={summary} selectedComponentId="blocked" onSelectComponent={select} />);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente excepción/ }));
    expect(select).toHaveBeenLastCalledWith('attention', 'attention', 2);
  });

  it('mantiene accesibles las respuestas seguras por teclado', () => {
    const summary = buildReviewTriage(breakdown([component('safe', 0)]));
    const select = vi.fn();
    render(<ReviewTriagePanel summary={summary} onSelectComponent={select} />);
    fireEvent.click(screen.getByText('Ver respuestas seguras (1)'));
    const button = screen.getByRole('button', { name: /Pregunta 1/ });
    button.focus();
    expect(button).toHaveFocus();
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);
    expect(select).toHaveBeenCalledWith('safe', 'safe', 1);
  });
});
