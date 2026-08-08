import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StudentActivityPlayer } from './StudentActivityPlayer';
import type { StudentActivity } from '@/types/api';

describe('StudentActivityPlayer', () => {
  it('permite completar un crucigrama sin revelar la solución', async () => {
    const onAnswersChange = vi.fn();
    const activity: StudentActivity = {
      tipo: 'crucigrama',
      titulo: 'Conceptos del espacio',
      contenido: {
        grid_mascara: [[true, true, true]],
        pistas_horizontales: [{
          numero: 1,
          numero_evaluacion: 1,
          pista: 'Estrella más cercana',
          fila: 0,
          columna: 0,
          longitud: 3,
          direccion: 'horizontal',
        }],
        pistas_verticales: [],
      },
    };

    render(<StudentActivityPlayer activity={activity} onAnswersChange={onAnswersChange} />);

    fireEvent.change(screen.getByLabelText('Fila 1, columna 1'), { target: { value: 'S' } });
    fireEvent.change(screen.getByLabelText('Fila 1, columna 2'), { target: { value: 'O' } });
    fireEvent.change(screen.getByLabelText('Fila 1, columna 3'), { target: { value: 'L' } });

    await waitFor(() => expect(onAnswersChange).toHaveBeenLastCalledWith({ 1: 'SOL' }));
    expect(screen.queryByText('Ver solución')).not.toBeInTheDocument();
    expect(screen.getByText('Estrella más cercana')).toBeInTheDocument();
  });
});
