import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { documentEvaluation } from '@/test/fixtures/documentEvaluation';
import { evaluationToWizardState } from './generationWizardModel';
import { SectionScoringEditor } from './SectionScoringEditor';

function Example() {
  const [state, setState] = useState(() => evaluationToWizardState(documentEvaluation()));
  return <><SectionScoringEditor document={state.estructuraDocumento!} questions={state.questions} maximum={state.notaMaxima}
    onChange={(document, questions, confirmed) => setState({ ...state, estructuraDocumento: document, questions, sectionScoringConfirmed: confirmed })} />
    <output aria-label="Puntos vigentes">{state.questions.map(q => q.puntaje).join(' + ')}</output></>;
}

it('leaves scoring off by default and applies or restores only after explicit confirmation', () => {
  render(<Example />);
  expect(screen.getByLabelText(/Asignar puntaje/)).not.toBeChecked();
  fireEvent.click(screen.getByLabelText(/Asignar puntaje/));
  fireEvent.change(screen.getByLabelText('Puntos de Observamos'), { target: { value: '3,25' } });
  fireEvent.change(screen.getByLabelText('Puntos de Reflexionamos'), { target: { value: '1,75' } });
  expect(screen.getByLabelText('Puntos vigentes')).toHaveTextContent('2 + 3');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar reparto de puntos' }));
  expect(screen.getByLabelText('Puntos vigentes')).toHaveTextContent('3.25 + 1.75');
  fireEvent.click(screen.getByLabelText(/Asignar puntaje/));
  expect(screen.getByLabelText('Puntos vigentes')).toHaveTextContent('3.25 + 1.75');
  fireEvent.click(screen.getByRole('button', { name: 'Restaurar puntajes base' }));
  expect(screen.getByLabelText('Puntos vigentes')).toHaveTextContent('2 + 3');
});
