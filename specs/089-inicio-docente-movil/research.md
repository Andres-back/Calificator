# Investigación: inicio docente móvil

Fecha: 2026-10-06. Alcance aprobado para iPhone y Android. Investigación de código y documentación primaria; no pruebas de dispositivos ejecutadas.

## Entrada e identidad de instalación

**Decisión**: conservar el manifest en `/site.webmanifest`, `start_url: "/"`, `scope: "/"`, origen e iconos. No añadir `id` ni service worker en este cambio. Resolver la raíz instalada en código mediante un helper compartido que combine `matchMedia('(display-mode: standalone)')` y el indicador iOS `navigator.standalone`.

**Motivo**: el manifest actual no tiene `id`; en Chrome, cambiar la identidad implícita puede tratar la actualización como otra app. La documentación recomienda mantener ruta de manifest y entrada, o comprobar antes el identificador calculado. Los navegadores pueden interpretar `start_url` de forma diferente. La señal instalada describe modo de ejecución, no identidad del usuario.

**Alternativas**: cambiar entrada a `/app` y añadir identidad sin comprobarla (rechazado: riesgo de instalación duplicada/actualización demorada); detección por user agent (rechazada: no distingue ejecución instalada); exigir reinstalar (innecesario para el cambio de código web).

Fuentes: [Chrome: identidad de PWA](https://developer.chrome.com/docs/capabilities/pwa-manifest-id), [MDN: start_url](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url), [Apple: configuración e indicador standalone](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html). Apple es referencia archivada del indicador, no garantía universal de todas las versiones de iOS. Investigación delegada corroboró los riesgos de actualización de metadatos; la decisión no depende de un plazo de actualización específico.

## Comprobación de sesión antes de navegar

**Decisión**: extender exclusivamente la condición de bootstrap para tratar la raíz instalada como entrada protegida. Esperar `fetchMe` existente antes de navegar desde la landing instalada a `/app` con reemplazo del historial. Conservar las guardas actuales para rol, ausencia de sesión y contraseña temporal.

**Motivo**: `AuthBootstrap` envuelve `RouterProvider`, usa la ruta del navegador al montar y actualmente omite `/`. El store inicia en `idle`; redirigir sin esperar puede llevar indebidamente al login. No se debe introducir otra consulta de autenticación en Landing ni un store paralelo.

**Alternativas**: cambiar globalmente el router/autenticación o almacenar token adicional (rechazadas: mayor superficie y fuera de alcance). Asumir sesión transferida entre navegador y app (rechazada: se valida cada contexto, no se promete compartir cookies).

Referencias locales: `frontend/src/main.tsx`, `components/auth/RequireAuth.tsx`, `stores/auth.ts`, `modules/auth/LandingPage.tsx`.

## Materias, permisos y pendientes

**Decisión**: reutilizar `listMaterias` (`GET /materias`), claves de caché actuales, `routes.materiaEvaluaciones` y `routes.materiaAsistencia`. No obtener estudiantes/conteos por materia en el inicio. Filtrar localmente nombres/grado con normalización de búsqueda; limpiar sin mutaciones. Respetar permisos efectivos de `User`, como la navegación actual.

**Motivo**: el dashboard actual tiene hero, estadísticas, bandeja completa y recursos antes del acceso a materias; ya existe consulta de materias, pero no lista directa. `Materia` incluye nombre, área, grado y estado, no conteos de alumnos. Evitar N consultas y otra lógica de autorización.

**Alternativas**: API nueva de dashboard, datos de última materia o múltiples listados de alumnos (rechazados: no necesarios, añadirían contratos/persistencia). Reutilizar enlaces globales «Calificar» como acción principal (rechazado: el alcance prioriza materia/evaluación).

**Decisión de bandeja**: añadir presentación compacta al componente existente, una consulta `['bandeja-docente']`, detalle voluntario con enlaces existentes. Estados independientes y errores visibles sin cero ficticio; sin publicar, confirmar o reintentar desde la consulta del caso.

## Ayuda y pruebas

**Decisión**: reutilizar `GuidedTour`, `useFirstVisitTour` y `tourState`; identidad de tour distinta para este inicio docente y versión explícita. Omisión y reapertura manual. Si localStorage no está disponible, no bloquear; no prometer persistencia que el navegador impide.

**Motivo**: ya existe control de foco, omisión, movimiento reducido y manejo de almacenamiento fallido. No introducir modal ni animación paralelos.

**Alternativas**: tutorial obligatorio al arrancar o nuevos assets/GSAP (rechazados: trabajo inicial y ligereza tienen prioridad).

**Decisión de verificación**: extender pruebas contiguas y suite responsive; ejecutar casos móviles focalizados con Chromium y WebKit en secuencia. Cinco tamaños, claro/oscuro, permisos y fallos con datos ficticios. Modo instalado simulado separado de teléfono físico. No medir impacto docente ni tiempos LLM con este cambio.

Todas las preguntas técnicas necesarias para planificar están resueltas. Ninguna dependencia de backend, migración, proveedor o servicio externo nuevo.
