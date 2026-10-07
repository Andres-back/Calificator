# Investigación de distribución

Fecha: 2026-10-06. Inspección local, sin pruebas ni acceso a datos productivos durante la planificación.

## 1. Ancho disponible

- **Decisión**: variante del shell específica para revisión docente; roster de 320–360 px en dos paneles, no `lg:w-64`.
- **Motivo**: `AppShell.tsx` limita el contenido a `max-w-7xl`; `CalificacionesWorkspace.tsx` fija 256 px para una fila con checkbox, nombre, estado y nota. La captura coincide con estas restricciones.
- **Alternativas**: aumentar solo el ancho del roster conservaría márgenes innecesarios; retirar el máximo de todos los módulos ampliaría el alcance. Colapsar el sidebar general cambiaría navegación fuera del pedido.

## 2. Desplazamiento

- **Decisión**: flex/min-height y overflow de lista/detalle por separado solo en revisión ordinaria de escritorio; controles de búsqueda y nombre activo fuera del contenido largo.
- **Motivo**: el shell usa `lg:overflow-y-auto` y el detalle `lg:overflow-visible`: al bajar en respuestas se aleja la lista. Acotar ambos paneles exige una cadena de altura coherente, no solo añadir overflow a una tarjeta.
- **Alternativas**: sticky de toda la lista conserva competencia con scroll exterior; altura absoluta calculada en JS es frágil con zoom, avisos y teclado; virtualización no es necesaria para la paginación existente y añade riesgos de foco.

## 3. Adaptación estrecha

- **Decisión**: dos paneles desde 1280 px; por debajo lista o detalle. Sin modificar breakpoint del sidebar o valor global del hook de bloqueo.
- **Motivo**: reservar ancho para el nombre no debe comprimir la revisión a 1024 px con sidebar. CSS de overlay, barra de acciones y media query explícito de `useBodyScrollLock` deben coincidir.
- **Alternativas**: conservar 1024 y estrechar detalle viola intención de legibilidad; cambiar hook global podría afectar otros diálogos. Un breakpoint diferente debe justificarse con medidas reales, no asumirse satisfactorio por una captura.

## 4. Cabecera y estados especiales

- **Decisión**: contexto compacto y menú de acciones existente reutilizado; cabecera ordinaria ≤112 px. Selector abierto y modos carga/publicación no fuerzan la misma altura acotada.
- **Motivo**: PageHeader, contexto y cabecera del alumno acumulan espacio. Temporizador, trabajos, errores y publicación requieren contenido variable; ocultarlos para cumplir medidas sería un fallo funcional.
- **Alternativas**: ocultar todos los mensajes resta trazabilidad; fijar múltiples tarjetas a la pantalla reproduce el bloqueo observado en asistencia. Las secciones progresivas y avisos de 087 se conservan.

## 5. Integración y pruebas

- **Decisión**: fixtures sintéticas y suites existentes; lecturas sin mutaciones académicas, guards y permisos conservados.
- **Motivo**: hay cobertura de editor inline, 409, móvil, detalle progresivo, accesibilidad y capturas. Nuevas comprobaciones deben medir ancho/filas/altura, mover rueda sobre cada panel y comprobar el otro inmóvil.
- **Alternativas**: pruebas solo de clases no demuestran desplazamiento real; repetir todas las suites por cada cambio consume tiempo sin añadir evidencia. No usar alumnos/productores reales para evaluar CSS.

No quedan decisiones marcadas como necesita aclaración. La validación empírica se hará después de la aprobación del plan; este documento no certifica resultados.

## Contraste independiente requerido por Plan

Investigación delegada de solo lectura confirmó las causas y el enfoque: `MobileReviewContext` también se monta en escritorio, el wrapper del Outlet no tiene una cadena de altura acotada y la fixture visual actual contiene un solo alumno. Por eso se medirá el resultado con 30/100 alumnos, no se aceptarán capturas de una sola fila como evidencia de SC-002.

Riesgos incorporados: cambiar juntos barra de acciones, padding inferior, retorno, overlay y media query local de bloqueo; no remontar el editor al redimensionar. Temporizador, monitor embedded y resultados batch de altura variable necesitan región alcanzable o fallback de scroll normal. Los `scrollIntoView` de evidencia, pregunta y ajustes requieren comprobación del contenedor real y preservación del roster.
