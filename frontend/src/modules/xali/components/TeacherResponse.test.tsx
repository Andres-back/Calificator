import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TeacherResponse } from './TeacherResponse';
import { clipLine, projection } from '../visualGeometry';
import type { PlaneVisual } from '../visualContent';

const plane: PlaneVisual = { id: 'p', tipo: 'plano', titulo: 'Coordenadas', descripcion: 'A, O y B.', x: [-5, 5], y: [-5, 5], puntos: [{ x: -2, y: 3, etiqueta: 'A' }, { x: 0, y: 0, etiqueta: 'O' }, { x: 3, y: -1, etiqueta: 'B' }] };
describe('teacher visual response', () => {
  it('projects signs, origin, equal units and clips a line deterministically', () => {
    const { X, Y } = projection(plane);
    expect(X(-2)).toBeLessThan(X(0)); expect(Y(3)).toBeLessThan(Y(0));
    expect(X(3)).toBeGreaterThan(X(0)); expect(Y(-1)).toBeGreaterThan(Y(0));
    expect(X(1) - X(0)).toBeCloseTo(Y(0) - Y(1));
    expect(clipLine(plane, { pendiente: 1, intercepto: 0 })).toEqual([{ x: -5, y: -5 }, { x: 5, y: 5 }]);
  });
  it('renders and expands data, closes with Escape and restores focus', async () => {
    const user = userEvent.setup();
    render(<TeacherResponse content={`Explicación anterior.\n\n\`\`\`xcalificator-visual-v1\n${JSON.stringify({ version: 1, visuales: [plane] })}\n\`\`\``} />);
    expect(screen.getByText('Explicación anterior.')).toBeVisible();
    await screen.findByRole('img', { name: 'Coordenadas: A, O y B.' });
    const expand = screen.getByRole('button', { name: 'Ampliar Coordenadas' });
    await user.click(expand);
    const dialog = await screen.findByRole('dialog', { name: 'Coordenadas' });
    await waitFor(() => expect(within(dialog).getByRole('img')).toBeVisible());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(expand).toHaveFocus();
  });
});
