# Plan: revisión docente amplia y compacta

**Rama**: `codex/088-revision-amplia` | **Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Issue**: [#182](https://github.com/Andres-back/Calificator/issues/182)

Estado: alcance y plan aprobados por el usuario mediante «APRUEBO», en turnos separados el 2026-10-06. Checklist revisada 10/10 con autorización humana antes de implementar. Sin autorización de fusión o despliegue.

## Resumen

Redistribuir exclusivamente el centro de revisión docente: aprovechar el ancho disponible, reservar 320–360 px para la lista de alumnos y separar su desplazamiento del detalle. Reunir título, contexto y acciones en una cabecera compacta; mantener nombre activo visible y los detalles progresivos ya existentes. En pantallas estrechas continuar mostrando lista o detalle, nunca dos columnas comprimidas.

No cambiar APIs, cálculos, IA, permisos, registros ni acciones de guardado. Reutilizar estados, callbacks, protección de borradores y componentes actuales; añadir pruebas focalizadas sobre distribución y desplazamiento.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18.3; versiones efectivas resueltas por el lockfile existente, sin actualización de dependencias.
**Dependencias**: Tailwind 3.4, React Router 7, TanStack Query 5 y componentes UI actuales. No nuevas librerías de layout, virtualización o animación.
**Persistencia**: ninguna nueva; se conservan parámetros URL, consultas paginadas y estado de edición existentes. Sin migraciones ni escrituras por redistribuir.
**Pruebas**: Vitest/Testing Library y Playwright existentes: funcional, mock, accesibilidad y capturas. Ver [quickstart.md](./quickstart.md).
**Plataforma objetivo**: navegador, móvil prioritario; cinco tamaños y dos temas definidos en SC-004; humo acotado Chromium/WebKit.
**Rendimiento y escala**: listas sintéticas de 0/1/30/100 alumnos, búsqueda/paginación existentes; sin peticiones adicionales por scroll ni medir tamaños continuamente en JavaScript. En 1366×768: lista ≥320 px, cinco filas iniciales completas y cabecera del módulo ≤112 px en el caso ordinario definido por SC-002.

## Verificación de la constitución

- Separación de roles: cumple por diseño; expansión del shell limitada a la ruta de revisión docente, sin cambiar autorización. Regresión de usuario lector y estudiante obligatoria.
- Integridad y trazabilidad: cumple; mantener acciones y versiones de ajustes, confirmación, publicación e historial. Consultar no escribe notas; prueba de borrador y conflicto 409 reutilizada.
- Asincronía e idempotencia: cumple; consultas, carga y trabajos siguen usando sus contratos. No cambiar procesamiento ni reintentos; asegurar estados y acciones alcanzables.
- Datos y secretos: cumple; sin migraciones, modelos ni credenciales; fixtures sintéticas sin alumnado real.
- Accesibilidad: cumple por diseño; una vista cuando falta espacio, controles 44×44, foco, zoom, identidad visible y scroll completo. Verificación real obligatoria antes de afirmar cumplimiento.
- Gobernanza y pruebas: alcance, plan y revisión de requisitos aprobados. Issue, rama y artefactos presentes. PR y CI completos obligatorios; nunca push directo a main.

Revisión posterior al diseño: sin excepciones constitucionales ni aclaraciones técnicas pendientes. Resultados y límites de la verificación de implementación en quickstart.md.

## Estructura del proyecto

- `frontend/src/components/layout/AppShell.tsx`: variante amplia y de altura acotada únicamente para revisión docente normal con contexto seleccionado. Carga, publicación o selección abierta conservan un contenedor desplazable accesible.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: cabecera compacta, roster legible, filtros adaptables, scroll independiente y cabecera del alumno; conservar componentes y callbacks. Evitar sumar un segundo sistema de navegación o duplicar lógica de edición.
- `frontend/src/components/layout/AppShell.test.tsx` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`: aislar variante por ruta/rol, navegación y controles existentes.
- `frontend/e2e/fixtures/explainableGrading.ts`, `frontend/e2e/explainable-grading.spec.ts`, `frontend/e2e/mock/grading-review.mock.spec.ts`: extender fixtures/casos existentes sin nuevas suites redundantes.
- `frontend/e2e/accessibility/grading-review.a11y.spec.ts`, `frontend/e2e/visual/grading-review.visual.spec.ts` y referencias revisadas: comprobar paneles y shell en cinco tamaños y ambos temas.
- `specs/088-revision-amplia/`, documentación responsable de calificaciones en `specs/008-calificaciones/` e índice/inventario existentes si corresponde: actualizar intención y trazabilidad, no duplicar documentación funcional.

El directorio responsable comprobado es `specs/008-calificaciones/`. No tocar backend, datos ni módulos ajenos.

## Decisiones y complejidad

1. **Distribución con CSS**: cadena flex `min-height: 0` desde el shell hasta los paneles. Dos columnas a partir de 1280 px de viewport; con sidebar 256 px y márgenes reducidos queda espacio para lista ≥320 y detalle útil. Validar la frontera 1279/1280 y zoom antes de aceptarla. No modificar el breakpoint de navegación lateral general.
2. **Un único criterio de paneles**: clases responsive del workspace, barra móvil, padding inferior, regreso y bloqueo del cuerpo deben usar la misma frontera 1280, pasando un media query explícito al hook existente; no cambiar su valor por defecto global. Así 1024–1279 conserva un panel legible, sin fondo desplazable mientras el detalle está abierto. No remontar el editor al cruzar la frontera, para conservar borradores.
3. **Altura acotada solo donde procede**: revisión normal con contexto cerrado usa el espacio restante bajo la topbar. Cada panel tiene su propio `overflow-y-auto`; búsqueda/controles de lista quedan fuera de sus filas y la identidad del alumno se mantiene visible. Selector abierto, carga, publicación y avisos extraordinarios no deben crear un área atrapada: permitir desplazamiento exterior o área complementaria alcanzable. No ocultar temporizador ni trabajos.
4. **Cabecera compacta**: retirar tarjeta introductoria repetida del modo de revisión, reunir materia/evaluación, cambio y acciones en ≤112 px ordinarios. Mantener título accesible y permisos. Acciones secundarias bajo «Más acciones» cuando no caben; filtros envuelven o usan un control accesible, sin scroll horizontal obligatorio. Nombres completos consultables sin truncado permanente.
5. **Scroll y navegación**: revisar cada `scrollIntoView` para que lleve a la sección dentro del detalle, no arrastre lista/shell. Regreso conserva contexto y foco; cambiar alumno pasa por los guards actuales. No persistir nuevas preferencias ni sustituir callbacks.
6. **Verificación proporcional**: reutilizar cobertura de cálculo/edición/409; agregar solo los casos de espacio y scroll nuevos. Revisar capturas antes de renovar baselines. CI completo no se omite.

Motivos y alternativas en [research.md](./research.md); contratos en [contracts/ui.md](./contracts/ui.md). Sin complejidad o dependencias nuevas justificadas.
