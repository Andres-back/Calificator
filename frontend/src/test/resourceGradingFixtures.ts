export const sanitizedResourceDraft = {
  id: '10000000-0000-4000-8000-000000000001',
  materia_id: '20000000-0000-4000-8000-000000000001',
  tipo: 'taller',
  titulo: 'Taller sanitizado',
  asignacion_tipo: null,
  publicado_estudiantes: false,
} as const;

export const twentyGradeComponents = Array.from({ length: 20 }, (_, index) => ({
  componente_id: 'component-' + (index + 1),
  pregunta_numero: index + 1,
  titulo: 'Pregunta ' + (index + 1),
  puntos_obtenidos: 0.2,
  puntos_maximos: 0.25,
  estado: 'parcial',
  explicacion_estudiante: 'La respuesta muestra avance y necesita una revisión breve.',
}));
