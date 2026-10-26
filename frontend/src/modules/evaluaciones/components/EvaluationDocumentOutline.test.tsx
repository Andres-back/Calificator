import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { documentEvaluation, documentId } from '@/test/fixtures/documentEvaluation';
import { evaluationToWizardState } from './generationWizardModel';
import { EvaluationDocumentOutline } from './EvaluationDocumentOutline';

it('navigates by section and offers contextual edits without flattening questions', () => {
  const state = evaluationToWizardState(documentEvaluation());
  const onChange = vi.fn(), select = vi.fn();
  render(<EvaluationDocumentOutline document={state.estructuraDocumento!} questions={state.questions}
    activeQuestionId={documentId(1)} onSelectQuestion={select} onChange={onChange} />);
  expect(screen.getByLabelText('Sección actual')).toHaveValue(documentId(10));
  fireEvent.change(screen.getByLabelText('Título de la sección'), { target: { value: 'Observamos juntos' } });
  expect(onChange.mock.lastCall?.[0].nodos[0].titulo).toBe('Observamos juntos');
  expect(onChange.mock.lastCall?.[0].revision.confirmado).toBe(false);
  fireEvent.change(screen.getByLabelText('Sección actual'), { target: { value: documentId(20) } });
  expect(select).toHaveBeenLastCalledWith(documentId(2));
  expect(screen.queryByLabelText('Texto de lectura')).not.toBeInTheDocument();
});

it('allows a section without questions and never adds a grading question for its text', () => {
  const state = evaluationToWizardState(documentEvaluation());
  state.estructuraDocumento!.nodos.push({ id: documentId(30), tipo: 'seccion', orden: 2, padre_id: null, titulo: 'Conversamos' });
  const select = vi.fn();
  render(<EvaluationDocumentOutline document={state.estructuraDocumento!} questions={state.questions}
    activeQuestionId={documentId(1)} onSelectQuestion={select} />);
  fireEvent.change(screen.getByLabelText('Sección actual'), { target: { value: documentId(30) } });
  expect(select).toHaveBeenLastCalledWith(null);
  expect(screen.getByText(/no tiene preguntas calificables/i)).toBeInTheDocument();
  expect(screen.queryByLabelText('Título de la sección')).not.toBeInTheDocument();
});

it('keeps the chosen parent section editable when its first question belongs to a subsection', () => {
  const state = evaluationToWizardState(documentEvaluation());
  const document = state.estructuraDocumento!;
  document.nodos.find(node => node.id === documentId(12))!.padre_id = documentId(30);
  document.nodos.find(node => node.id === documentId(12))!.orden = 0;
  document.nodos.push({ id: documentId(30), tipo: 'seccion', padre_id: documentId(10), orden: 1, titulo: 'Detalles de la observación' });
  function Editor() {
    const [active, setActive] = useState<string | null>(documentId(2));
    return <><EvaluationDocumentOutline document={document} questions={state.questions}
      activeQuestionId={active} onSelectQuestion={setActive} onChange={vi.fn()} />
      <button onClick={() => setActive(documentId(2))}>Ir a la otra pregunta</button></>;
  }
  render(<Editor />);
  fireEvent.change(screen.getByLabelText('Sección actual'), { target: { value: documentId(10) } });
  expect(screen.getByLabelText('Sección actual')).toHaveValue(documentId(10));
  expect(screen.getByLabelText('Título de la sección')).toHaveValue('Observamos');
  expect(screen.getByLabelText('Texto de lectura')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Ir a la otra pregunta' }));
  expect(screen.getByLabelText('Sección actual')).toHaveValue(documentId(20));
});

it('starts in general content when the active question is outside sections', () => {
  const state = evaluationToWizardState(documentEvaluation());
  Object.assign(state.estructuraDocumento!.nodos.find(node => node.id === documentId(12))!, { padre_id: null, orden: 2 });
  render(<EvaluationDocumentOutline document={state.estructuraDocumento!} questions={state.questions}
    activeQuestionId={documentId(1)} onSelectQuestion={vi.fn()} onChange={vi.fn()} />);
  expect(screen.getByLabelText('Sección actual')).toHaveValue('');
  expect(screen.queryByLabelText('Título de la sección')).not.toBeInTheDocument();
});
