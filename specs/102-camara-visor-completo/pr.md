## Alcance

Closes #212

Spec responsable: `specs/102-camara-visor-completo/spec.md`; plan/tareas/checklists/contratos y quickstart en el mismo directorio. Actualiza propietarios 005-evaluaciones y 008-calificaciones.

- «Tomar foto» abre cámara integrada, sin audio, con revisión/repetición/aceptación y subida alternativa. Apaga streams y descarta resultados tardíos ante cierre, segundo plano, cambio de contexto o envío.
- «Visualizar evaluación» aprovecha el viewport, permite leer todas las páginas por un scroll y limita el dibujo a una cola serial y hasta tres canvases. Mantiene página visible al ampliar.
- Opciones agrupa PDF, Word y «Ver evaluación completa (otra pestaña)»; permisos de solucionario y documentos autorizados intactos.
- Conserva límites/calidad/orden de hojas y el envío explícito. Sin nuevas rutas, tablas, llamadas IA ni cambios a notas/evidencias guardadas. No mezcla trabajo pendiente de Spec 101.

## Aprobación y gobernanza

Usuario aprobó alcance y pidió PR/fusión con Spec Kit. El 2026-10-17 aprobó expresamente el plan y autorizó revisar la lista de requisitos. Specify 16/16, UX 8/8; 14 tareas completas; Analyze y Converge sin trabajo funcional pendiente. Inventario regenerado y Spec 102 añadido a línea base, sin debilitar controles.

## Validación

- 60 pruebas focalizadas en ocho archivos (consumidores docente/estudiante incluidos); nueve pruebas finales de viewer/cola tras añadir regresión de página visible.
- TypeScript, lint estricto, build y auditorías de acciones/build.
- Matriz E2E amplia inicial: 20/22; esperas de clic de WebKit Windows escritorio diagnosticadas y casos finales ejecutados con teclado real, sin `force`, skip ni ampliar timeouts. Móvil/Chromium conservan clics. Cámara WebKit escritorio y PDF WebKit 1920 regresados en verde.
- Lector final, 390/1440 y veinte páginas, Chromium/WebKit: 6/6. Cámara con fixtures sintéticos, permiso denegado, repetición, contexto, limpieza y no envío automático comprobados.
- Nginx productivo ya permite cámara propia y deniega audio/geolocalización; configuración alternativa alineada. Solo se consultaron headers públicos, no datos productivos.
- Resultados y límites detallados en `quickstart.md`. CI remoto se verifica antes de fusionar.

## Límites y conservación

Sin cámara física acreditada: Chromium usa stream sintético; WebKit Windows simula fuente/frame para probar captura/UI. No afirmar prueba física iPhone/Android. No acceder a imágenes de alumnos ni gastar APIs de IA. No desplegar manualmente en VPS ni hacer bypass administrativo. Fusionar por squash solo este HEAD con los cuatro controles requeridos en verde.
