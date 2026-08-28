import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { MaterialTipo } from '@/types/api';
import { ContenidoView, type ToolContent } from './ContenidoView';

const cases: Array<{ tipo: MaterialTipo; expected: string; data: ToolContent }> = [
  {
    tipo: 'examen',
    expected: '¿Qué es evaporación?',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], preguntas: [{ numero: 1, enunciado: '¿Qué es evaporación?', opciones: ['A) Cambio de líquido a gas', 'B) Congelación'], respuesta_correcta: 'A' }] },
  },
  {
    tipo: 'rubrica',
    expected: 'Explicación científica',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], escala: ['Logrado'], criterios: [{ nombre: 'Explicación científica', peso_porcentaje: 100, niveles: { Logrado: 'Explica el proceso con claridad.' } }] },
  },
  {
    tipo: 'cuento',
    expected: 'Lina siguió el viaje de una gota.',
    data: { personajes: ['Lina'], preguntas_comprension: ['¿Qué aprendió Lina?'], uso_docente: [], objetivos: [], evaluacion_formativa: [], parrafos: ['Lina siguió el viaje de una gota.'] },
  },
  {
    tipo: 'para_colorear',
    expected: 'Colorea las nubes.',
    data: { personajes: [], preguntas_comprension: [], uso_docente: ['Nombrar cada elemento'], objetivos: [], evaluacion_formativa: [], instrucciones: 'Colorea las nubes.', imagen: { is_placeholder: true } },
  },
  {
    tipo: 'guia',
    expected: 'Actividad modelada',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: ['Comprender el ciclo'], saberes_previos: ['Estados del agua'], cierre: 'Resume lo aprendido.', evaluacion_formativa: ['Explica una etapa'], secciones: [{ titulo: 'Exploración', explicacion: 'Observa el diagrama.', ejemplo_guiado: 'Actividad modelada', actividades: ['Describe el cambio.'], verificacion: 'Compara tu respuesta.' }] },
  },
  {
    tipo: 'taller',
    expected: 'Representa el ciclo del agua.',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], instrucciones: 'Resuelve cada punto.', puntaje_total: 2, criterios_revision: ['Explica con evidencia.'], puntos: [{ numero: 1, enunciado: 'Representa el ciclo del agua.', dificultad: 'media', puntaje: 2, respuesta_esperada: 'Un esquema completo.', lineas_respuesta: 4 }] },
  },
  {
    tipo: 'plan_refuerzo',
    expected: 'Practicar vocabulario',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], diagnostico_inicial: 'Requiere comprobar vocabulario.', comprobacion_final: 'Explica dos cambios de estado.', semanas: [{ semana: 1, tema: 'Estados del agua', meta_semana: 'Reconocer vocabulario', actividades: ['Practicar vocabulario'], recursos: ['Tarjetas'], evidencia: 'Lista clasificada', responsable: 'Docente y estudiante' }] },
  },
  {
    tipo: 'quiz_rapido',
    expected: '¿Cuál es un estado del agua?',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], preguntas: [{ numero: 1, enunciado: '¿Cuál es un estado del agua?', opciones: ['A) Sólido', 'B) Luz'], respuesta_correcta: 'A' }] },
  },
  {
    tipo: 'ficha',
    expected: 'Completa la frase.',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], ejercicios: [{ numero: 1, tipo: 'completar', enunciado: 'Completa la frase.', respuesta_esperada: 'evaporación', espacio_respuesta: true }] },
  },
  {
    tipo: 'lectura_comprensiva',
    expected: 'El agua cambia de estado.',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], instrucciones: 'Lee y justifica.', estrategia_lectora: 'Subraya evidencias.', texto: 'El agua cambia de estado.', preguntas: [{ numero: 1, tipo: 'literal', dificultad: 'baja', enunciado: '¿Qué cambia?', respuesta_esperada: 'El agua', evidencia_textual: 'El agua cambia' }] },
  },
  {
    tipo: 'mapa_conceptual',
    expected: 'Cómo se relacionan',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], concepto_principal: 'Ciclo del agua', nodos: [{ id: 'n1', concepto: 'Evaporación', nivel: 1 }, { id: 'n2', concepto: 'Condensación', nivel: 2 }], relaciones: [{ origen: 'n1', destino: 'n2', etiqueta: 'se transforma en' }] },
  },
  {
    tipo: 'flashcards',
    expected: 'Evaporación',
    data: { personajes: [], preguntas_comprension: [], uso_docente: [], objetivos: [], evaluacion_formativa: [], tarjetas: [{ numero: 1, anverso: 'Evaporación', reverso: 'Paso de líquido a gas.' }] },
  },
];

describe('renderización de herramientas', () => {
  it.each(cases)('renderiza $tipo con contenido legible', ({ tipo, data, expected }) => {
    const { container } = render(<ContenidoView tipo={tipo} data={data} />);

    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
    expect(container).not.toHaveTextContent('[object Object]');
    expect(container).not.toHaveTextContent('no tiene una vista preparada');
  });

  it('oculta las respuestas de lectura hasta que el docente las solicita', async () => {
    const user = userEvent.setup();
    const reading = cases.find((item) => item.tipo === 'lectura_comprensiva');
    if (!reading) throw new Error('Fixture de lectura no encontrado');
    render(<ContenidoView tipo={reading.tipo} data={reading.data} />);

    expect(screen.queryByText('El agua', { exact: true })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver respuestas' }));
    expect(screen.getByText('El agua', { exact: true })).toBeInTheDocument();
  });

  it('muestra una solución de ficha solo al solicitarla', async () => {
    const user = userEvent.setup();
    const worksheet = cases.find((item) => item.tipo === 'ficha');
    if (!worksheet) throw new Error('Fixture de ficha no encontrado');
    render(<ContenidoView tipo={worksheet.tipo} data={worksheet.data} />);

    expect(screen.queryByText(/evaporación/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver soluciones' }));
    expect(screen.getByText(/evaporación/i)).toBeInTheDocument();
  });

  it('mantiene ocultas las soluciones del taller hasta que el docente las solicita', async () => {
    const user = userEvent.setup();
    const workshop = cases.find((item) => item.tipo === 'taller');
    if (!workshop) throw new Error('Fixture de taller no encontrado');
    render(<ContenidoView tipo={workshop.tipo} data={workshop.data} />);

    expect(screen.queryByText('Un esquema completo.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver soluciones' }));
    expect(screen.getByText('Un esquema completo.')).toBeInTheDocument();
  });

  it('traduce los identificadores del mapa a nombres pedagógicos', () => {
    const map = cases.find((item) => item.tipo === 'mapa_conceptual');
    if (!map) throw new Error('Fixture de mapa no encontrado');
    const { container } = render(<ContenidoView tipo={map.tipo} data={map.data} />);

    expect(container).toHaveTextContent(/Evaporación.*se transforma en.*Condensación/);
    expect(container).not.toHaveTextContent('n1');
    expect(container).not.toHaveTextContent('n2');
    expect(screen.getByTestId('conceptual-map')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Nivel 1' })).toBeVisible();
  });
});
