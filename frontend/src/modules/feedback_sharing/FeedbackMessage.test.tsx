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

it('141 presenta logros y próximos pasos sin tarjetas anidadas ni una cabecera decorativa', () => {
  const { container } = render(<FeedbackMessage presentation="premium" text="Aciertos: Identificaste la idea principal. Qué mejorar: Explica el motivo. Siguiente paso: Añade un ejemplo." />);
  expect(screen.getByRole('heading', { name: 'Lo que hiciste bien' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Qué puedes mejorar' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tu siguiente paso' })).toBeInTheDocument();
  expect(screen.queryByText('Aprende paso a paso')).not.toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  for (const section of container.querySelectorAll('[data-feedback-block]')) expect(section.className).not.toContain('rounded-xl');
});

it('141 conserva comentarios antiguos y Markdown seguro sin inventar aciertos', () => {
  const { container } = render(<FeedbackMessage presentation="premium" text={'Revisa **el último párrafo**.\n\nNo se distingue la respuesta final. <script>no ejecutar</script>'} />);
  expect(screen.queryByRole('heading', { name: 'Lo que hiciste bien' })).not.toBeInTheDocument();
  expect(screen.getByText('el último párrafo').tagName).toBe('STRONG');
  expect(container.textContent).toContain('No se distingue la respuesta final.');
  expect(container.querySelector('script')).toBeNull();
});
