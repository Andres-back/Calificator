# Especificación: El calificador sin nota conserva su motivo y se reintenta una vez

**Rama**: `codex/151-fallos-calificador-pagina` | **Creada**: 2026-11-06 | **Estado**: Aprobada (hotfix) | **Issue**: [#318](https://github.com/Andres-back/Calificator/issues/318)

**Entrada**: en producción, el 2026-11-05, 7 de 20 entregas de una evaluación quedaron sin nota. El usuario pidió corregirlo en el chat ("si corrige, deja todo saneado sin modificar las demás notas o entregas").

## Escenarios de usuario y pruebas

### Historia 1 - Menos entregas sin nota por una respuesta incompleta (Prioridad: P1)

Como docente, quiero que el sistema vuelva a intentarlo una vez cuando el calificador responde sin nota, para no tener que reintentar a mano.

**Prueba independiente**: si la primera salida no trae nota y la segunda sí, la etapa termina con esa nota. Nunca se hacen más de dos intentos.

### Historia 2 - Saber por qué no hubo nota (Prioridad: P1)

Como responsable del sistema, quiero ver el motivo real y la forma de la salida, para no confundir esta situación con una caída del proveedor.

**Prueba independiente**: una salida sin nota queda como `grader_missing_score`, no como `provider_error`, y guarda campos, número de componentes y estados, sin texto del estudiante.

### Casos límite

- Si los dos intentos salen sin nota, la entrega sigue sin nota y requiere revisión. El sistema no inventa ni calcula una nota.
- Los otros errores no transitorios (por ejemplo `output_refused`) siguen sin reintentarse.
- Las notas existentes no cambian. Una página sin respuestas sigue impidiendo la nota automática: esta spec no cambia esa protección contra ceros falsos.

## Requisitos

### Requisitos funcionales

- **FR-001**: Una salida del calificador sin `nota_sugerida` DEBE reintentarse una sola vez, dentro del límite de dos intentos por etapa.
- **FR-002**: El motivo `grader_missing_score` DEBE conservarse en el progreso de la etapa y en el detalle del fallo.
- **FR-003**: El detalle del fallo DEBE incluir la forma de la salida (campos conocidos, cantidad de campos desconocidos, presencia de la nota, componentes, componentes con puntaje y estados), sin texto del estudiante ni del modelo.
- **FR-004**: Si no hay nota después de los intentos, el sistema NO DEBE producir una nota.
- **FR-005**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

- **Calificación**: `resultado_json` gana el campo opcional `grader_a_output_shape` en los fallos. Sin migraciones.

## Criterios de éxito

- **SC-001**: Las salidas sin nota dejan de registrarse como `provider_error`.
- **SC-002**: Ningún dato del estudiante aparece en la forma de la salida.
