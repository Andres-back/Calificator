import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { GradeFormulaData } from '@/types/api';
import { GradeFormula } from './GradeFormula';

const formula: GradeFormulaData = {
  puntos_obtenidos: '7.0000', puntos_posibles: '10.0000', nota_maxima: '5.0000',
  nota_base: '3.5000', ajuste_global: '0.2500', nota_antes_redondeo: '3.7500',
  nota_final: '3.75', regla_redondeo: 'half_up', decimales: 2,
};

it('explica puntos, escala, ajuste y resultado sin usar los pesos actuales', () => {
  render(<GradeFormula formula={formula} adjustmentDetail={{ valor: '0.25', motivo_interno: 'Ajuste registrado' }} />);
  expect(screen.getByText('(7 ÷ 10) × 5 da la nota en la escala de la evaluación.')).toBeVisible();
  expect(screen.getByText('3.5 / 5')).toBeVisible();
  expect(screen.getByText('+0.25')).toBeVisible();
  expect(screen.getByText('3.75 / 5')).toBeVisible();
  expect(screen.getByText('Ajuste registrado')).toBeVisible();
});

it('muestra la precisión guardada y explica el límite antes de redondear', () => {
  render(<GradeFormula formula={{ ...formula, puntos_obtenidos: '9.9750', nota_base: '4.9875', nota_antes_redondeo: '5.0000', nota_final: '5.00' }} />);
  expect(screen.getByText('9.975 / 10')).toBeVisible();
  expect(screen.getByText('4.9875 / 5')).toBeVisible();
  expect(screen.getByText(/límite de la escala \(0 a 5\).*nota antes de redondear es 5/)).toBeVisible();
  expect(screen.getByText('5.00 / 5')).toBeVisible();
});

it('no convierte un dato faltante en cero ni divide por un máximo inválido', () => {
  render(<GradeFormula formula={{ ...formula, puntos_posibles: '', nota_final: '' }} />);
  expect(screen.getByText(/No están guardados todos los datos necesarios/)).toBeVisible();
  expect(screen.queryByText('0.00 / 5')).not.toBeInTheDocument();
});
