import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { ScorePlanEditor } from './ScorePlanEditor';
import { type ScorePlan, type ScoreQuestion } from './scoreAllocation';

const questions: ScoreQuestion[] = Array.from({ length: 9 }, (_, i) => ({ clave: `p${i + 1}`, numero: String(i + 1), titulo: `Enunciado ${i + 1}`, tipo: i < 7 ? 'opcion_multiple' : 'abierta', puntaje: i === 8 ? '.52' : '.56' }));
function Harness({ items = questions }: { items?: ScoreQuestion[] }) {
  const [plan, setPlan] = useState<ScorePlan>({ schema_version: 1, modo: 'bloques', grupos: [
    { id: 'a', titulo: 'Primer bloque', claves: questions.slice(0, 5).map(q => q.clave), presupuesto: '2', fijados: {} },
    { id: 'b', titulo: 'Segundo bloque', claves: questions.slice(5).map(q => q.clave), presupuesto: '3', fijados: {} },
  ] });
  return <ScorePlanEditor plan={plan} questions={items} maximum="5" onChange={setPlan} />;
}
it('137 muestra bloques colectivos y redistribuye solo el bloque al fijar una pregunta', async () => {
  render(<Harness />); const user = userEvent.setup();
  expect(screen.getByTestId('proposal-p1')).toHaveTextContent('0,4');
  await user.click(screen.getByRole('checkbox', { name: 'Fijar posición 1' }));
  const input = screen.getByLabelText('Valor fijado posición 1');
  await user.clear(input); await user.type(input, '0,9');
  expect(screen.getByTestId('proposal-p2')).toHaveTextContent('0,275');
  expect(screen.getByTestId('proposal-p6')).toHaveTextContent('0,75');
});
it('137 detecta solapamientos y valores imposibles sin cambiar la escala', async () => {
  render(<Harness />); const user = userEvent.setup();
  await user.clear(screen.getByLabelText('Hasta posición bloque 1'));
  await user.type(screen.getByLabelText('Hasta posición bloque 1'), '6');
  expect(screen.getByRole('alert')).toHaveTextContent('una sola vez');
});
it('137 editar el final del segundo rango no pierde su inicio al vaciar el campo', async () => {
  render(<Harness />); const user = userEvent.setup();
  const end = screen.getByLabelText('Hasta posición bloque 2');
  await user.clear(end); await user.type(end, '9');
  expect(screen.getByLabelText('Desde posición bloque 2')).toHaveValue('6');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByTestId('proposal-p6')).toHaveTextContent('0,75');
});
it('137 agrupa por tipo y conserva los presupuestos colectivos al editarlos', async () => {
  render(<Harness />); const user = userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Forma de repartir'), 'tipo');
  const budgets = screen.getAllByLabelText(/Puntos del bloque/);
  await user.clear(budgets[0]); await user.type(budgets[0], '2,5');
  await user.clear(budgets[1]); await user.type(budgets[1], '2,5');
  expect(screen.getByTestId('proposal-p1')).toHaveTextContent('0,3572');
  expect(screen.getByTestId('proposal-p8')).toHaveTextContent('1,25');
});
it('137 usa secciones existentes, sin confundir preguntas con el mismo número', async () => {
  render(<Harness items={questions.map((q, i) => ({ ...q, numero: '1', seccion_id: i < 5 ? 'a' : 'b', seccion_titulo: i < 5 ? 'Comprensión' : 'Aplicación' }))} />);
  await userEvent.setup().selectOptions(screen.getByLabelText('Forma de repartir'), 'seccion');
  expect(screen.getByRole('heading', { name: 'Comprensión' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Aplicación' })).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox', { name: /Fijar posición/ })).toHaveLength(9);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('137 no inventa secciones cuando el documento no las tiene', () => {
  render(<Harness />);
  expect(screen.getByRole('option', { name: 'Por secciones del documento' })).toBeDisabled();
});
