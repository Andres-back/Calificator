# Diagnóstico y decisiones —2026-10-30

## Base y límites de la revisión

Main `ff18bb3`, aplicación compilada correspondiente en un navegador local aislado con datos sintéticos:calificación publicada, ocho preguntas y retroalimentación larga. Chrome/Edge con viewport384×824, DPR3 y emulación de touch. Todas las conexiones externas bloqueadas; sin datos/evidencias de alumnos, IA, claves, notas guardadas, PR o cambios de producción.

No se ha probado físicamente el S23 Ultra del usuario. El servidor local tuvo inicialmente una separación de red entre procesos de diagnóstico; se reinició solo el servidor de QA en el mismo entorno de loopback, sin cambios de firewall o de aplicación.

## Preguntas verticales

**Evidencia**: `GradeBreakdown` usa `flex flex-wrap` con número, icono, puntaje y etiqueta completa en cada botón. A384px los botones medidos ocuparon aproximadamente180–194px, más de media fila útil; los ocho quedaron uno por fila,44px de alto más8px de separación, total408px.

**Decisión**: controles numéricos compactos, conservando icono/etiqueta accesible, prioridad y selección. Ocho preguntas en dos filas normales. El detalle seleccionado conserva el resumen completo. Añadir anterior/siguiente para no volver repetidamente a la lista.

**Alternativas consideradas**: reducir tipografía no mejora accesibilidad; esconder todas las preguntas detrás de otro formulario añade pasos; otro recuadro vertical desplazable repetiría el problema de scroll.

## Scroll de retroalimentación

**Evidencia**: `FeedbackWorkspace` integra `ShareFeedbackDialog`; su contenedor de detalle mantiene `overflow-y-auto overscroll-contain` aunque no tiene altura acotada. Medición desde el texto:contenedor interno `clientHeight=3524`, `scrollHeight=3524`, recorrido0; principal `clientHeight=761`, `scrollHeight=4123`, recorrido3362. El centro entra en ese contenedor sin recorrido; el margen derecho entra directamente en el principal.

**Reproducción con entrada nativa wheel del navegador**: desde posición480, desplazamiento300px en el centro(x192) dejó480; el mismo desde el margen(x365) llegó a780. Un cambio de estilo temporal solo en esa página sintética (`overscroll-behavior-y:auto`) hizo que centro y margen llegaran ambos a780. Se restauró inmediatamente en `finally`; no se editó la aplicación.

**Límite del ensayo táctil**: intentos CDP de touch/synthesizeScrollGesture no desplazaron ninguno de los puntos; no se usan como éxito ni como comparación válida centro/margen. La prueba wheel y la medición confirman la cadena de contención, pero la regresión táctil y la comprobación física quedan pendientes de implementación.

**Decisión**: diferenciar layout integrado/modal y asignar un dueño real al scroll integrado en todas sus vistas; preservar el modal acotado del grupo. Alinear el marcador del teclado con ese dueño.

**Alternativas consideradas**: eliminar `overscroll-contain` globalmente permitiría mover el fondo de otros diálogos; cambiar `touch-action` indiscriminadamente podría romper zoom/pan de evidencia. No forman parte de esta corrección.

## Conservación y evidencia

Capturas sintéticas en la salida privada de diagnóstico `output/playwright/mobile-review-20261030/` del worktree de comprobación; no incluyen la captura del estudiante del usuario. La revisión no modifica artefactos aprobados de131/135 ni reutiliza su autorización histórica como un permiso nuevo de implementación/fusión.
