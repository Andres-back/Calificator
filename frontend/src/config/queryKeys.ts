/**
 * Centraliza las Query Keys de TanStack Query para evitar claves duplicadas,
 * claves inconsistentes y facilitar invalidaciones.
 *
 * Uso:
 *   useQuery({ queryKey: queryKeys.materias.detail(id), queryFn: ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.adminAI.all })
 */
export const queryKeys = {
  materias: {
    all: ['materias'] as const,
    list: (tipo?: string) => [...queryKeys.materias.all, 'list', ...(tipo ? [tipo] : [])] as const,
    detail: (id: string) => ['materia', id] as const,
    detailManage: (id: string) => ['materia', id, 'manage'] as const,
    detailStudent: (id: string) => ['materia', id, 'student'] as const,
    estudiantes: (id: string) => ['materia', id, 'estudiantes'] as const,
    dbaPersonalizados: (id: string) => ['dba-personalizados', id] as const,
    dbaCombined: (id: string) => ['materia-dba', id] as const,
  },
  evaluaciones: {
    all: ['evaluaciones'] as const,
    list: (materiaId: string) => [...queryKeys.evaluaciones.all, 'list', materiaId] as const,
    detail: (id: string) => ['evaluacion', id] as const,
  },
  herramientas: {
    all: ['herramientas'] as const,
    materials: (tipo?: string) => ['materials', ...(tipo ? [tipo] : [])] as const,
    recent: () => ['materials', 'recent'] as const,
    detail: (id: string) => ['material', id] as const,
  },
  adminAI: {
    all: ['admin', 'ai'] as const,
    settings: () => ['admin-ai-settings'] as const,
    hash: () => ['admin-ai-config-hash'] as const,
    audit: (limit = 6) => ['admin-ai-audit', { limit }] as const,
    usage: () => ['admin-ai-usage'] as const,
  },
  teacherAI: {
    all: ['profesor', 'ai-config'] as const,
    config: () => ['profesor', 'ai-config'] as const,
  },
  presentaciones: {
    all: ['presentaciones'] as const,
    list: () => ['presentaciones', 'list'] as const,
    detail: (id: string) => ['presentacion', id] as const,
  },
  reportes: {
    all: ['reportes'] as const,
  },
  xali: {
    all: ['xali'] as const,
    history: () => ['xali', 'history'] as const,
  },
  calificaciones: {
    all: ['calificaciones'] as const,
    boletin: (userId: string) => ['boletin', userId] as const,
    resumenAcademico: (userId: string) => ['student-academic-summary', userId] as const,
    salonSesion: (materiaId: string) => ['salon-sesion', materiaId] as const,
  },
};
