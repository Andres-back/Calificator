import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { EvaluationCreateMenu } from './EvaluationCreateMenu';

it('opens one method selector and runs only the explicitly selected callback', async () => {
  const user = userEvent.setup();
  const ai = vi.fn(); const photo = vi.fn(); const manual = vi.fn();
  render(<EvaluationCreateMenu onAI={ai} onPhoto={photo} onManual={manual} />);
  expect(screen.queryByRole('button', { name: 'Crear con IA' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Crear evaluación' }));
  await user.click(screen.getByRole('button', { name: 'Crear manualmente' }));
  expect(manual).toHaveBeenCalledOnce();
  expect(ai).not.toHaveBeenCalled(); expect(photo).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Crear evaluación' })).toHaveAttribute('aria-expanded', 'false');
});

it('requires subject context for photo and cancels by Escape without writing', async () => {
  const user = userEvent.setup(); const callback = vi.fn();
  render(<EvaluationCreateMenu onAI={callback} onPhoto={callback} onManual={callback} photoDisabled />);
  const opener = screen.getByRole('button', { name: 'Crear evaluación' });
  await user.click(opener);
  expect(screen.getByRole('button', { name: 'Usar foto o PDF' })).toBeDisabled();
  await user.keyboard('{Escape}');
  expect(opener).toHaveFocus();
  expect(callback).not.toHaveBeenCalled();
});
