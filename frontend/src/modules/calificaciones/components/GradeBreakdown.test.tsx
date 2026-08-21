import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GradeBreakdown } from './GradeBreakdown';
import type { GradeBreakdownData } from '@/types/api';

const breakdown: GradeBreakdownData = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico',
  cobertura_estado: 'completa', requiere_revision: false, created_at: new Date().toISOString(),
  formula: { puntos_obtenidos: 3, puntos_posibles: 4, nota_maxima: 5, nota_base: 3.75, ajuste_global: 0, nota_antes_redondeo: 3.75, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.75 },
  componentes: [{
    id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1',
    titulo: '¿Cuánto es 6 × 4?', respuesta_estudiante: '24', respuesta_referencia: '24',
    puntos_obtenidos: 1, puntos_maximos: 1, estado: 'correcta',
    explicacion: 'Coincide con la clave oficial.', origen: 'objetivo', requiere_revision: false,
    evidencia_paginas: [2], valoraciones: [],
  }],
};

describe('GradeBreakdown', () => {
  it('explica fórmula, respuesta, puntaje, motivo y evidencia', () => {
    render(<GradeBreakdown breakdown={breakdown} />);
    expect(screen.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeInTheDocument();
    expect(screen.getByText('3.00 / 4.00')).toBeInTheDocument();
    expect(screen.getAllByText('24')).toHaveLength(2);
    expect(screen.getByText(/Coincide con la clave oficial/)).toBeInTheDocument();
    expect(screen.getByText('Evidencia: hoja 2.')).toBeInTheDocument();
  });

  it('no filtra una referencia oculta al estudiante', () => {
    const hidden = { ...breakdown, componentes: [{ ...breakdown.componentes[0], respuesta_referencia: null, referencia_oculta: true }] };
    render(<GradeBreakdown breakdown={hidden} student />);
    expect(screen.getByText('Se mostrará cuando el docente libere las respuestas.')).toBeInTheDocument();
  });
  it('muestra el ajuste docente como línea separada y explicado', () => {
    render(<GradeBreakdown breakdown={{
      ...breakdown,
      formula: { ...breakdown.formula, ajuste_global: 0.25, nota_final: 4 },
      ajuste_global_detalle: { valor: 0.25, explicacion_estudiante: 'Se reconoció el procedimiento adicional.' },
    }} student />);
    expect(screen.getByText('Ajuste docente: +0.25')).toBeInTheDocument();
    expect(screen.getByText('Se reconoció el procedimiento adicional.')).toBeInTheDocument();
  });
});
