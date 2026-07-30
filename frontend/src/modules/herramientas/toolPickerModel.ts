import type { MaterialTipo } from '@/types/api';
import { TOOLS, type ToolMeta } from './meta';

export type ToolGoal = 'todos' | 'evaluar' | 'practicar' | 'jugar' | 'explicar';

export const TOOL_GOALS: Array<{
  id: ToolGoal;
  label: string;
  description: string;
}> = [
  {
    id: 'todos',
    label: 'Ver todo',
    description: 'Explora todos los formatos disponibles.',
  },
  {
    id: 'evaluar',
    label: 'Evaluar',
    description: 'Crea y califica la evaluación dentro de una materia.',
  },
  {
    id: 'practicar',
    label: 'Practicar',
    description: 'Guías, talleres y refuerzos.',
  },
  {
    id: 'jugar',
    label: 'Aprender jugando',
    description: 'Juegos y actividades interactivas.',
  },
  {
    id: 'explicar',
    label: 'Explicar un tema',
    description: 'Lecturas, cuentos y organizadores.',
  },
];

export const GRADABLE_TOOL_TYPES = new Set<MaterialTipo>([
  'examen',
  'quiz_rapido',
  'rubrica',
]);

export function isGradableTool(type: MaterialTipo): boolean {
  return GRADABLE_TOOL_TYPES.has(type);
}

export const MATERIAL_CREATION_TOOLS = TOOLS.filter(
  (tool) => !isGradableTool(tool.tipo),
);

const TOOL_GOAL_BY_TYPE: Record<MaterialTipo, Exclude<ToolGoal, 'todos'>> = {
  examen: 'evaluar',
  quiz_rapido: 'evaluar',
  rubrica: 'evaluar',
  guia: 'practicar',
  taller: 'practicar',
  ficha: 'practicar',
  plan_refuerzo: 'practicar',
  crucigrama: 'jugar',
  sopa_letras: 'jugar',
  unir_columnas: 'jugar',
  emparejar: 'jugar',
  flashcards: 'jugar',
  lectura_comprensiva: 'explicar',
  cuento: 'explicar',
  mapa_conceptual: 'explicar',
  para_colorear: 'explicar',
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

export function goalForTool(
  type: MaterialTipo,
): Exclude<ToolGoal, 'todos'> {
  return TOOL_GOAL_BY_TYPE[type];
}

export function filterTools(
  tools: ToolMeta[],
  {
    goal,
    search,
  }: {
    goal: ToolGoal;
    search: string;
  },
): ToolMeta[] {
  const query = normalizeSearch(search);
  return tools.filter((tool) => {
    if (goal !== 'todos' && goalForTool(tool.tipo) !== goal) return false;
    if (!query) return true;
    return normalizeSearch(
      `${tool.label} ${tool.description} ${tool.category}`,
    ).includes(query);
  });
}
