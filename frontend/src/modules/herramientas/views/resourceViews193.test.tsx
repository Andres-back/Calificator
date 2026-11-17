import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CrucigramaContenido, MatchingContenido, SopaContenido } from '@/types/api';
import { ContenidoView, ResourceInstructions, type ToolContent } from './ContenidoView';
import { CrucigramaView } from './CrucigramaView';
import { MatchingView } from './MatchingView';
import { SopaLetrasView } from './SopaLetrasView';
import { difficultyLabel, optionText, pointsLabel, typeLabel } from './resourceLabels';

const base = { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [] };

describe('193 textos legibles en los recursos', () => {
  it('no repite la letra de la opción y respeta textos que empiezan por otra letra', () => {
    expect(optionText('A. El conejo', 0)).toBe('El conejo');
    expect(optionText('b) La hierba', 1)).toBe('La hierba');
    expect(optionText('C - El zorro', 2)).toBe('El zorro');
    // «C. elegans» es la opción A: la «C.» es parte del texto.
    expect(optionText('C. elegans es un gusano', 0)).toBe('C. elegans es un gusano');
    expect(optionText('A la derecha', 0)).toBe('A la derecha');
    expect(optionText('A)', 0)).toBe('A)');
  });

  it('traduce tipos, dificultad y puntos', () => {
    expect(typeLabel('opcion_multiple')).toBe('Opción múltiple');
    expect(typeLabel('opción múltiple')).toBe('Opción múltiple');
    expect(typeLabel('verdadero/falso')).toBe('Verdadero o falso');
    expect(typeLabel('aplicacion')).toBe('Aplicación');
    expect(typeLabel('juego_de_roles')).toBe('Juego de roles');
    expect(typeLabel('')).toBe('');
    expect(difficultyLabel('baja')).toBe('Dificultad baja');
    expect(difficultyLabel('retadora')).toBe('retadora');
    expect(pointsLabel(1)).toBe('1 punto');
    expect(pointsLabel(2)).toBe('2 puntos');
  });
});

