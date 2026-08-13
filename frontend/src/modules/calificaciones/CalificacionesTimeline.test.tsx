import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Timeline } from './CalificacionesWorkspace';

describe('Timeline de calificación', () => {
  it('abre historiales con notas Decimal serializadas como texto', async () => {
    const user = userEvent.setup();
    render(
      <Timeline
        events={[
          {
            tipo: 'ajustada',
            nota_anterior: '4.5',
            nota_nueva: '4.8',
            feedback: null,
            actor_id: null,
            actor_nombre: 'Profesor Demo',
            timestamp: '2026-08-13T12:00:00Z',
            detalle: 'Nota ajustada por el docente',
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Historial de cambios/i }));

    expect(screen.getByText(/4\.5 → 4\.8/)).toBeInTheDocument();
    expect(screen.getByText('Nota ajustada por el docente')).toBeInTheDocument();
  });
});