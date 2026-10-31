import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('137 integra navegación móvil conservando la precisión del reparto', () => {
    const scored = { ...breakdown, componentes: [{ ...breakdown.componentes[0], puntos_obtenidos: 0.3572, puntos_maximos: 0.3572 }] };
    render(<GradeBreakdown breakdown={scored} compactTeacher selectedComponentId="p1" onSelectComponent={vi.fn()} />);
    const nav = screen.getByRole('navigation', { name: 'Preguntas y criterios' });
    expect(nav).toHaveClass('grid');
    expect(within(nav).getByRole('button')).toHaveAccessibleDescription('0.3572/0.3572 · Correcta');
    expect(screen.getByText('0.3572 / 0.3572')).toBeInTheDocument();
  });
  it.each([8, 17, 30])('136 navega %s componentes por identidad con extremos y resumen móvil compacto', (count) => {
    const components = Array.from({ length: count }, (_, index) => ({ ...breakdown.componentes[0], id: `p${index + 1}`, clave: `seccion-${index}:pregunta-1`, numero: '1', orden: index }));
    const select = vi.fn();
    const view = render(<GradeBreakdown breakdown={{ ...breakdown, componentes: components }} compactTeacher selectedComponentId="p1" onSelectComponent={select} />);
    const nav = screen.getByRole('navigation', { name: 'Preguntas y criterios' });
    expect(nav).toHaveClass('grid');
    expect(within(nav).getAllByRole('button')).toHaveLength(count);
    expect(screen.getByRole('button', { name: 'Pregunta anterior' })).toBeDisabled();
    expect(screen.getByText(`1 de ${count}`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta siguiente' }));
    expect(select).toHaveBeenLastCalledWith('p2');
    const current = within(nav).getAllByRole('button')[0];
    expect(current).toHaveAccessibleDescription('1.00/1.00 · Correcta');
    expect(current.querySelector('[data-question-score]')).toHaveClass('hidden', 'sm:inline');
    view.rerender(<GradeBreakdown breakdown={{ ...breakdown, componentes: components }} compactTeacher selectedComponentId={`p${count}`} onSelectComponent={select} />);
    expect(screen.getByRole('button', { name: 'Pregunta siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta anterior' }));
    expect(select).toHaveBeenLastCalledWith(`p${count - 1}`);
    expect(within(nav).getAllByRole('button').at(-1)).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    view.rerender(<GradeBreakdown breakdown={{ ...breakdown, componentes: components }} compactTeacher student selectedComponentId="p1" />);
    expect(screen.queryByRole('button', { name: 'Pregunta siguiente' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(count);
  });
  it('identifica el cálculo incompleto como provisional solo en la revisión docente', () => {
    const incomplete = { ...breakdown, cobertura_estado: 'incompleta', componentes: [{ ...breakdown.componentes[0], puntos_obtenidos: null }], formula: { ...breakdown.formula, nota_final: 1.85 } };
    const view = render(<GradeBreakdown breakdown={incomplete} onSelectComponent={vi.fn()} compactTeacher />);
    expect(screen.getByText('Cálculo provisional · 1.85')).toBeInTheDocument();
    expect(screen.getByText(/Falta 1 pregunta por puntuar/)).toBeInTheDocument();
    expect(screen.queryByText('Nota final')).not.toBeInTheDocument();
    view.rerender(<GradeBreakdown breakdown={incomplete} student />);
    expect(screen.getByText('Nota final')).toBeInTheDocument();
    expect(screen.queryByText(/Falta 1 pregunta por puntuar/)).not.toBeInTheDocument();
  });
  it('usa comparación conjunta solo al pedir la variante docente y conserva el cero', () => {
    const zero = { ...breakdown, componentes: [{ ...breakdown.componentes[0], respuesta_estudiante: '0', respuesta_referencia: '0' }] };
    const view = render(<GradeBreakdown breakdown={zero} compactTeacher />);
    expect(screen.getByTestId('grade-answer-comparison')).toHaveClass('divide-y');
    expect(screen.getAllByText('0')).toHaveLength(2);
    view.rerender(<GradeBreakdown breakdown={zero} compactTeacher student />);
    expect(screen.queryByTestId('grade-answer-comparison')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajustar/ })).not.toBeInTheDocument();
  });
  it('explica fórmula, respuesta, puntaje, motivo y evidencia', () => {
    render(<GradeBreakdown breakdown={breakdown} />);
    expect(screen.getByRole('heading', { name: 'Respuestas y puntajes' })).toBeInTheDocument();
    expect(screen.getByText('3.00 / 4.00')).toBeInTheDocument();
    expect(screen.getAllByText('24')).toHaveLength(2);
    expect(screen.getByText(/Coincide con la clave oficial/)).toBeInTheDocument();
    expect(screen.getByText('Evidencia: hoja 2.')).toBeInTheDocument();
    expect(screen.getByText(/Practica explicar el procedimiento/)).toBeInTheDocument();
    expect(screen.queryByText(/evidencia extraída → valoración objetiva/)).not.toBeInTheDocument();
    expect(screen.queryByText('Material de apoyo consultado (1)')).not.toBeInTheDocument();
    expect(screen.queryByText('Guía de multiplicación')).not.toBeInTheDocument();
    expect(screen.queryByText(/Cada puntaje muestra|El color indica/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Colores de prioridad de revisión')).not.toBeInTheDocument();
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
  it('muestra evidencia contextual solo al docente y conserva el editor', () => {
    const renderEvidence = vi.fn((component) => <p>Evidencia contextual de {component.id}</p>);
    const view = render(<GradeBreakdown breakdown={breakdown} renderEvidence={renderEvidence} editingComponentId="p1" renderEditor={() => <input aria-label="Borrador de puntaje" defaultValue="0.5" />} />);
    const draft = screen.getByRole('textbox', { name: 'Borrador de puntaje' });
    fireEvent.change(draft, { target: { value: '0.75' } });
    expect(screen.getByText('Evidencia contextual de p1')).toBeInTheDocument();
    view.rerender(<GradeBreakdown breakdown={breakdown} renderEvidence={renderEvidence} editingComponentId="p1" renderEditor={() => <input aria-label="Borrador de puntaje" defaultValue="0.5" />} />);
    expect(draft).toHaveValue('0.75');
    renderEvidence.mockClear();
    view.rerender(<GradeBreakdown breakdown={breakdown} renderEvidence={renderEvidence} student />);
    expect(renderEvidence).not.toHaveBeenCalled();
    expect(screen.queryByText('Evidencia contextual de p1')).not.toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Pregunta 2, Revisión prioritaria' })).toHaveAttribute('aria-current', 'step');
    fireEvent.click(screen.getByRole('button', { name: 'Pregunta 1, Sin avisos de revisión' }));
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
    expect(screen.queryByLabelText('Colores de prioridad de revisión')).not.toBeInTheDocument();
    expect(screen.getByRole('article')).not.toHaveAttribute('data-review-priority');
  });

  it('conserva el color rojo y el anillo al seleccionar, sin confundir una respuesta incorrecta con baja confianza', () => {
    const low = { ...breakdown, componentes: [{ ...breakdown.componentes[0], origen: 'consenso_ia', valoraciones: [{ puntaje: 1, confianza: 0.4 }] }] };
    render(<GradeBreakdown breakdown={low} selectedComponentId="p1" onSelectComponent={vi.fn()} />);
    const button = screen.getByRole('button', { name: 'Pregunta 1, Revisión prioritaria' });
    expect(button).toHaveClass('bg-rose-50', 'ring-2');
    expect(button).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('article')).toHaveAttribute('data-review-priority', 'blocked');
  });

  it('conserva la prioridad docente al seleccionar y el estado académico al mostrar al estudiante', () => {
    const components = [
      { ...breakdown.componentes[0], id: 'ok', estado: 'correcta' },
      { ...breakdown.componentes[0], id: 'bad', numero: '2', estado: 'incorrecta', puntos_obtenidos: 0 },
      { ...breakdown.componentes[0], id: 'review', numero: '3', estado: 'correcta', requiere_revision: true },
      { ...breakdown.componentes[0], id: 'partial', numero: '4', estado: 'parcial', puntos_obtenidos: 0.5 },
    ];
    const view = render(<GradeBreakdown breakdown={{ ...breakdown, requiere_revision: true, componentes: components }} selectedComponentId="bad" onSelectComponent={vi.fn()} />);
    const bad = screen.getByRole('button', { name: 'Pregunta 2, Sin avisos de revisión' });
    expect(bad).toHaveAttribute('aria-current', 'step');
    expect(bad).toHaveAttribute('data-review-priority', 'safe');
    expect(bad).not.toHaveClass('bg-brand-600');
    expect(screen.getByRole('button', { name: 'Pregunta 1, Sin avisos de revisión' })).toHaveAttribute('data-review-priority', 'safe');
    expect(screen.getByRole('button', { name: 'Pregunta 3, Revisión prioritaria' })).toHaveAttribute('data-review-priority', 'blocked');
    expect(screen.getByRole('button', { name: 'Pregunta 4, Sin avisos de revisión' })).toHaveAttribute('data-review-priority', 'safe');
    expect(screen.getByRole('article')).toHaveAttribute('data-review-priority', 'safe');
    expect(screen.getByRole('article')).not.toHaveAttribute('data-grade-tone');
    expect(screen.getByRole('article').querySelector('svg.lucide-circle-x')).not.toBeNull();
    view.rerender(<GradeBreakdown breakdown={{ ...breakdown, componentes: components }} student />);
    expect(screen.getAllByRole('article').map((item) => item.getAttribute('data-grade-tone'))).toEqual(['success', 'error', 'warning', 'warning']);
  });

  it('138 no añade un aviso genérico por ausencia de fuentes a la lectura principal', () => {
    const withoutSources = { ...breakdown, componentes: [{ ...breakdown.componentes[0], fuentes: [] }] };
    render(<GradeBreakdown breakdown={withoutSources} />);
    expect(screen.queryByText('Sin material adicional pertinente')).not.toBeInTheDocument();
    expect(screen.queryByText(/No se registró material de apoyo/)).not.toBeInTheDocument();
    expect(screen.getByText(/Coincide con la clave oficial/)).toBeInTheDocument();
  });
  it('138 conserva la lectura del estudiante y no le muestra datos técnicos privados', () => {
    render(<GradeBreakdown breakdown={breakdown} student />);
    expect(screen.getByRole('heading', { name: 'Nota explicada respuesta por respuesta' })).toBeInTheDocument();
    expect(screen.getByText('Cada puntaje muestra la evidencia y la razón que lo respalda.')).toBeInTheDocument();
    expect(screen.getAllByText('24')).toHaveLength(2);
    expect(screen.getByText(/Practica explicar el procedimiento/)).toBeInTheDocument();
    expect(screen.queryByText(/evidencia extraída|Guía de multiplicación|Valoraciones registradas/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ajustar/ })).not.toBeInTheDocument();
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
