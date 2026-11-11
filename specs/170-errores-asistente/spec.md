# Especificación: El asistente deja ver por qué falló al generar o guardar

**Rama**: `codex/170-errores-asistente` | **Creada**: 2026-11-11 | **Estado**: Implementada; falta que el usuario registre `spec-approved` y `plan-approved` | **Issue**: [#359](https://github.com/Andres-back/Calificator/issues/359)

**Entrada**: la auditoría funcional del 2026-11-10 pulsó «Generar evaluación» con el proveedor de IA caído. El aviso apareció arriba del formulario, fuera de la vista, y pareció que el botón no hacía nada. Además, al guardar, el asistente muestra «revisa tu conexión» ante cualquier rechazo, aunque el backend explique el motivo.

## Escenarios de usuario y pruebas

### Historia 1 - Ver el aviso cuando algo falla (Prioridad: P1)

Como docente, quiero ver el aviso de error en cuanto aparece, para saber que la generación o el guardado no se completó.

**Prueba independiente**: con el contenido del asistente desplazado hacia abajo, un fallo al generar o al guardar deja el contenido al inicio, donde se pinta el aviso.

### Historia 2 - Saber qué corregir cuando el servidor rechaza el guardado (Prioridad: P1)

Como docente, quiero leer el motivo que da el servidor al rechazar un guardado, para corregirlo en vez de reintentar a ciegas.

**Prueba independiente**: un rechazo 409 con detalle «La suma de puntajes debe coincidir con la nota máxima.» muestra ese texto y no «revisa tu conexión».

### Casos límite

- Sin respuesta del servidor (sin red) se conserva el aviso actual de conexión.
- La edición del docente se conserva en ambos casos y el botón de guardar sigue habilitado.
- El mensaje del servidor pasa por el filtro actual (`toApiError`): un detalle técnico o demasiado largo se reemplaza por el texto genérico de su código.

## Requisitos

### Requisitos funcionales

- **FR-001**: Al aparecer un aviso de error de generación o de guardado, el contenido del asistente DEBE volver al inicio, donde está el aviso.
- **FR-002**: Si el servidor responde con un rechazo al guardar, el aviso DEBE incluir el motivo ya filtrado para el usuario.
- **FR-003**: Si no hay respuesta del servidor, el aviso DEBE seguir siendo el de conexión.
- **FR-004**: Un fallo NO DEBE descartar la edición ni deshabilitar el guardado.
- **FR-005**: DEBEN existir pruebas de regresión que fallen con el código anterior.

### Entidades clave

- Ninguna. Solo cambia la presentación de errores del asistente.

## Criterios de éxito

- **SC-001**: Un fallo al generar o guardar es visible sin que el docente tenga que desplazarse, comprobado con pruebas de componente y en el navegador.
- **SC-002**: Un rechazo con motivo muestra ese motivo.
