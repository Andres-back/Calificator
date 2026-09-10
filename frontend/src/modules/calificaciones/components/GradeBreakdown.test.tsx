import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    orientacion_mejora: 'Practica explicar el procedimiento paso a paso.',
    fuentes: [{ source_id: 's1', chunk_id: 'ch1', titulo: 'Guía de multiplicación', version: '3', fragmento: 'Seis grupos de cuatro forman veinticuatro.' }],
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
    expect(screen.getByText(/Practica explicar el procedimiento/)).toBeInTheDocument();
    expect(screen.getByText(/evidencia extraída → valoración objetiva/)).toBeInTheDocument();
    expect(screen.getByText('Material de apoyo consultado (1)')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Material de apoyo consultado (1)'));
    expect(screen.getByText('Guía de multiplicación')).toBeInTheDocument();
    expect(screen.getByText('Versión: 3')).toBeInTheDocument();
  });

  it('renderiza el editor dentro de la tarjeta activa', () => {
    render(<GradeBreakdown
      breakdown={breakdown}
      editingComponentId="p1"
      onEdit={() => undefined}
      renderEditor={() => <div>Editor contextual</div>}
    />);
    expect(screen.getByTestId('grade-editor-p1')).toHaveTextContent('Editor contextual');
    expect(screen.queryByRole('button', { name: 'Ajustar puntaje y explicación' })).not.toBeInTheDocument();
  });
  it('abre directamente la hoja asociada a una respuesta', () => {
    const onEvidencePage = vi.fn();
    render(<GradeBreakdown breakdown={breakdown} onEvidencePage={onEvidencePage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver hoja 2 de la evidencia' }));
    expect(onEvidencePage).toHaveBeenCalledWith(2);
  });
  it('enfoca una pregunta sin ocultar el resto al estudiante', () => {
    const two = { ...breakdown, componentes: [breakdown.componentes[0], { ...breakdown.componentes[0], id: 'p2', clave: 'pregunta:2', numero: '2', titulo: 'Segunda pregunta', requiere_revision: true }] };
    const select = vi.fn();
    const view = render(<GradeBreakdown breakdown={two} selectedComponentId="p2" onSelectComponent={select} />);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Pregunta 2, requiere revisión' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta 1' }));
    expect(select).toHaveBeenCalledWith(breakdown.componentes[0].id);
    view.rerender(<GradeBreakdown breakdown={two} student selectedComponentId="p2" />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.queryByRole('navigation', { name: 'Preguntas y criterios' })).not.toBeInTheDocument();
  });
  it('no filtra una referencia oculta al estudiante', () => {
    const hidden = { ...breakdown, componentes: [{ ...breakdown.componentes[0], respuesta_referencia: null, referencia_oculta: true }] };
    render(<GradeBreakdown breakdown={hidden} student />);
    expect(screen.getByText('Se mostrará cuando el docente libere las respuestas.')).toBeInTheDocument();
    expect(screen.queryByText(/Material de apoyo consultado/)).not.toBeInTheDocument();
  });

  it('declara cuando no existe una fuente RAG pertinente', () => {
    const withoutSources = { ...breakdown, componentes: [{ ...breakdown.componentes[0], fuentes: [] }] };
    render(<GradeBreakdown breakdown={withoutSources} />);
    expect(screen.getByText('Sin material adicional pertinente')).toBeInTheDocument();
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
