## Resumen

Closes #281

Especificación: `specs/134-revision-visual-nota-directa/spec.md`.

- «Editar nota» junto al valor principal: escribir el resultado final, con comentario opcional, sin calcular diferencias ni reescribir los puntos por pregunta.
- Conservar propuesta original, evidencias y versiones. Guardado atómico, permisos, conflictos e idempotencia. Una nota publicada pasa a ajustada con advertencia y suspensión de enlaces afectados; volver a publicar sigue separado.
- Prioridad compartida en resumen, botones y detalle: verde sin avisos, amarillo para comprobar y rojo para revisión prioritaria/baja confianza. Iconos, texto y selección independiente. El color no certifica exactitud ni representa acierto del estudiante.
- Quitar el editor global duplicado; mantener el editor de puntos individuales y la compatibilidad de API. Sin dependencias ni migraciones nuevas.

## Aprobación y verificación

Spec/plan aprobados por el usuario; revisión documental 16/16 + 8/8 autorizada y completa. Tasks, Analyze, Implement y Converge completados; evidencia: `specs/134-revision-visual-nota-directa/validation.md`.

- Backend: 1.583 unitarias aprobadas; 6 integraciones PostgreSQL sintéticas aprobadas, con rollback, concurrencia, permisos y lectura posterior del libro.
- Frontend: 1.064 unitarias aprobadas; tipos, lint y build aprobados.
- Revisión E2E: 32 nuevos Chromium/WebKit aprobados; 12 comprobaciones adicionales del nuevo valor en la lista y 2 de recuperación de acciones móviles.
- Regresiones existentes: 29 de revisión, 43 contextuales y 11 de accesibilidad aprobadas.
- Inventario vigente: 663 superficies. Gobernanza: 61 pruebas aprobadas, sin exclusiones. CI remoto debe terminar verde antes de cualquier fusión.

Se documentaron los intentos con problemas de temporización y las repeticiones aisladas; no se relajaron umbrales, timeouts, permisos ni controles de CI.

## Límites

Solo pruebas sintéticas: sin datos reales, producción, claves ni llamadas a IA. No cambia modelos, pipeline de calificación o escáner Spec 131. WebKit no sustituye una prueba física en iPhone. Este PR no autoriza fusión ni despliegue.
