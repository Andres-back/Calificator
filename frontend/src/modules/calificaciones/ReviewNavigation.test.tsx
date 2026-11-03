import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ReviewNavigation } from './ReviewNavigation';

it('ofrece cuatro accesos con estado y panel asociado sin otra ruta', async () => {
  const change = vi.fn();
  const view = render(<ReviewNavigation active="resumen" onChange={change} />);
  const answers = screen.getByRole('button', { name: 'Respuestas y puntajes' });
  expect(answers).toHaveAttribute('aria-expanded', 'false');
  expect(answers).toHaveAttribute('aria-controls', 'grade-review-panel');
  await userEvent.click(answers);
  for (const name of ['Evidencia', 'Retroalimentación', 'Historial']) {
    const button = screen.getByRole('button', { name });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
  }
  view.rerender(<ReviewNavigation active="revision" onChange={change} />);
  expect(screen.queryByRole('navigation', { name: 'Secciones de la calificación' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Revisión por pregunta' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Volver a opciones' }));
  expect(change.mock.calls.map(([section]) => section)).toEqual(['revision', 'evidencia', 'retroalimentacion', 'historial', 'resumen']);
});
