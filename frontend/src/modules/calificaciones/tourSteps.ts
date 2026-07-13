import type { TourStep } from '@/components/ui';

/** Pasos de la guía "¿Cómo se usa?" del módulo Calificar. Solo texto explicativo. */

export const calificacionesTour: TourStep[] = [
  {
    title: 'Panel de calificaciones',
    description: 'Aquí revisas las notas sugeridas por la IA y decides si confirmarlas o ajustarlas.',
  },
  {
    target: '[data-tour="calificaciones-materia"]',
    title: 'Elige la materia',
    description: 'Primero elige la materia para ver sus evaluaciones y estudiantes.',
  },
  {
    target: '[data-tour="calificaciones-evaluacion"]',
    title: 'Elige la evaluación',
    description: 'Selecciona la evaluación que quieres revisar.',
  },
  {
    target: '[data-tour="calificaciones-lista"]',
    title: 'Lista de calificaciones',
    description: 'Aquí aparecen las respuestas revisadas, con el nombre real del estudiante.',
  },
  {
    target: '[data-tour="calificaciones-nota"]',
    title: 'Nota sugerida',
    description: 'Esta nota es una sugerencia inicial. No es definitiva hasta que el docente la confirme.',
    placement: 'left',
  },
  {
    target: '[data-tour="calificaciones-confirmar"]',
    title: 'Confirmar nota',
    description: 'Usa este botón cuando estés de acuerdo con la nota sugerida. Antes de guardar, el sistema te pedirá confirmación.',
    placement: 'top',
  },
  {
    target: '[data-tour="calificaciones-ajustar"]',
    title: 'Ajustar nota',
    description: 'Usa este botón si quieres cambiar la nota sugerida o mejorar la retroalimentación.',
    placement: 'top',
  },
  {
    target: '[data-tour="calificaciones-ia"]',
    title: 'La IA sugiere, el docente decide',
    description: 'Recuerda: la IA sugiere una valoración inicial y tú tomas la decisión final.',
  },
];

export const fotoTour: TourStep[] = [
  {
    title: 'Calificar por foto',
    description: 'Esta opción sirve para subir una foto de una respuesta escrita o examen físico.',
  },
  {
    target: '[data-tour="foto-materia"]',
    title: 'Elige la materia',
    description: 'Elige la materia donde está el estudiante.',
  },
  {
    target: '[data-tour="foto-evaluacion"]',
    title: 'Elige la evaluación',
    description: 'Elige la evaluación que quieres calificar.',
  },
  {
    target: '[data-tour="foto-estudiante"]',
    title: 'Elige el estudiante',
    description: 'Selecciona el estudiante dueño de la respuesta.',
  },
  {
    target: '[data-tour="foto-upload"]',
    title: 'Sube la foto',
    description: 'Carga una imagen clara de la respuesta o examen.',
  },
  {
    target: '[data-tour="foto-calificar"]',
    title: 'Calificar foto',
    description: 'La IA revisará la imagen y mostrará una nota sugerida con comentarios para el estudiante.',
    placement: 'top',
  },
  {
    target: '[data-tour="foto-resultado"]',
    title: 'Revisa el resultado',
    description: 'Revisa la sugerencia antes de confirmarla. La decisión final siempre es del docente.',
    placement: 'left',
  },
];

export const salonTour: TourStep[] = [
  {
    title: 'Modo Salón',
    description: 'Este modo permite calificar varios estudiantes seguidos durante una sesión.',
  },
  {
    target: '[data-tour="salon-seleccion"]',
    title: 'Materia y evaluación',
    description: 'Selecciona la materia y evaluación que usarás en la sesión.',
  },
  {
    target: '[data-tour="salon-iniciar"]',
    title: 'Iniciar sesión',
    description: 'Crea una sesión de calificación para revisar estudiantes uno por uno.',
  },
  {
    target: '[data-tour="salon-estudiante"]',
    title: 'Lista de estudiantes',
    description: 'Aquí seleccionas el estudiante que vas a calificar.',
  },
  {
    target: '[data-tour="salon-foto"]',
    title: 'Sube la foto',
    description: 'Carga la foto de la respuesta del estudiante seleccionado.',
  },
  {
    target: '[data-tour="salon-calificar"]',
    title: 'Calificar respuesta',
    description: 'La IA muestra una nota sugerida y comentarios organizados.',
    placement: 'top',
  },
  {
    target: '[data-tour="salon-procesados"]',
    title: 'Estudiantes calificados',
    description: 'El sistema marca quiénes ya fueron calificados para evitar confusiones.',
  },
  {
    target: '[data-tour="salon-cerrar"]',
    title: 'Cerrar sesión',
    description: 'Cierra la sesión cuando termines. El sistema pedirá confirmación antes de cerrarla.',
    placement: 'bottom',
  },
];

export const boletinTour: TourStep[] = [
  {
    title: 'Boletín',
    description: 'Aquí se consultan las notas confirmadas.',
  },
  {
    target: '[data-tour="boletin-materia"]',
    title: 'Elige la materia',
    description: 'Elige la materia para filtrar el boletín.',
  },
  {
    target: '[data-tour="boletin-estudiante"]',
    title: 'Elige el estudiante',
    description: 'Como docente, selecciona el estudiante que quieres consultar.',
  },
  {
    target: '[data-tour="boletin-lista"]',
    title: 'Notas confirmadas',
    description: 'Solo las notas confirmadas por el docente deben considerarse definitivas.',
  },
  {
    target: '[data-tour="boletin-info"]',
    title: 'Pendiente de confirmación',
    description: 'Si una nota aún no fue confirmada, aparecerá como pendiente.',
  },
  {
    title: 'Solo lectura',
    description: 'El boletín no sirve para editar notas. Para confirmar o ajustar, vuelve al panel de calificaciones.',
  },
];
