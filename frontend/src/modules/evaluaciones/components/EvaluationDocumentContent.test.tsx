import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { documentEvaluation } from '@/test/fixtures/documentEvaluation';
import { EvaluationDocumentContent } from './EvaluationDocumentContent';
import type { EvaluationDocumentNode } from '@/types/api';

it('renders headings, reading and each local question once in document order', () => {
  const evaluation = documentEvaluation();
  const renderQuestion = vi.fn((_node: EvaluationDocumentNode, question: Record<string, unknown>) => <p>{String(question.enunciado)}</p>);
  render(<EvaluationDocumentContent document={evaluation.estructura_documento!} questions={evaluation.preguntas}
    evaluationId={evaluation.id} renderQuestion={renderQuestion} />);
  expect(screen.getByRole('heading', { name: 'Observamos' })).toBeInTheDocument();
  expect(screen.getByText(/Una semilla comienza/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Reflexionamos' })).toBeInTheDocument();
  expect(screen.getAllByText('Explica cómo germina.')).toHaveLength(1);
  expect(renderQuestion).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/Una semilla/).compareDocumentPosition(screen.getByText('Explica cómo germina.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByText('Con agua y temperatura adecuada.')).not.toBeInTheDocument();
});

it('escapes source text and reports invalid references without silently hiding content', () => {
  const evaluation = documentEvaluation();
  evaluation.estructura_documento!.nodos[1].texto = '<script>privateWindowCall()</script>';
  const { container, rerender } = render(<EvaluationDocumentContent document={evaluation.estructura_documento!}
    questions={evaluation.preguntas} evaluationId={evaluation.id} />);
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('<script>privateWindowCall()</script>')).toBeInTheDocument();
  rerender(<EvaluationDocumentContent document={evaluation.estructura_documento!} questions={[]}
    evaluationId={evaluation.id} />);
  expect(screen.getByRole('alert')).toHaveTextContent(/pregunta/i);
});
