# Especificación: Corregir una pregunta aunque otras sigan pendientes

**Rama**: `codex/167-corregir-con-pendientes` | **Creada**: 2026-11-11 | **Estado**: Aprobada e implementada | **Issue**: [#351](https://github.com/Andres-back/Calificator/issues/351)

**Entrada**: la auditoría funcional del 2026-11-10 abrió una calificación con varias preguntas «Por revisar» sin puntaje, ajustó el puntaje de una y guardó. El backend respondió 409 «Puntaje inválido para pregunta:N», donde N era otra pregunta pendiente, y la pantalla mostró «La calificación cambió en otra revisión» con el botón «Recargar versión vigente».

## Escenarios de usuario y pruebas

### Historia 1 - Resolver las preguntas pendientes una por una (Prioridad: P1)

Como docente, quiero guardar el puntaje de una pregunta aunque otras sigan pendientes, para revisar la entrega pregunta por pregunta.

**Prueba independiente**: un desglose con dos preguntas sin puntaje acepta el cambio de una de ellas y crea una versión nueva; la otra sigue pendiente.

### Historia 2 - La nota no se confirma mientras falten preguntas (Prioridad: P1)

Como docente, quiero que la nota siga «Por revisar» hasta resolver la última pregunta pendiente, para no confirmar ni publicar una nota calculada con preguntas sin puntaje.

**Prueba independiente**: después de guardar una pregunta con otra pendiente, la calificación queda en `requiere_revision` y `nota_confirmada` no cambia. Al guardar la última pendiente, queda `ajustada` con la nota del desglose, como hoy.

### Historia 3 - El aviso dice lo que pasó (Prioridad: P2)

Como docente, quiero ver el motivo real de un rechazo al guardar, para saber si debo recargar o corregir un dato.

**Prueba independiente**: un puntaje fuera de rango en la pregunta editada responde 422 y la pantalla muestra ese mensaje. El aviso «La calificación cambió en otra revisión» aparece solo con un 409.

### Casos límite

- Corregir una pregunta ya calificada mientras otra sigue pendiente también se guarda.
- Un cambio con la versión desactualizada sigue respondiendo 409 y conserva el borrador.
- Una calificación publicada conserva su estado al corregir una pregunta, como hoy.
- El ajuste global y «Editar nota» no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: Al guardar cambios por pregunta, el backend DEBE validar el rango de puntos solo en las preguntas que cambian.
- **FR-002**: Una pregunta pendiente que no cambia DEBE conservar su estado y seguir sin puntaje en la versión nueva.
- **FR-003**: Si la versión nueva conserva preguntas pendientes y la calificación no está publicada, la calificación DEBE quedar en `requiere_revision`, sin modificar `nota_confirmada` ni la decisión del empate.
- **FR-004**: Si la versión nueva no tiene preguntas pendientes, el comportamiento DEBE ser el actual: nota del desglose, estado `ajustada` o `publicada`.
- **FR-005**: Un puntaje fuera de rango en una pregunta editada DEBE responder 422 con su mensaje.
- **FR-006**: La pantalla DEBE mostrar el aviso de conflicto solo ante un 409 y el mensaje del backend en los demás rechazos.
- **FR-007**: DEBEN existir pruebas de regresión que fallen con el código anterior.

### Entidades clave

- **Desglose** y **componente**: sin cambios de esquema ni migraciones. Los desgloses guardados no se modifican.

## Criterios de éxito

- **SC-001**: Una entrega con cinco preguntas pendientes se puede resolver guardando cada pregunta por separado, comprobado con pruebas unitarias y en el navegador.
- **SC-002**: En ningún paso intermedio la calificación aparece como confirmada ni se ofrece publicarla.
- **SC-003**: No se modifica ninguna fila de producción para aplicar la corrección.
