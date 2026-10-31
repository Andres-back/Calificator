import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { GradeBreakdownData } from '@/types/api';
import { GradeAnalysisDetails } from './GradeAnalysisDetails';

const breakdown: GradeBreakdownData = {
  id: 'd1', calificacion_id: 'c1', version: 3, origen: 'automatico',
  cobertura_estado: 'completa', requiere_revision: false, created_at: '2026-10-30T00:00:00Z',
  formula: { puntos_obtenidos: 3, puntos_posibles: 4, nota_maxima: 5, nota_base: 3.75, ajuste_global: 0, nota_antes_redondeo: 3.75, regla_redondeo: 'half_up', decimales: 2, nota_final: 3.75 },
  componentes: [{
    id: 'p1', clave: 'seccion-a:pregunta:1', orden: 0, tipo: 'pregunta', numero: '1',
    titulo: 'Primera pregunta', respuesta_estudiante: '24', respuesta_referencia: '24',
    puntos_obtenidos: 0.3572, puntos_maximos: 0.3572, estado: 'correcta',
    explicacion: 'Coincide con la clave oficial.', origen: 'objetivo', requiere_revision: false,
    evidencia_paginas: [2], valoraciones: [
      { evaluador: 'A', puntaje: 0, explicacion: 'Primera valoración guardada.' },
      { evaluador: 'B', puntaje: 0.3572, explicacion: 'Segunda valoración guardada.' },
    ],
    fuentes: [{ source_id: 's1', chunk_id: 'ch1', titulo: 'Guía de multiplicación', version: '3', fragmento: 'Seis grupos de cuatro forman veinticuatro.' }],
  }],
};

describe('138 GradeAnalysisDetails', () => {
  it('conserva fuentes, versiones, fragmentos, proceso y valoraciones fuera de la lectura principal', () => {
    const source = JSON.stringify(breakdown);
    render(<GradeAnalysisDetails breakdown={breakdown} />);
    const analysis = screen.getByRole('region', { name: 'Detalle del análisis por pregunta' });
    const question = within(analysis).getByRole('group', { name: 'Pregunta 1 · Primera pregunta' });
    expect(question).toHaveAttribute('data-analysis-component-id', 'p1');
    expect(question).toHaveAttribute('data-analysis-component-key', 'seccion-a:pregunta:1');
    expect(question).not.toHaveAttribute('open');
    fireEvent.click(within(question).getByText('Pregunta 1 · Primera pregunta'));
    expect(question).toHaveAttribute('open');
    expect(within(question).getByText('Guía de multiplicación')).toBeInTheDocument();
    expect(within(question).getByText('Versión: 3')).toBeInTheDocument();
    expect(within(question).getByText('Seis grupos de cuatro forman veinticuatro.')).toBeInTheDocument();
    expect(within(question).getByText(/Valoración A: 0 puntos\. Primera valoración guardada/)).toBeInTheDocument();
    expect(within(question).getByText(/Valoración B: 0.3572 puntos\. Segunda valoración guardada/)).toBeInTheDocument();
    expect(within(question).getByText(/evidencia extraída → valoración objetiva → comparación registrada/)).toBeInTheDocument();
    expect(JSON.stringify(breakdown)).toBe(source);
  });

  it('distingue identidades aunque dos secciones tengan una pregunta con el mismo número', () => {
    const repeated = { ...breakdown, componentes: [breakdown.componentes[0], { ...breakdown.componentes[0], id: 'p2', clave: 'seccion-b:pregunta:1', titulo: 'Segunda sección' }] };
    render(<GradeAnalysisDetails breakdown={repeated} />);
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    expect(groups.map(group => group.getAttribute('data-analysis-component-id'))).toEqual(['p1', 'p2']);
    expect(groups.map(group => group.getAttribute('data-analysis-component-key'))).toEqual(['seccion-a:pregunta:1', 'seccion-b:pregunta:1']);
    expect(groups[0]).toHaveAccessibleName('Pregunta 1 · Primera pregunta');
    expect(groups[1]).toHaveAccessibleName('Pregunta 1 · Segunda sección');
  });

  it('no inventa material ni valoraciones y conserva el origen docente o asistido registrado', () => {
    const noSource = { ...breakdown, componentes: [{ ...breakdown.componentes[0], origen: 'docente', fuentes: [], valoraciones: [] }] };
    const view = render(<GradeAnalysisDetails breakdown={noSource} />);
    expect(screen.getByText('No se registró material de apoyo para esta respuesta.')).toBeInTheDocument();
    expect(screen.getByText('No se registraron valoraciones individuales.')).toBeInTheDocument();
    expect(screen.getByText(/evidencia extraída → valoración docente → comprobación disponible/)).toBeInTheDocument();
    view.rerender(<GradeAnalysisDetails breakdown={{ ...noSource, componentes: [{ ...noSource.componentes[0], origen: 'consenso_ia', valoraciones: [{ evaluador: 'Principal', puntaje: null }] }] }} />);
    expect(screen.getByText('Valoración Principal: — puntos.')).toBeInTheDocument();
    expect(screen.getByText(/valoración asistida por IA → comprobación disponible/)).toBeInTheDocument();
  });

  it('es presentación pura: abrir detalles no consulta ni cambia datos académicos', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const source = JSON.stringify(breakdown);
    render(<GradeAnalysisDetails breakdown={breakdown} />);
    fireEvent.click(screen.getByText('Pregunta 1 · Primera pregunta'));
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(breakdown)).toBe(source);
    fetch.mockRestore();
  });

  it('presenta ausencia de componentes sin fabricar un análisis', () => {
    render(<GradeAnalysisDetails breakdown={{ ...breakdown, componentes: [] }} />);
    expect(screen.getByText('No hay detalles por pregunta registrados.')).toBeInTheDocument();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });
});
