import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FeedbackMessage } from './FeedbackMessage';

it('muestra secciones legibles como texto seguro, no HTML', () => {
  render(<FeedbackMessage text={'Aciertos: Identificaste a Nico.\nSiguiente paso: <script>no ejecutar</script>'} />);
  expect(screen.getByRole('heading', { name: 'Aciertos' })).toBeInTheDocument();
  expect(screen.getByText('Identificaste a Nico.')).toBeInTheDocument();
  expect(screen.getByText('<script>no ejecutar</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});

it('135 conserva explicación y práctica juntas y tolera el motivo decorativo ausente', () => {
  const view = render(<FeedbackMessage text="Pregunta 5: Confundiste el propósito del viaje. Siguiente paso: Compara las opciones con el párrafo inicial." />);
  const question = screen.getByRole('heading', { name: 'Pregunta 5' }).closest('section')!;
  expect(within(question).getByText('Compara las opciones con el párrafo inicial.')).toBeInTheDocument();
  const motif = view.container.querySelector('img')!;
  expect(motif).toHaveAttribute('alt', '');
  expect(motif).toHaveAttribute('aria-hidden', 'true');
  fireEvent.error(motif);
  expect(screen.getByText('Confundiste el propósito del viaje.')).toBeInTheDocument();
  expect(motif).not.toBeVisible();
});
