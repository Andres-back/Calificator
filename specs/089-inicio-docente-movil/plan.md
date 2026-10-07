# Plan: inicio docente claro en iPhone y Android

**Rama**: `codex/089-inicio-docente-movil` | **Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Issue**: [#184](https://github.com/Andres-back/Calificator/issues/184)

**Estado**: alcance aprobado («APRUEBO PERO DEE SERVIR EN IPHONE Y ANDROID»); plan aprobado por el usuario («apruebo»). Continuar con revisión de checklist, Tasks y Analyze antes de implementar. No se autoriza fusión ni despliegue.

## Resumen

Reorganizar únicamente el inicio docente y la entrada desde el icono de la app instalable. Mostrar saludo breve, pendientes resumidos y materias con búsqueda y accesos directos a Evaluaciones y Asistencia; desplazar herramientas y estadísticas a un nivel secundario. Reutilizar rutas, consultas, componentes e iconos actuales, sin backend nuevo ni modificación de registros.

Mantener `start_url: "/"`, el manifest y su identidad actuales. Al abrir la raíz en modo instalado, comprobar primero la sesión existente y navegar después a `/app`; los controles vigentes deciden rol, acceso y cambio obligatorio de contraseña. La raíz en navegador conserva la landing pública. No prometer traslado de sesión entre Safari/Chrome y la app instalada, ni funcionamiento sin conexión.

## Contexto técnico

**Lenguajes/versiones**: TypeScript ^5.6.3, React ^18.3.1, Vite 8.1.4, Tailwind existente; usar el lockfile, sin actualizar dependencias.
**Dependencias**: React Router ^7.18.2, TanStack Query ^5.59.0, Zustand ^5.0.0, componentes `GuidedTour`, `useFirstVisitTour`, `EducationalIcon` y rutas centralizadas existentes. Sin bibliotecas nuevas.
**Persistencia**: ninguna tabla o migración. Sesión vigente sin cambios; marcador local de ayuda mediante `tourState`. Búsqueda y paneles abiertos en memoria, sin guardar datos de alumnos.
**Pruebas**: Vitest/Testing Library, E2E Playwright existentes, Chromium y WebKit; pruebas físicas iPhone/Android documentadas por separado. Datos ficticios y consultas simuladas.
**Plataforma objetivo**: navegador móvil e inicio desde icono en iPhone y Android; escritorio conservado. Cinco tamaños y dos temas definidos en SC-004.
**Rendimiento y escala**: reutilizar `['materias']` y `['bandeja-docente']`; no consultas por cada materia ni solicitudes a IA. Filtrado local de 30 materias ficticias. Dos tarjetas completas visibles al inicio bajo las condiciones de SC-001; cero mutaciones al explorar. No modificar tiempos de calificación o generación.

## Verificación de la constitución

- I. Roles: cumple por diseño; conservar guardas y autorización del servidor; enlaces y consultas según permisos efectivos, no solo el nombre del rol. Probar perfiles estándar y docente con permisos limitados.
- II. Integridad: cumple; abrir un pendiente navega, no confirma, publica, califica ni reintenta. No cambia notas, evidencias o historial.
- III. Asincronía: cumple; carga/error independientes de materias, bandeja y recursos; monitores existentes sin cambios. No crear trabajos ni cancelar trabajos al navegar.
- IV. Datos: cumple; sin esquema nuevo, borrados o migraciones. Reutilizar entidades y endpoints existentes.
- V. Accesibilidad: cumple por diseño; 44×44, teclado, ayuda omisible, contraste en ambos temas, títulos completos, scroll natural y safe areas. La aceptación depende de las pruebas, no de esta declaración.
- VI. IA y secretos: cumple; sin solicitudes nuevas a IA, proveedores o claves. Datos de pruebas sintéticos.
- VII. Gobernanza: alcance y plan aprobados; continuar con Checklist, Tasks, Analyze, implementación, verificaciones y Converge. No abrir PR de implementación con artefactos incompletos.
- VIII. Main/producción: sin push directo, bypass o despliegue manual; PR y CI verde antes de solicitar autorización de fusión de este cambio.

Revisión posterior al diseño: ninguna excepción constitucional, aclaración crítica o dependencia nueva. Aprobación del plan recibida; las verificaciones de entrega siguen pendientes y los artefactos de diseño no certifican ejecución.

## Estructura del proyecto

```text
specs/089-inicio-docente-movil/
  spec.md, plan.md, research.md, data-model.md, quickstart.md
  checklists/requirements.md
  contracts/ui.md
frontend/src/
  lib/installedApp.ts                         # helper pequeño propuesto
  components/auth/RequireAuth.tsx             # bootstrap de raíz instalada
  modules/auth/LandingPage.tsx                # redirección solo instalada
  modules/dashboard/DashboardPage.tsx         # inicio docente; otros roles intactos
  modules/dashboard/TeacherInbox.tsx          # resumen y detalle voluntario
  components/auth/RouteGuards.test.tsx
  modules/auth/LandingPage.test.tsx
  modules/dashboard/DashboardPage.test.tsx
frontend/e2e/p2-responsive.spec.ts             # extender casos móviles existentes
frontend/playwright.config.ts                # proyectos Chromium/WebKit focalizados
```

Añadir prueba unitaria contigua al helper si su cobertura no cabe claramente en las guardas. Mantener `site.webmanifest`, origen, iconos, rutas, componentes globales de navegación y política de service workers sin cambios. No crear estructura paralela de dashboard ni duplicar endpoints.

Fases después de aprobación: (1) regresiones de arranque instalado/roles y helper, (2) composición compacta y permisos, (3) estados/búsqueda/ayuda, (4) E2E y revisión visual, (5) Converge, trazabilidad y PR. Las tareas detalladas se generarán tras la aprobación; no se incluyen cuerpos de implementación en el diseño.

## Decisiones y complejidad

1. Un helper compartido detectará `display-mode: standalone` y `navigator.standalone === true`; no inferirá autorización ni usará detección por marca de teléfono. `AuthBootstrap` esperará la sesión también en raíz instalada antes de la redirección de `LandingPage`, evitando el paso prematuro por login con estado `idle`.
2. Materias primero: saludo compacto → resumen voluntario de pendientes → búsqueda → tarjetas. Dos acciones de al menos 44 px por tarjeta; nombre sin truncado inaccesible y grado solo cuando existe. Contenido secundario después, sin otra barra fija ni sección global Calificar.
3. `TeacherInbox` conservará una única consulta y listas de casos; su presentación compacta no mostrará las listas hasta solicitarlo. Una expansión voluntaria puede desplazar las materias; la pantalla inicial no. Los errores no se convertirán en «0 pendientes».
4. Usar el tour y su marcador existentes, con pocos pasos y control «Cómo empezar». Si almacenamiento está bloqueado, omitir no bloquea el trabajo; documentar limitación de persistencia, no guardar cookies o credenciales adicionales.
5. Consultas y acciones según permisos efectivos. Los accesos secundarios existentes permanecen disponibles en navegación o nivel secundario; no se eliminan capacidades por compactar el inicio.
6. Pruebas locales focalizadas y luego CI requerido completo. Chromium/WebKit simulan modos instalado/navegador; no sustituyen comprobación de instalación real, teclado y áreas seguras en ambos teléfonos.

Detalle de decisiones y fuentes: [research.md](./research.md). Contratos y aceptación: [contracts/ui.md](./contracts/ui.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md). No quedan decisiones críticas sin resolver.
