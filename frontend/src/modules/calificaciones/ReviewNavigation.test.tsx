import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ReviewNavigation } from './ReviewNavigation';

it('ofrece cuatro accesos con estado y panel asociado sin otra ruta', async () => {
  const change = vi.fn();
  render(<ReviewNavigation active="revision" onChange={change} />);
  const answers = screen.getByRole('button', { name: 'Respuestas y puntajes' });
  expect(answers).toHaveAttribute('aria-expanded', 'true');
  expect(answers).toHaveAttribute('aria-controls', 'grade-review-panel');
  for (const name of ['Evidencia', 'Retroalimentación', 'Historial']) {
    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
  }
  expect(change.mock.calls.map(([section]) => section)).toEqual(['evidencia', 'retroalimentacion', 'historial']);
});
