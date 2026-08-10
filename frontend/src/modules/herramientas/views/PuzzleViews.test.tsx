import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';
import { CrucigramaView } from './CrucigramaView';
import { MatchingView } from './MatchingView';
import { SopaLetrasView } from './SopaLetrasView';

describe('renderización de juegos pedagógicos', () => {
  it('presenta un crucigrama jugable con pistas', () => {
    const clue = { numero: 1, pista: 'Líquido esencial', respuesta: 'AGUA', fila: 0, columna: 0, longitud: 4 };
    const data: CrucigramaContenido = {
      titulo: 'Crucigrama del agua',
      instrucciones: 'Completa la palabra.',
      preguntas_horizontales: [clue],
      preguntas_verticales: [],
      crucigrama: { grid: [['A', 'G', 'U', 'A']], size: 4, pistas_horizontal: [clue], pistas_vertical: [] },
    };

    render(<CrucigramaView data={data} />);

    expect(screen.getByText('Líquido esencial')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it('presenta una sopa con grilla y banco de palabras', () => {
    const data: SopaContenido = {
      titulo: 'Sopa del agua',
      instrucciones: 'Encuentra AGUA.',
      grilla: [['A', 'G'], ['U', 'A']],
      banco_palabras: ['AGUA'],
      palabras: [{ palabra: 'AGUA', fila: 0, col: 0, fila_fin: 1, col_fin: 1, direccion: 'diagonal', invertida: false }],
    };

    render(<SopaLetrasView data={data} />);

    expect(screen.getByText('AGUA')).toBeInTheDocument();
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it.each(['Unir columnas', 'Emparejar'])('presenta %s sin perder ningún par', (title) => {
    const data: MatchingContenido = {
      titulo: title,
      instrucciones: 'Relaciona cada concepto.',
      columna_izquierda: [{ numero: 1, texto: 'Evaporación' }, { numero: 2, texto: 'Condensación' }],
      columna_derecha: [{ letra: 'A', texto: 'Gas a líquido' }, { letra: 'B', texto: 'Líquido a gas' }],
      soluciones: [{ numero: 1, letra: 'B' }, { numero: 2, letra: 'A' }],
      pares: [{ izquierda: 'Evaporación', derecha: 'Líquido a gas' }, { izquierda: 'Condensación', derecha: 'Gas a líquido' }],
    };

    render(<MatchingView data={data} />);

    expect(screen.getByText('Evaporación')).toBeInTheDocument();
    expect(screen.getByText('Condensación')).toBeInTheDocument();
    expect(screen.getByText('Gas a líquido')).toBeInTheDocument();
    expect(screen.getByText('Líquido a gas')).toBeInTheDocument();
  });

  it('muestra un estado de revisión en vez de una grilla rota', () => {
    render(<SopaLetrasView data={{ titulo: 'Vacía', instrucciones: '', grilla: [], palabras: [], banco_palabras: [] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('necesita revisión');
  });
});
