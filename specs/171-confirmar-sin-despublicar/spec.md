# Especificación: «Confirmar todos» no despublica las notas publicadas

**Rama**: `codex/171-confirmar-sin-despublicar` | **Creada**: 2026-11-11 | **Estado**: Aprobada e implementada | **Issue**: [#361](https://github.com/Andres-back/Calificator/issues/361)

**Entrada**: la auditoría funcional del 2026-11-10 encontró que confirmar en lote fija el estado «confirmada» sin mirar el estado actual. El 2026-11-11 se comprobó contra la API local: una nota publicada volvió a «confirmada» con `POST /api/calificaciones/lote/confirmar`.

## Escenarios de usuario y pruebas

### Historia 1 - Confirmar todos sin retirar lo publicado (Prioridad: P1)

Como docente, quiero seleccionar todas las notas y pulsar «Confirmar todos» sin que las ya publicadas dejen de estar visibles para sus estudiantes.

**Prueba independiente**: un lote con una nota publicada y otra sugerida deja la primera en `publicada`, sin cambios, y la segunda en `confirmada`.

### Historia 2 - El lote no cambia la cifra de una nota publicada (Prioridad: P2)

Como docente, quiero que un lote no cambie por accidente la cifra de una nota publicada, para que ese cambio pase siempre por «Editar nota», que deja su registro.

**Prueba independiente**: un ítem con una cifra distinta de la publicada falla con un mensaje que remite a «Editar nota», y la nota no cambia.

### Casos límite

- Los enlaces de devolución de una nota publicada no se suspenden al pasar por el lote.
- Las notas sugeridas, por revisar o ajustadas siguen el flujo actual, con la regla del empate incluida.
- Confirmar una sola nota desde su detalle no cambia.

## Requisitos

### Requisitos funcionales

- **FR-001**: Confirmar en lote NO DEBE cambiar el estado, la nota, el historial ni los enlaces de una calificación publicada cuando la cifra enviada es la misma.
- **FR-002**: Ese ítem DEBE contarse como exitoso.
- **FR-003**: Si la cifra enviada es distinta de la publicada, el ítem DEBE fallar con un mensaje que remita a «Editar nota», sin cambiar la calificación.
- **FR-004**: Las calificaciones no publicadas del mismo lote DEBEN confirmarse como hoy.
- **FR-005**: DEBEN existir pruebas de regresión que fallen con el código anterior.

### Entidades clave

- **Calificación**: sin cambios de esquema ni migraciones.

## Criterios de éxito

- **SC-001**: Después de «Confirmar todos», ninguna nota que estaba publicada deja de estarlo, comprobado con pruebas unitarias y contra la API local.
- **SC-002**: No se modifica ninguna fila de producción para aplicar la corrección.
