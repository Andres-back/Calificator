import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { GradeBreakdownData } from '@/types/api';
import { XaliFeedbackStory } from './XaliFeedbackStory';

const analytics = vi.hoisted(() => ({ trackEvent: vi.fn() }));
vi.mock('@/lib/analytics', () => analytics);

const breakdown: GradeBreakdownData = {
  id: 'd1', calificacion_id: 'c1', version: 1, origen: 'automatico', cobertura_estado: 'completa', requiere_revision: false, created_at: '2026-09-19T00:00:00Z',
  formula: { puntos_obtenidos: 3, puntos_posibles: 5, nota_maxima: 5, nota_base: 3, ajuste_global: 0, nota_antes_redondeo: 3, regla_redondeo: 'half_up', decimales: 1, nota_final: 3 },
  componentes: [
    { id: 'p1', clave: 'pregunta:1', orden: 0, tipo: 'pregunta', numero: '1', titulo: 'La idea principal', respuesta_estudiante: 'A', respuesta_referencia: 'A', puntos_obtenidos: 2, puntos_maximos: 2, estado: 'correcta', explicacion: 'Identificaste y justificaste la idea principal.', origen: 'ia', requiere_revision: false, evidencia_paginas: [1] },
    { id: 'p2', clave: 'pregunta:2', orden: 1, tipo: 'pregunta', numero: '2', titulo: 'La conclusión', respuesta_estudiante: 'B', respuesta_referencia: 'C', puntos_obtenidos: 1, puntos_maximos: 3, estado: 'parcial', explicacion: 'Tu conclusión todavía no usa la evidencia central.', orientacion_mejora: 'Vuelve al dato central y explica cómo respalda tu conclusión.', origen: 'ia', requiere_revision: false, evidencia_paginas: [1] },
  ],
};

describe('XaliFeedbackStory', () => {
  it('lets the student navigate and open the exact detail', async () => {
    const user = userEvent.setup();
    const open = vi.fn();
    render(<XaliFeedbackStory evaluationId="e1" breakdown={breakdown} onOpenDetail={open} />);
    expect(screen.getByText('Tu trabajo ya tiene una historia')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(screen.getByText('Esto lo hiciste bien')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ver por qué/ }));
    expect(open).toHaveBeenCalledWith('p1');
    expect(analytics.trackEvent).toHaveBeenCalledWith('feedback_story_detail_opened', {
      evaluacion_id: 'e1', calificacion_id: 'c1', metadata_json: { mode: expect.any(String), step: 2 },
    });
  });

  it('can pause, switch to static mode, skip and replay', async () => {
    const user = userEvent.setup();
    render(<XaliFeedbackStory evaluationId="e1" breakdown={breakdown} />);
    const pause = screen.queryByRole('button', { name: 'Pausar movimiento' });
    if (pause) {
      await user.click(pause);
      expect(screen.getByRole('button', { name: 'Reanudar movimiento' })).toHaveAttribute('aria-pressed', 'true');
    }
    await user.click(screen.getByRole('checkbox', { name: 'Vista sin movimiento' }));
    expect(localStorage.getItem('xcalificator.feedback-motion')).toBe('reduced');
    expect(screen.getByText('Prueba este siguiente paso')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Navegar la historia' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Omitir historia' }));
    expect(screen.getByText(/explicación completa sigue disponible/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver historia con Xali' }));
    expect(screen.getByText('Tu trabajo ya tiene una historia')).toBeInTheDocument();
  });

  it('does not render for a breakdown requiring review', () => {
    const { container } = render(<XaliFeedbackStory evaluationId="e1" breakdown={{ ...breakdown, requiere_revision: true }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
