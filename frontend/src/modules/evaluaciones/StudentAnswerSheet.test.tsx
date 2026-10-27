import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { documentEvaluation } from '@/test/fixtures/documentEvaluation';
import { StudentAnswerSheet } from './StudentAnswerSheet';

it('shows versioned sections and reading next to answers without renumbering keys', () => {
  const evaluation = documentEvaluation();
  const change = vi.fn();
  render(<StudentAnswerSheet evaluation={evaluation} questions={evaluation.preguntas}
    answers={{}} onAnswerChange={change} onSubmit={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Observamos' })).toBeInTheDocument();
  expect(screen.getByText(/Una semilla comienza/)).toBeInTheDocument();
  fireEvent.change(screen.getAllByLabelText('Tu respuesta')[0], { target: { value: 'Respuesta propia' } });
  expect(change).toHaveBeenCalledWith(7, 'Respuesta propia');
  expect(screen.getByText(/Una semilla/).compareDocumentPosition(screen.getByText('Explica cómo germina.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText('Con agua y temperatura adecuada.')).not.toBeInTheDocument();
});

it('keeps the whole mixed document but only allows online answers', () => {
  const evaluation = documentEvaluation();
  render(<StudentAnswerSheet evaluation={evaluation} questions={evaluation.preguntas.slice(0, 1)}
    answers={{}} onAnswerChange={vi.fn()} onSubmit={vi.fn()} />);
  expect(screen.getByRole('heading', { name: 'Reflexionamos' })).toBeInTheDocument();
  expect(screen.getByText('Explica qué necesita.')).toBeInTheDocument();
  expect(screen.getAllByLabelText('Tu respuesta')).toHaveLength(1);
  expect(screen.getByText(/Se responde en papel/)).toBeInTheDocument();
});
