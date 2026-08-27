/**
 * Centraliza las rutas del frontend para evitar errores de escritura,
 * rutas duplicadas y facilitar cambios futuros.
 * Todas las rutas deben definirse aquí y referenciarse desde el resto de la app.
 */
export const routes = {
  /* ── Públicas ── */
  home: '/',
  login: '/login',
  register: '/registro',

  /* ── Genéricas protegidas ── */
  app: '/app',
  forbidden: '/app/403',
  notFound: '/app/404',

  /* ── Dashboard ── */
  dashboard: '/app',

  /* ── Materias ── */
  materias: '/app/materias',
  materiasUnirse: '/app/materias?unirse=1',
  materiasPara: (accion: 'calificar' | 'asistencia' | 'evaluar' | 'seguimiento') =>
    `/app/materias?accion=${accion}` as const,
  materia: (id: string) => `/app/materias/${id}` as const,
  materiaEvaluaciones: (id: string) => `/app/materias/${id}/evaluaciones` as const,
  materiaRecursos: (id: string) => `/app/materias/${id}/recursos` as const,
  materiaCalificar: (id: string) => `/app/materias/${id}/calificar` as const,
  materiaAsistencia: (id: string) => `/app/materias/${id}/asistencia` as const,
  materiaBoletin: (id: string) => `/app/materias/${id}/boletin` as const,
  materiaDba: (id: string) => `/app/materias/${id}/dba` as const,

  /* ── Evaluaciones ── */
  evaluaciones: '/app/evaluaciones',
  resolverEvaluacion: (id: string) => `/app/evaluaciones/${id}/resolver` as const,

  /* ── Calificaciones ── */
  calificacionesBoletin: '/app/calificaciones/boletin',
  calificacionesWorkspace: '/app/calificaciones/workspace',
  calificacionesEvaluacion: (id: string) => `/app/calificaciones/workspace/${id}` as const,
  calificacionesRevision: (evaluacionId: string, calificacionId: string) =>
    `/app/calificaciones/workspace/${evaluacionId}?calificacion=${encodeURIComponent(calificacionId)}` as const,

  /* ── Herramientas ── */
  herramientas: '/app/herramientas',
  herramientaNueva: (tipo?: string) =>
    tipo ? (`/app/herramientas/nuevo?tipo=${encodeURIComponent(tipo)}` as const) : '/app/herramientas/nuevo',
  herramienta: (id: string) => `/app/herramientas/${id}` as const,
  recursoEstudiante: (id: string) => `/app/recursos/${id}` as const,

  /* ── Otros ── */
  xali: '/app/xali',
  presentaciones: '/app/presentaciones',
  reportes: '/app/reportes',
  adminAI: '/app/admin/configuracion-ia',
  adminUsers: '/app/admin/usuarios',
  profesorAI: '/app/configuracion-ia',
  analytics: '/app/analytics',
};

/** Ruta de login con state para redirección post-login */
export const loginWithRedirect = (from: string) =>
  `/login?redirect=${encodeURIComponent(from)}`;
