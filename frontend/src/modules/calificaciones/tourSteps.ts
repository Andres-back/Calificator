import type { TourStep } from '@/components/ui';

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
