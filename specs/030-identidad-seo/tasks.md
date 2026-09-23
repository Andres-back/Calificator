# Tareas: Identidad web, favicon y SEO técnico

## Fase 1: Preparación

- [x] T001 Registrar la especificación 030 y su propiedad transversal en `specs/README.md`, incluyendo el issue #63 (FR-003, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015).

## Fase 2: Fundamentos y regresiones

- [x] T002 [P] Crear pruebas del catálogo y sincronización de metadatos en `frontend/src/components/seo/RouteMetadata.test.tsx`, cubriendo portada, autenticación, rutas privadas, errores, navegación SPA, limpieza y ausencia de datos dinámicos (FR-003, FR-004, FR-009, FR-010, FR-011, FR-014, FR-015, FR-019, FR-020).
- [x] T003 [P] Crear una verificación automática de archivos públicos, manifest, robots, sitemap e HTML base en `frontend/src/config/seoAssets.test.ts` (FR-001, FR-002, FR-005, FR-006, FR-007, FR-008, FR-012, FR-013, FR-015, FR-016, FR-017, FR-018, FR-020).

## Fase 3: Historia 1 — identidad reconocible

- [x] T004 [US1] Completar favicon, iconos de dispositivo, colores claro/oscuro y manifest sin service worker en `frontend/index.html` y `frontend/public/` (FR-001, FR-002, FR-006, FR-007, FR-008, FR-016, FR-017).

## Fase 4: Historia 2 — portada encontrable

- [x] T005 [US2] Publicar metadatos estáticos, canonical, robots y sitemap mínimos en `frontend/index.html`, `frontend/public/robots.txt` y `frontend/public/sitemap.xml` (FR-003, FR-010, FR-012, FR-013, FR-015, FR-016, FR-018).

## Fase 5: Historia 3 — vista previa social

- [x] T006 [US3] Incorporar una tarjeta social horizontal autoalojada y sus metadatos Open Graph/Twitter en `frontend/public/og-xcalificator.png` y `frontend/index.html` (FR-004, FR-005, FR-014, FR-015, FR-016, FR-017, FR-018).

## Fase 6: Historia 4 — títulos útiles y privacidad

- [x] T007 [US4] Implementar el catálogo estático seguro por familia de ruta en `frontend/src/config/seo.ts` (FR-009, FR-010, FR-011, FR-014, FR-015, FR-018, FR-019).
- [x] T008 [US4] Sincronizar título, descripción, robots, canonical y metadatos sociales sin duplicados en `frontend/src/components/seo/RouteMetadata.tsx` y montarlo una sola vez desde `frontend/src/router.tsx` (FR-003, FR-004, FR-009, FR-010, FR-011, FR-014, FR-015, FR-019).
- [x] T009 [US4] Reforzar `X-Robots-Tag: noindex, nofollow` para autenticación, errores y `/app` en `nginx/templates/default.conf.template`, manteniendo indexable exclusivamente `/` (FR-010, FR-011, FR-012, FR-016).

## Fase final: Validación

- [x] T010 Ejecutar pruebas SEO dirigidas, TypeScript, lint, build, pruebas frontend aplicables y construcción del contenedor; documentar evidencia en `specs/030-identidad-seo/quickstart.md` (FR-020; SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008).
- [x] T011 Regenerar y verificar `specs/system-inventory/current.json`, ejecutar gobernanza y convergencia, y cerrar cualquier tarea restante antes del PR (FR-020).
- [ ] T012 Abrir un PR que cierre el issue #63 y fusionarlo únicamente con gobernanza y CI verdes conforme a la Constitución VII y VIII.

## Dependencias

T001 prepara la trazabilidad. T002 y T003 se escriben antes de la implementación y pueden avanzar en paralelo. T004 habilita identidad y manifest; T005 y T006 completan la portada pública; T007 precede a T008; T009 es independiente del código React. T010 y T011 requieren T001–T009. T012 requiere todas las tareas anteriores verificadas.

## Estrategia de implementación

El MVP está compuesto por US1 y US2: identidad coherente y portada indexable segura. US3 añade la tarjeta de invitación y US4 mejora orientación sin exponer áreas privadas. No se añaden dependencias, persistencia, service worker, llamadas externas ni cambios de API.
