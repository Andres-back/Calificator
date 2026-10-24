import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { FeedbackMessage } from './FeedbackMessage';

it('muestra secciones legibles como texto seguro, no HTML', () => {
  render(<FeedbackMessage text={'Aciertos: Identificaste a Nico.\nSiguiente paso: <script>no ejecutar</script>'} />);
  expect(screen.getByRole('heading', { name: 'Aciertos' })).toBeInTheDocument();
  expect(screen.getByText('Identificaste a Nico.')).toBeInTheDocument();
  expect(screen.getByText('<script>no ejecutar</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
});
