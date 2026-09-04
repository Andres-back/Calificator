# Plan: Identidad web, favicon y SEO técnico

**Rama**: codex/030-identidad-seo | **Fecha**: 2026-08-31 | **Spec**: [spec.md](./spec.md) | **Issue**: #63

## Resumen

Normalizar la identidad web usando los recursos aprobados de XCalificator y añadir una capa única de metadatos por familia de rutas. La portada conservará metadatos estáticos completos para buscadores y servicios que no ejecutan JavaScript; la navegación cliente actualizará título, descripción, URL principal y política de indexación. Nginx reforzará con cabeceras la no indexación de autenticación y aplicación privada. Se añadirán favicon multiformato, iconos de dispositivo, tarjeta social, manifiesto descriptivo, robots y sitemap sin convertir el producto en una PWA sin conexión.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18, HTML5 y configuración Nginx 1.28  
**Dependencias**: React Router 7, Vite 8 y componentes propios; no se añadirá una biblioteca SEO  
**Persistencia**: archivos estáticos y configuración declarativa en el frontend; sin base de datos ni migraciones  
**Pruebas**: Vitest con jsdom, pruebas de rutas/metadatos, construcción Vite y comprobaciones HTTP/Playwright dirigidas  
**Plataforma objetivo**: Chromium/Brave, Safari iOS y navegadores modernos desde 360 px hasta escritorio; contenedor Nginx en VPS Linux  
**Rendimiento y escala**: cero solicitudes fallidas de identidad; metadatos actualizados en el mismo ciclo de navegación; recursos visibles de identidad fuera de la ruta crítica y sin regresión apreciable de carga

## Verificación de la constitución

- Separación de roles: cumple; solo la portada se indexa y toda ruta de autenticación o aplicación queda marcada como privada, sin datos de sesión en metadatos.
- Integridad y trazabilidad: no aplica a calificaciones; no se modifican evidencias, entregas, notas ni sus contratos.
- Asincronía e idempotencia: no aplica; se sirven archivos estáticos y actualizaciones deterministas de la cabecera del documento.
- Datos y secretos: cumple; la configuración contiene solo textos y direcciones públicas, y las cabeceras privadas no incorporan información del usuario.
- Accesibilidad: cumple; los títulos facilitan orientación entre pestañas, los iconos conservan contraste y la página sigue funcionando si el navegador ignora el manifiesto.
- Gobernanza y pruebas: cumple; issue #63, especificación aprobada, investigación, contratos, guía de validación y pruebas de regresión antes del PR.

**Reevaluación posterior al diseño**: sin excepciones. La capa dinámica nunca es la única defensa: Nginx emite no indexación en respuestas de autenticación y aplicación privada aun cuando no se ejecute JavaScript.

## Estructura del proyecto

- `frontend/index.html`: metadatos completos y seguros de la portada, favicon, manifest y colores de navegador.
- `frontend/public/`: favicon, iconos de dispositivo, tarjeta social, `site.webmanifest`, `robots.txt` y `sitemap.xml`.
- `frontend/src/config/seo.ts`: catálogo canónico de metadatos por familia de rutas, sin datos de sesión.
- `frontend/src/components/seo/RouteMetadata.tsx`: sincronización del documento al navegar y limpieza de metadatos no aplicables.
- `frontend/src/router.tsx`: montaje único de la capa de metadatos dentro del contexto del enrutador.
- `frontend/src/components/seo/*.test.tsx`: títulos, canonical, Open Graph y no indexación por ruta.
- `nginx/templates/default.conf.template`: cabecera `X-Robots-Tag` para autenticación, errores y `/app`.
- `specs/030-identidad-seo/`: investigación, modelo, contratos, validación, tareas y trazabilidad.
- `specs/README.md`: propiedad de la nueva superficie transversal de identidad y metadatos.

## Decisiones y complejidad

- La portada tendrá metadatos estáticos completos porque los buscadores y generadores de tarjetas no siempre ejecutan la aplicación cliente.
- Un componente propio basado en la ruta actualizará metadatos durante navegación SPA; evita una dependencia nueva para un conjunto acotado y determinista.
- El catálogo agrupará rutas dinámicas por patrones estables y nunca incluirá nombres de estudiantes, materias, evaluaciones, correos o identificadores.
- Las rutas privadas recibirán `noindex, nofollow` tanto en el documento cliente como en cabecera HTTP. `robots.txt` no bloqueará esas páginas antes de que el rastreador pueda leer la regla de no indexación.
- `robots.txt` excluirá superficies no documentales como API y archivos internos; `sitemap.xml` contendrá únicamente la portada canónica.
- El manifiesto describirá identidad, colores e iconos, pero no se registrará service worker ni se prometerá funcionamiento sin conexión.
- Los iconos usarán una sola composición de marca adaptada a contexto cuadrado; la tarjeta social combinará la marca y el mensaje de la portada en proporción horizontal.
- Los recursos serán autoalojados para respetar la política CSP y evitar dependencias externas o bloqueos en Brave.
