import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { ReviewContextNavigation } from './ReviewContextNavigation';

it('138 muestra ubicación completa y una sola flecha de regreso a la lista', () => {
  const onBack = vi.fn();
  render(<MemoryRouter><ReviewContextNavigation materiaId="m1" materiaName="Sociales · 6°B" evaluationName="Hidrografía" studentName="Estudiante Prueba" onBack={onBack} backLabel="Volver a lista" bookHref="/app/materias/m1/boletin?filtro=prioridad" /></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Ubicación de la revisión' });
  for (const label of ['Sociales · 6°B', 'Hidrografía', 'Estudiante Prueba']) expect(within(nav).getByText(label)).toBeInTheDocument();
  expect(within(nav).getByText('Estudiante Prueba')).toHaveAttribute('aria-current', 'page');
  expect(nav.querySelectorAll('[data-review-back-arrow]')).toHaveLength(1);
  expect(within(nav).getAllByRole('button')).toHaveLength(1);
  fireEvent.click(within(nav).getByRole('button', { name: 'Volver a lista' }));
  expect(onBack).toHaveBeenCalledOnce();
  expect(within(nav).getByRole('link', { name: 'Libro de notas' })).toHaveAttribute('href', '/app/materias/m1/boletin?filtro=prioridad');
  expect(within(nav).getByRole('link', { name: 'Libro de notas' }).querySelector('[data-review-back-arrow]')).toBeNull();
});

it('138 enlace directo dispone de regreso determinista sin depender del historial', () => {
  render(<MemoryRouter><ReviewContextNavigation materiaId="m1" materiaName="Lenguaje" evaluationName="Lectura" backHref="/app/materias/m1/evaluaciones" backLabel="Volver a evaluaciones" /></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Ubicación de la revisión' });
  expect(within(nav).getByRole('link', { name: 'Volver a evaluaciones' })).toHaveAttribute('href', '/app/materias/m1/evaluaciones');
  expect(within(nav).getByText('Lectura')).toHaveAttribute('aria-current', 'page');
  expect(within(nav).queryAllByRole('link')).toHaveLength(1);
  expect(nav.querySelectorAll('[data-review-back-arrow]')).toHaveLength(1);
});

it('138 solo muestra el libro válido de la materia y no crea enlaces sin autorización recibida', () => {
  const { rerender } = render(<MemoryRouter><ReviewContextNavigation backHref="/app/calificaciones" backLabel="Volver a pendientes" bookHref="https://evil.test" /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Libro de notas' })).not.toBeInTheDocument();
  expect(screen.getByText('Revisión')).toHaveAttribute('aria-current', 'page');
  rerender(<MemoryRouter><ReviewContextNavigation materiaId="m1" materiaName="Lenguaje" backHref="/app/calificaciones" backLabel="Volver a pendientes" bookHref="/app/materias/m2/boletin" /></MemoryRouter>);
  expect(screen.queryByRole('link', { name: 'Libro de notas' })).not.toBeInTheDocument();
});

it('138 una acción onBack prevalece sobre backHref y permite nombres largos sin controles duplicados', () => {
  render(<MemoryRouter><ReviewContextNavigation materiaName={'Materia '.repeat(20)} evaluationName={'Evaluación '.repeat(20)} studentName={'Estudiante '.repeat(20)} onBack={vi.fn()} backHref="/app/calificaciones" backLabel="Volver a lista" /></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Ubicación de la revisión' });
  expect(within(nav).getAllByRole('button')).toHaveLength(1);
  expect(within(nav).queryAllByRole('link')).toHaveLength(0);
  expect(nav).toHaveClass('min-w-0');
  expect(nav.querySelectorAll('[data-review-back-arrow]')).toHaveLength(1);
});
