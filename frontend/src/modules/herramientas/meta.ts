import {
  Search,
  Grid3x3,
  ArrowLeftRight,
  Link2,
  BookOpen,
  FileText,
  Palette,
  ClipboardList,
  GraduationCap,
  Table2,
  HeartHandshake,
  HelpCircle,
  BookMarked,
  GitBranch,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import type { MaterialTipo } from '@/types/api';

export interface ToolField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'list' | 'select';
  required?: boolean;
  default?: string | number | string[];
  min?: number;
  max?: number;
  options?: string[];
  placeholder?: string;
  hint?: string;
}

export interface ToolMeta {
  tipo: MaterialTipo;
  endpoint: string;
  label: string;
  category: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  interactive: boolean;
  fields: ToolField[];
}

export const TOOLS: ToolMeta[] = [
  {
    tipo: 'crucigrama',
    endpoint: 'crucigrama',
    label: 'Crucigrama',
    category: 'Juego',
    description: 'Palabras cruzadas con pistas, generadas y armadas automáticamente.',
    icon: Grid3x3,
    gradient: 'from-indigo-500 to-violet-600',
    interactive: true,
    fields: [{ name: 'cantidad_preguntas', label: 'Cantidad de palabras', type: 'number', default: 8, min: 5, max: 20 }],
  },
  {
    tipo: 'sopa_letras',
    endpoint: 'sopa-letras',
    label: 'Sopa de letras',
    category: 'Juego',
    description: 'Encuentra palabras ocultas en una grilla. Tú defines las palabras.',
    icon: Search,
    gradient: 'from-sky-500 to-indigo-600',
    interactive: true,
    fields: [
      { name: 'palabras_clave', label: 'Palabras', type: 'list', required: true, hint: 'Mínimo 5, separadas por coma', placeholder: 'LUZ, SOMBRA, ESPEJO, VIDRIO, OPACO' },
      { name: 'tamanio_grilla', label: 'Tamaño de grilla', type: 'number', default: 12, min: 10, max: 20 },
    ],
  },
  {
    tipo: 'unir_columnas',
    endpoint: 'unir-columnas',
    label: 'Relacionar pares',
    category: 'Juego',
    description: 'Actividad para relacionar conceptos, ejemplos o definiciones.',
    icon: Link2,
    gradient: 'from-violet-500 to-fuchsia-600',
    interactive: true,
    fields: [{ name: 'cantidad_pares', label: 'Cantidad de pares', type: 'number', default: 6, min: 3, max: 12 }],
  },
  {
    tipo: 'emparejar',
    endpoint: 'emparejar',
    label: 'Relacionar pares',
    category: 'Juego',
    description: 'Relaciona conceptos, ejemplos o definiciones de forma interactiva o imprimible.',
    icon: ArrowLeftRight,
    gradient: 'from-fuchsia-500 to-pink-600',
    interactive: true,
    fields: [{ name: 'cantidad_pares', label: 'Cantidad de pares', type: 'number', default: 6, min: 3, max: 12 }],
  },
  {
    tipo: 'examen',
    endpoint: 'examen',
    label: 'Examen',
    category: 'Evaluación',
    description: 'Examen con opción múltiple, abiertas y verdadero/falso.',
    icon: ClipboardList,
    gradient: 'from-emerald-500 to-teal-600',
    interactive: false,
    fields: [
      { name: 'cantidad_preguntas', label: 'Cantidad de preguntas', type: 'number', default: 10, min: 3, max: 30 },
      { name: 'tipos_pregunta', label: 'Tipos de pregunta', type: 'list', default: ['opcion_multiple', 'abierta'], hint: 'opcion_multiple, abierta, verdadero_falso, completar' },
    ],
  },
  {
    tipo: 'guia',
    endpoint: 'guia',
    label: 'Guía de aprendizaje',
    category: 'Material',
    description: 'Enseña paso a paso: saberes previos, explicación, ejemplo guiado, práctica y cierre.',
    icon: BookOpen,
    gradient: 'from-blue-500 to-indigo-600',
    interactive: false,
    fields: [
      { name: 'objetivos', label: 'Objetivos', type: 'list', hint: 'Opcional, separados por coma' },
      { name: 'cantidad_actividades', label: 'Cantidad de actividades', type: 'number', default: 5, min: 2, max: 15 },
    ],
  },
  {
    tipo: 'taller',
    endpoint: 'taller',
    label: 'Taller',
    category: 'Material',
    description: 'Práctica evaluable con dificultad gradual, puntajes, espacios y soluciones para el docente.',
    icon: ClipboardList,
    gradient: 'from-teal-500 to-emerald-600',
    interactive: false,
    fields: [{ name: 'cantidad_puntos', label: 'Cantidad de puntos', type: 'number', default: 5, min: 2, max: 15 }],
  },
  {
    tipo: 'cuento',
    endpoint: 'cuento',
    label: 'Cuento',
    category: 'Material',
    description: 'Cuento educativo con moraleja y preguntas de comprensión.',
    icon: FileText,
    gradient: 'from-amber-500 to-orange-600',
    interactive: false,
    fields: [
      { name: 'personajes', label: 'Personajes', type: 'list', hint: 'Opcional, separados por coma' },
      { name: 'longitud', label: 'Longitud', type: 'select', default: 'corto', options: ['corto', 'medio', 'largo'] },
    ],
  },
  {
    tipo: 'para_colorear',
    endpoint: 'para-colorear',
    label: 'Para colorear',
    category: 'Material',
    description: 'Dibujo en blanco y negro generado por IA para imprimir y colorear.',
    icon: Palette,
    gradient: 'from-lime-500 to-emerald-600',
    interactive: false,
    fields: [
      { name: 'estilo', label: 'Estilo', type: 'select', default: 'simple', options: ['simple', 'detallado'] },
    ],
  },
  {
    tipo: 'rubrica',
    endpoint: 'rubrica',
    label: 'Rúbrica',
    category: 'Evaluación',
    description: 'Rúbrica de evaluación con criterios, pesos y niveles.',
    icon: Table2,
    gradient: 'from-cyan-500 to-blue-600',
    interactive: false,
    fields: [
      { name: 'criterios', label: 'Criterios', type: 'list', hint: 'Opcional, separados por coma' },
      { name: 'escala', label: 'Escala', type: 'list', default: ['Excelente', 'Bueno', 'Regular', 'Insuficiente'] },
    ],
  },
  {
    tipo: 'plan_refuerzo',
    endpoint: 'plan-refuerzo',
    label: 'Plan de refuerzo',
    category: 'Material',
    description: 'Diagnóstico, sesiones, evidencias y seguimiento para apoyar a un estudiante.',
    icon: HeartHandshake,
    gradient: 'from-rose-500 to-pink-600',
    interactive: false,
    fields: [
      { name: 'nombre_estudiante', label: 'Nombre del estudiante', type: 'text', required: true, placeholder: 'Juan Gómez' },
      { name: 'dificultades', label: 'Dificultades', type: 'list', hint: 'Opcional, separadas por coma' },
    ],
  },
  {
    tipo: 'ficha',
    endpoint: 'ficha',
    label: 'Ficha didáctica',
    category: 'Material',
    description: 'Hoja de trabajo con ejercicios variados para reforzar un tema.',
    icon: FileText,
    gradient: 'from-yellow-500 to-orange-600',
    interactive: false,
    fields: [
      { name: 'cantidad_ejercicios', label: 'Cantidad de ejercicios', type: 'number', default: 6, min: 2, max: 15 },
    ],
  },
  {
    tipo: 'quiz_rapido',
    endpoint: 'quiz-rapido',
    label: 'Quiz rápido',
    category: 'Evaluación',
    description: 'Evaluación corta de opción múltiple para repasar conceptos clave.',
    icon: HelpCircle,
    gradient: 'from-pink-500 to-rose-600',
    interactive: false,
    fields: [
      { name: 'cantidad_preguntas', label: 'Cantidad de preguntas', type: 'number', default: 8, min: 3, max: 20 },
    ],
  },
  {
    tipo: 'lectura_comprensiva',
    endpoint: 'lectura-comprensiva',
    label: 'Lectura comprensiva',
    category: 'Material',
    description: 'Lectura con preguntas literales, inferenciales, de vocabulario y pensamiento crítico.',
    icon: BookMarked,
    gradient: 'from-blue-500 to-cyan-600',
    interactive: false,
    fields: [
      { name: 'cantidad_preguntas', label: 'Cantidad de preguntas', type: 'number', default: 5, min: 2, max: 15 },
    ],
  },
  {
    tipo: 'mapa_conceptual',
    endpoint: 'mapa-conceptual',
    label: 'Mapa conceptual',
    category: 'Material',
    description: 'Estructura jerárquica de conceptos con relaciones para organizar ideas.',
    icon: GitBranch,
    gradient: 'from-green-500 to-emerald-600',
    interactive: false,
    fields: [],
  },
  {
    tipo: 'flashcards',
    endpoint: 'flashcards',
    label: 'Flashcards',
    category: 'Material',
    description: 'Tarjetas de estudio con concepto al anverso y definición al reverso.',
    icon: Layers,
    gradient: 'from-purple-500 to-indigo-600',
    interactive: false,
    fields: [
      { name: 'cantidad_tarjetas', label: 'Cantidad de tarjetas', type: 'number', default: 10, min: 3, max: 30 },
    ],
  },
];

export const TOOL_BY_TIPO: Record<MaterialTipo, ToolMeta> = Object.fromEntries(
  TOOLS.map((t) => [t.tipo, t]),
) as Record<MaterialTipo, ToolMeta>;

export const TOOL_ICON: Record<MaterialTipo, LucideIcon> = Object.fromEntries(
  TOOLS.map((t) => [t.tipo, t.icon]),
) as Record<MaterialTipo, LucideIcon>;

export { GraduationCap };
