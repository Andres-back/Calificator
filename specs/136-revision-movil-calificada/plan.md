# Plan: revisión móvil de evaluaciones calificadas

**Rama**: `codex/136-revision-movil-calificada` | **Fecha**:2026-10-30 | **Spec**: [spec.md](./spec.md) | **Issue**: [291](https://github.com/Andres-back/Calificator/issues/291).

**Estado**: diseño aprobado por el usuario el2026-10-30, antes de implementación. Base inspeccionada:main `ff18bb32c2cf4e5452ade8843adde63859503e00` (PR290 fusionado). Esta revisión no verifica su despliegue.

## Resumen

Reducir la navegación de ocho preguntas a dos filas compactas en móvil y dar a la retroalimentación integrada un único dueño de desplazamiento. Reutilizar selección, prioridades, evidencia, editor y permisos existentes. No crear otra pantalla de calificación ni eliminar globalmente la contención de las ventanas del grupo.

El diagnóstico y un cambio temporal reversible en el navegador local confirman la causa del scroll; no se aplicó esa corrección al código. Evidencia, alternativas y límites en [research.md](research.md).

## Contexto técnico

**Lenguajes/versiones**: React18.3, TypeScript y estilos Tailwind/Vite vigentes.
**Dependencias**: ninguna nueva; usar iconos, botones y contratos actuales.
**Persistencia**: sin cambios. No migración, backfill o nuevos estados académicos.
**Pruebas**: Vitest/Testing Library existentes; regresiones de revisión/evidencia, feedback integrado y modal; comprobación real de desplazamiento desde el contenido y permisos sintéticos. Los tamaños y un `scrollTop` asignado por script no bastan para acreditar el gesto.
**Plataforma objetivo**: Chrome Android/Samsung S23 Ultra como caso reportado, Chromium y WebKit locales, Safari/iPhone por regresión emulada sin afirmar dispositivo físico; escritorio.
**Rendimiento y escala**:8/17/30 componentes; ocho accesos ≤112px y dos filas con texto normal de360a412px. No virtualizar la lista ni cargar librerías nuevas. Cero escrituras académicas o IA por navegar.

## Verificación de la constitución

- Separación de roles: mantener la superficie docente existente y su proyección autorizada; no añadir capacidades al estudiante o liberar soluciones.
- Integridad y trazabilidad: preservar puntajes, nota global, evidencia/versionado131, estados, prioridades134 y reglas de entrega135. Seleccionar o desplazar no guarda/publica.
- Asincronía e idempotencia: no nuevas operaciones; conservar epochs, estados busy y recuperación de solicitudes existentes.
- Datos y secretos: únicamente datos sintéticos para pruebas; sin APIs de modelos, credenciales o cuentas reales.
- Accesibilidad: controles≥44px, icono/texto accesible y selección distintos del color; texto ampliado puede aumentar filas. Teclado, foco, orientación, zonas seguras y contratos de borrador conservados.
- Gobernanza y pruebas: especificación y plan aprobados en el chat el2026-10-30; issue291 etiquetado. Después:Tasks/Analyze, pruebas RED→GREEN, Converge, PR/CI. No se modifican validadores/workflows ni se fusiona/despliega por aprobar solo el diseño.

Revisión posterior al diseño:sin excepción constitucional propuesta. No hay cambio de datos o backend, ni permiso para modificar producción. La mejora concreta la accesibilidad de131/134 y la lectura integrada de135, no sustituye sus contratos académicos.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` y pruebas: extraer si aporta claridad una navegación compacta con número/prioridad; ocultar solo el resumen visual redundante en móvil, nunca el nombre accesible ni el detalle académico. Reutilizar el clasificador actual.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y pruebas móviles: anterior/siguiente por la misma selección existente, guardas de borrador y desplazamiento que respete cabecera/foco; mantener acceso a evidencia/zoom e historial.
- `frontend/src/modules/feedback_sharing/{FeedbackWorkspace,ShareFeedbackDialog,FeedbackSharePanel}.tsx` y consumidores necesarios: contrato explícito de layout integrado/modal y clases de scroll acordes; no cambios de API ni aprobación.
- `frontend/src/hooks/useMobileFormViewport.ts` solo si la integración requiere reconocer el verdadero contenedor desplazable; preferir mover correctamente `data-mobile-scroll` al dueño antes de introducir lógica global. Revisar teclado de lectura/edición/compartir.
- Tests existentes de calificaciones/feedback y escenarios del incremento en la matriz E2E actual, sin duplicar workflows; registros de validación, índice e inventario al implementar.

## Decisiones y complejidad

1. **Navegación compacta**: en celular, cuadrícula de cuatro columnas a tamaño normal para ocho preguntas; número, icono de prioridad y contorno de selección. Puntaje y estado completos en la tarjeta seleccionada y nombre accesible. Anterior/siguiente muestra posición y delega al mismo callback/guardas. En tablet/horizontal puede aumentar columnas; escritorio mantiene resúmenes donde quepan. El texto ampliado nunca se fuerza a una altura fija que recorte contenido. No renumerar identidades o confundir secciones con números repetidos.
2. **Un dueño de scroll por contexto**: el detalle de calificación (`grade-review-scroll`) desplaza el feedback integrado. Sus descendientes en lectura/compartir/editar/impresión no conservan `overflow-y-auto` con `overscroll-contain` si carecen de altura limitada; crecen naturalmente y dejan pasar el desplazamiento. En la ventana del grupo se conservan altura acotada, sus scrolls reales y el bloqueo del fondo. Usar prop/contexto de layout local, no selectores globales que rompan todos los modales.
3. **Teclado y acciones**: los marcadores usados por el ajuste de teclado deben apuntar al verdadero dueño de scroll. Comprobar que cabecera, barra de selección, acciones fijas y reservas inferiores no se dupliquen o tapen el último botón; mantener funciones y confirmaciones, no mover aprobación al gesto.
4. **Alternativas rechazadas**: texto cada vez más pequeño; una altura fija con otro scroll vertical para la lista de preguntas; interceptar globalmente touch/wheel con `preventDefault`; eliminar toda contención del modal; cambiar notas/servicios para resolver un problema de layout.

No quedan incógnitas de diseño que exijan nuevos proveedores o investigación externa. La compatibilidad táctil del arreglo se verificará después de implementarlo; el diagnóstico de esta fase no la certifica.
