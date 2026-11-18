# Especificación: Recalificar con las respuestas esperadas corregidas

**Rama**: `codex/206-recalificar-respuestas-corregidas` | **Creada**: 2026-11-18 | **Estado**: Aprobada e implementada | **Issue**: [#430](https://github.com/Andres-back/Calificator/issues/430)

**Entrada**: un docente corrigió las respuestas esperadas de una evaluación de lectura ya entregada y volvió a calificar, pero el resultado no cambió. El usuario pidió usar como respuesta correcta la que el docente ya había validado.

## Causa

Cada entrega conserva la versión del contenido con la que se recibió. Al recalificar, si el contenido cambió, el sistema usa siempre la versión original; solo el reparto de puntos puede adoptarse. La protección es correcta cuando cambian las preguntas, pero deja sin efecto la corrección de una clave equivocada o de una lectura incompleta.

## Escenarios de usuario y pruebas

### Historia 1 - La corrección de la clave llega a las entregas (Prioridad: P1)

**Aceptación**:
1. **Dada** una entrega cuya evaluación tiene las mismas preguntas y respuestas esperadas o lectura distintas, **cuando** el docente abre «Volver a calificar», **entonces** ve en qué preguntas cambió la respuesta y la opción «Calificar esta entrega con las respuestas actuales».
2. **Dado** que marca la opción y envía, **entonces** la entrega queda asociada a la versión actual y la elección queda en el historial.
3. **Dado** que no la marca, **entonces** la recalificación usa la versión original, como hasta ahora.

### Historia 2 - Las preguntas siguen protegidas (Prioridad: P1)

**Aceptación**:
1. **Dada** una evaluación con preguntas, opciones, escala o material distintos, **entonces** no se ofrece la opción y se usa la versión original.

### Casos límite

- Cambiaron respuestas y también el reparto de puntos: se informa de ambos; la elección adopta la versión actual completa.
- La evaluación o la nota cambian entre la consulta y el envío: se rechaza sin recalificar.
- La respuesta de la consulta nunca incluye respuestas esperadas ni lectura, solo números de pregunta.

## Requisitos

### Requisitos funcionales

- **FR-001**: La consulta previa a recalificar DEBE distinguir el estado `respuestas_actualizadas` cuando, sin la clave de respuestas ni la lectura, ambas versiones son idénticas.
- **FR-002**: En ese estado la respuesta DEBE listar los números de pregunta con respuesta distinta y si la lectura cambió, sin exponer su contenido.
- **FR-003**: La adopción DEBE ser opcional y explícita: solo con la versión objetivo y el comprobante vigentes; sin elección se conserva la versión original.
- **FR-004**: Un comprobante vencido, incompleto o inventado DEBE rechazarse con conflicto y sin efectos.
- **FR-005**: La adopción DEBE quedar registrada en el historial de la calificación con las versiones anterior y nueva y las preguntas afectadas.
- **FR-006**: Cuando cambian preguntas, opciones, escala, material u otras reglas, el comportamiento actual NO DEBE cambiar.
- **FR-007**: El diálogo «Volver a calificar» DEBE mostrar el aviso, las preguntas afectadas y la casilla opcional.

## Criterios de éxito

- **SC-001**: Una edición real de respuestas esperadas produce una versión que el sistema reconoce como `respuestas_actualizadas`.
- **SC-002**: Las pruebas unitarias, de integración y de pantalla del flujo de recalificación pasan.
