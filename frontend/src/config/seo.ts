export const SITE_IDENTITY = {
  name: 'XCalificator',
  canonicalOrigin: 'https://xcalificator.daimuz.com',
  publicDescription:
    'Plataforma educativa de código abierto que asiste a docentes con IA y mantiene la decisión final en manos del profesor.',
  privateDescription: 'Espacio privado de trabajo de XCalificator.',
  socialImage: 'https://xcalificator.daimuz.com/og-xcalificator.png',
} as const;

export type IndexingPolicy = 'index, follow' | 'noindex, nofollow';

export interface PageMetadata {
  title: string;
  description: string;
  indexing: IndexingPolicy;
  canonical?: string;
  social?: {
    title: string;
    description: string;
    url: string;
    image: string;
  };
}

const brandedTitle = (view: string) => `${view} · ${SITE_IDENTITY.name}`;

const privateMetadata = (view: string): PageMetadata => ({
  title: brandedTitle(view),
  description: SITE_IDENTITY.privateDescription,
  indexing: 'noindex, nofollow',
});

const PUBLIC_HOME: PageMetadata = {
  title: brandedTitle('Inicio'),
  description: SITE_IDENTITY.publicDescription,
  indexing: 'index, follow',
  canonical: `${SITE_IDENTITY.canonicalOrigin}/`,
  social: {
    title: 'XCalificator — Evaluación asistida para docentes',
    description: SITE_IDENTITY.publicDescription,
    url: `${SITE_IDENTITY.canonicalOrigin}/`,
    image: SITE_IDENTITY.socialImage,
  },
};

const exactPrivateRoutes = new Map<string, string>([
  ['/login', 'Ingresar'],
  ['/registro', 'Crear cuenta'],
  ['/recuperar-contrasena', 'Recuperar contraseña'],
  ['/restablecer-contrasena', 'Restablecer contraseña'],
  ['/app/403', 'Acceso restringido'],
  ['/app/404', 'Página no encontrada'],
]);

const exactPublicLegalRoutes = new Map<string, string>([
  ['/privacidad', 'Privacidad'],
  ['/terminos', 'Términos de uso'],
  ['/cookies', 'Cookies'],
  ['/aviso-privacidad', 'Aviso de privacidad'],
  ['/piloto', 'Información del piloto'],
]);

const privatePatterns: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/app\/materias\/[^/]+\/evaluaciones(?:\/|$)/, title: 'Evaluaciones' },
  { pattern: /^\/app\/materias\/[^/]+\/recursos(?:\/|$)/, title: 'Recursos' },
  { pattern: /^\/app\/materias\/[^/]+\/calificar(?:\/|$)/, title: 'Calificaciones' },
  { pattern: /^\/app\/materias\/[^/]+\/asistencia(?:\/|$)/, title: 'Asistencia' },
  { pattern: /^\/app\/materias\/[^/]+\/boletin(?:\/|$)/, title: 'Boletín' },
  { pattern: /^\/app\/materias\/[^/]+\/dba(?:\/|$)/, title: 'Criterios de aprendizaje' },
  { pattern: /^\/app\/evaluaciones\/[^/]+\/resolver(?:\/|$)/, title: 'Resolver evaluación' },
  { pattern: /^\/app\/calificaciones\/boletin(?:\/|$)/, title: 'Boletín' },
];

const privateFamilies: Array<{ prefix: string; title: string }> = [
  { prefix: '/app/admin/usuarios', title: 'Usuarios y roles' },
  { prefix: '/app/admin/roles', title: 'Usuarios y roles' },
  { prefix: '/app/admin/configuracion-ia', title: 'Configuración de IA' },
  { prefix: '/app/admin/correo', title: 'Correo y recuperación' },
  { prefix: '/app/configuracion-ia', title: 'Configuración de IA' },
  { prefix: '/app/materias', title: 'Materias' },
  { prefix: '/app/evaluaciones', title: 'Evaluaciones' },
  { prefix: '/app/calificaciones', title: 'Calificaciones' },
  { prefix: '/app/herramientas', title: 'Recursos' },
  { prefix: '/app/recursos', title: 'Recursos' },
  { prefix: '/app/presentaciones', title: 'Presentaciones' },
  { prefix: '/app/reportes', title: 'Reportes' },
  { prefix: '/app/analytics', title: 'Reportes' },
  { prefix: '/app/xali', title: 'Asistente Xali' },
  { prefix: '/app/cambiar-clave-inicial', title: 'Cambiar contraseña' },
];

export function resolvePageMetadata(pathname: string): PageMetadata {
  const normalizedPath = pathname.split(/[?#]/, 1)[0] || '/';
  if (normalizedPath === '/') return PUBLIC_HOME;

  const publicLegalTitle = exactPublicLegalRoutes.get(normalizedPath);
  if (publicLegalTitle) {
    return {
      title: brandedTitle(publicLegalTitle),
      description: 'Información legal y de transparencia de XCalificator.',
      indexing: 'index, follow',
      canonical: `${SITE_IDENTITY.canonicalOrigin}${normalizedPath}`,
    };
  }

  const exactTitle = exactPrivateRoutes.get(normalizedPath);
  if (exactTitle) return privateMetadata(exactTitle);

  const pattern = privatePatterns.find(({ pattern: matcher }) => matcher.test(normalizedPath));
  if (pattern) return privateMetadata(pattern.title);

  const family = privateFamilies.find(
    ({ prefix }) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
  if (family) return privateMetadata(family.title);
  if (normalizedPath === '/app' || normalizedPath.startsWith('/app/')) return privateMetadata('Inicio');

  return privateMetadata('Página no encontrada');
}
