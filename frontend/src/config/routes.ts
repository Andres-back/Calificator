/**
 * Centraliza las rutas del frontend para evitar errores de escritura,
 * rutas duplicadas y facilitar cambios futuros.
 * Todas las rutas deben definirse aquí y referenciarse desde el resto de la app.
 */
export const routes = {
  /* ── Públicas ── */
  login: '/login',

  /* ── Genéricas protegidas ── */
  app: '/app',
  forbidden: '/app/403',
  notFound: '/app/404',

  /* ── Dashboard ── */
  dashboard: '/app',

  /* ── Materias ── */
  materias: '/app/materias',
  materiasUnirse: '/app/materias/unirse',
  materia: (id: string) => `/app/materias/${id}` as const,
  materiaEvaluaciones: (id: string) => `/app/materias/${id}/evaluaciones` as const,
  materiaCalificar: (id: string) => `/app/materias/${id}/calificar` as const,
  materiaBoletin: (id: string) => `/app/materias/${id}/boletin` as const,
  materiaDba: (id: string) => `/app/materias/${id}/dba` as const,

  /* ── Evaluaciones ── */
  evaluaciones: '/app/evaluaciones',
  resolverEvaluacion: (id: string) => `/app/evaluaciones/${id}/resolver` as const,

  /* ── Calificaciones ── */
  calificacionesBoletin: '/app/calificaciones/boletin',

  /* ── Herramientas ── */
  herramientas: '/app/herramientas',
  herramientaNueva: (tipo?: string) =>
    tipo ? (`/app/herramientas/nuevo?tipo=${encodeURIComponent(tipo)}` as const) : '/app/herramientas/nuevo',
  herramienta: (id: string) => `/app/herramientas/${id}` as const,

  /* ── Otros ── */
  xali: '/app/xali',
  presentaciones: '/app/presentaciones',
  reportes: '/app/reportes',
  adminAI: '/app/admin/configuracion-ia',
};

/** Ruta de login con state para redirección post-login */
export const loginWithRedirect = (from: string) =>
  `/login?redirect=${encodeURIComponent(from)}`;
