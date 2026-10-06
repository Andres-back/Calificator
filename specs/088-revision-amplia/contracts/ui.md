# Contrato de revisión docente

Ruta canónica existente `/app/calificaciones`; conservar sus parámetros y redirecciones heredadas. Sin endpoints nuevos o modificación de contratos públicos.

## Presentación

- En 1366×768 y 1920×1080: lista ≥320 px con nombre completo consultable, nota/estado/checkbox visibles. Revisión normal de 30 alumnos: cabecera previa a paneles ≤112 px y al menos cinco filas completas al iniciar en 1366×768.
- Dos paneles desde 1280 px; abajo uno a la vez con retorno al grupo. Roster y detalle se desplazan de forma independiente; no bloquear la lista al usar rueda sobre el detalle. El alumno activo sigue identificable.
- Búsqueda y filtros accesibles sin desplazar la página al inicio o horizontalmente. Mantener paginación y selección múltiple.
- Controles ≥44×44 px; foco visible, nombre accesible, contraste de temas vigente, navegación por teclado y safe-area. No usar iconos sin etiqueta como único significado.
- Nota y estado primero; evidencia, respuestas/puntajes, criterios, retroalimentación e historial siguen disponibles progresivamente. Avisos/bloqueos no se ocultan.

## Acciones y seguridad

- Reutilizar handlers existentes de selección, cambio de contexto, ajuste, confirmación, publicación y retorno. Mantener permisos; ningún acceso docente nuevo para estudiante o usuario lector.
- Abrir/buscar/desplazar/redimensionar no genera ajuste, confirmación, publicación, recalificación o llamada IA. La telemetría existente no se confunde con mutación académica.
- Borrador protegido al cambiar alumno/contexto o salir; ningún guardado automático nuevo. Conflicto 409 conserva edición y exige recuperación vigente.
- Carga/publicación/contexto abierto, trabajos, temporizador y errores siguen alcanzables con altura variable; los controles finales no quedan bajo overlays o barras.

## Evidencia requerida

Medir cajas reales, scrollTop de ambos paneles antes/después de rueda y filas totalmente visibles. Verificar 30/100 alumnos ficticios, nombres largos, pregunta 20, foco/retorno, lectura sin escrituras académicas, permisos y móvil. Capturas revisadas, no simple actualización automática de referencias.