describe('193 vistas de recursos en celular', () => {
  it('taller: enunciado a todo el ancho, etiquetas legibles y opciones sin letra duplicada', () => {
    const data = {
      ...base,
      objetivo: 'Identificar productores.',
      instrucciones: 'Lee cada punto.',
      puntos: [{ numero: 1, tipo: 'opcion_multiple', dificultad: 'baja', puntaje: 1, enunciado: '¿Cuál es un productor?', opciones: ['A. El conejo', 'B. La hierba'] }],
    } as unknown as ToolContent;
    const { container } = render(<ContenidoView tipo="taller" data={data} />);

    expect(screen.getByText('El conejo')).toBeInTheDocument();
    expect(screen.queryByText(/A\. El conejo/)).not.toBeInTheDocument();
    expect(screen.getByText('Opción múltiple')).toBeInTheDocument();
    expect(screen.getByText('Dificultad baja')).toBeInTheDocument();
    expect(screen.getByText('1 punto')).toBeInTheDocument();
    // En celular el encabezado se apila: el texto no comparte fila con las etiquetas.
    expect(container.querySelector('[data-question-header]')).toHaveClass('flex-col', 'lg:flex-row');
    expect(screen.getByRole('button', { name: /Ver soluciones/ })).toHaveClass('whitespace-nowrap');
  });

  it('las instrucciones se muestran una sola vez', () => {
    const taller = render(<ResourceInstructions tipo="taller" content={{ instrucciones: 'Lee cada punto.' }} />);
    expect(taller.container).toBeEmptyDOMElement();
    taller.unmount();

    render(<ResourceInstructions tipo="crucigrama" content={{ instrucciones: 'Completa el crucigrama.' }} />);
    expect(screen.getByText('Completa el crucigrama.')).toBeInTheDocument();
  });

  it('ficha: respeta los saltos de línea del enunciado', () => {
    const data = { ...base, ejercicios: [{ numero: 1, tipo: 'opción múltiple', enunciado: '¿Cuál es sólido?\nA) Aire\nB) Piedra', espacio_respuesta: true }] } as unknown as ToolContent;
    render(<ContenidoView tipo="ficha" data={data} />);
    expect(screen.getByText(/¿Cuál es sólido\?/)).toHaveClass('whitespace-pre-line');
    expect(screen.getByText('Opción múltiple')).toBeInTheDocument();
  });

  it('rúbrica: el porcentaje no se parte', () => {
    const data = { ...base, escala: ['Excelente'], criterios: [{ nombre: 'Contenido', peso_porcentaje: 30, niveles: { Excelente: 'Explica con precisión.' } }] } as unknown as ToolContent;
    render(<ContenidoView tipo="rubrica" data={data} />);
    expect(screen.getAllByText('30%')[0]).toHaveClass('whitespace-nowrap');
  });

  it('tarjetas: los botones dicen qué significan', () => {
    const data = { ...base, tarjetas: [{ numero: 1, anverso: 'Corazón', reverso: 'Bombea la sangre.' }] } as unknown as ToolContent;
    render(<ContenidoView tipo="flashcards" data={data} />);
    const group = screen.getByRole('group', { name: '¿Cómo te fue con la tarjeta 1?' });
    expect(within(group).getByRole('button', { name: /No la sé/ })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /Dudé/ })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /La sé/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Toca para ver la definición')).toBeInTheDocument();
  });

  it('sin dibujo: mensaje claro y sin jerga', () => {
    const data = { ...base, instrucciones: 'Colorea.', imagen: { is_placeholder: true } } as unknown as ToolContent;
    render(<ContenidoView tipo="para_colorear" data={data} />);
    expect(screen.getByText('El dibujo no está disponible')).toBeInTheDocument();
    expect(screen.queryByText(/de reserva/)).not.toBeInTheDocument();
  });

  it('crucigrama: la grilla se ajusta al ancho en vez de salirse', () => {
    const clue = { numero: 1, pista: 'Líquido esencial', respuesta: 'AGUA', fila: 0, columna: 0, longitud: 4 };
    const data: CrucigramaContenido = {
      titulo: 'Crucigrama', instrucciones: '', preguntas_horizontales: [clue], preguntas_verticales: [],
      crucigrama: { grid: [['A', 'G', 'U', 'A']], size: 4, pistas_horizontal: [clue], pistas_vertical: [] },
    };
    const { container } = render(<CrucigramaView data={data} />);
    const grid = container.querySelector('.crucigrama-grid') as HTMLElement;
    expect(grid).toHaveClass('grid', 'w-full');
    expect(grid.style.gridTemplateColumns).toBe('repeat(4, minmax(1.25rem, 1fr))');
    expect(screen.getByRole('textbox', { name: 'Fila 1, columna 1, inicia la pista 1' })).toHaveClass('h-full', 'w-full');
  });

  it('sopa de letras: las celdas reparten el ancho disponible', () => {
    const data: SopaContenido = {
      titulo: 'Sopa', instrucciones: '', grilla: [['S', 'O', 'L'], ['A', 'B', 'C'], ['D', 'E', 'F']], banco_palabras: ['SOL'],
      palabras: [{ palabra: 'SOL', fila: 0, col: 0, fila_fin: 0, col_fin: 2, direccion: 'horizontal', invertida: false }],
    };
    render(<SopaLetrasView data={data} />);
    const cell = screen.getByRole('gridcell', { name: /Fila 1, columna 1, letra S/ });
    expect(cell).toHaveClass('aspect-square', 'flex-1', 'min-w-0');
    expect(screen.getByRole('grid')).toHaveClass('w-full');
  });

  it('relacionar pares: las palabras no se parten letra por letra', () => {
    const data = {
      titulo: 'Pares', instrucciones: '',
      columna_izquierda: [{ numero: 1, texto: 'Caracol' }], columna_derecha: [{ letra: 'A', texto: 'Invertebrado' }],
      soluciones: [{ numero: 1, letra: 'A' }], pares: [{ izquierda: 'Caracol', derecha: 'Invertebrado' }],
    } as unknown as MatchingContenido;
    render(<MatchingView data={data} />);
    expect(screen.getByText('Invertebrado')).toHaveClass('break-words', 'hyphens-auto', 'min-w-0');
    expect(screen.getByText(/Toca un elemento de la izquierda/)).toBeInTheDocument();
  });
});
