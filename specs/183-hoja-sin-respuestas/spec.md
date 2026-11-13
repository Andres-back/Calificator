# Especificación: Una hoja sin respuestas no impide calificar las demás

**Rama**: `codex/183-hoja-sin-respuestas` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#386](https://github.com/Andres-back/Calificator/issues/386)

**Entrada**: el usuario preguntó por qué una evaluación de 2 hojas no se calificó.

## Evidencia (producción, solo lectura)

| Observación | Dato |
| --- | --- |
| Versión 1 (25-oct, lector anterior) | Nota 4,5. Leyó respuestas en las preguntas 1–10 de la hoja 2, todas iguales a la clave. |
| Hoja 2 vista a mano | Sin nombre y sin marcas visibles en las opciones: las respuestas de la versión 1 eran inventadas. |
| Recalificaciones del 3-nov (5) y de hoy (Sonnet) | Una hoja leída; en la otra, el lector principal y el de respaldo no ven respuestas (`vision_no_student_answers`). |
| Resultado | Toda la calificación falla (`vision_incomplete_pages`) y queda sin nota. |
| Código | La ruta no administrada devuelve la hoja «requiere revisión»; la administrada (producción) lanza un error. |

## Escenarios de usuario y pruebas

### Historia 1 - Se califica lo que sí se ve (Prioridad: P1)

**Aceptación**:
1. **Dada** una entrega de varias hojas en la que ningún lector ve respuestas en una hoja, **cuando** se califica, **entonces** la hoja vuelve «requiere revisión» con un aviso y las demás hojas se califican.
2. **Dada** esa calificación, **entonces** requiere revisión docente y sus respuestas no se aceptan sin ella.
3. **Dado** que el lector principal no ve respuestas, **entonces** el de respaldo lee la hoja antes de aceptar la incertidumbre.

### Casos límite

- Un fallo real (tiempo de espera, transporte, salida truncada) después de una lectura en blanco sigue siendo un fallo.
- Una hoja de lectura sin respuestas sigue siendo válida, como antes.

## Requisitos

### Requisitos funcionales

- **FR-001**: En la ruta administrada, si el último lector no ve respuestas en una hoja que no es de lectura, la hoja DEBE devolverse con estado `requires_review`, sin texto y con el aviso de la ruta no administrada.
- **FR-002**: El lector de respaldo DEBE intentarlo antes de devolver la hoja para revisión.
- **FR-003**: La extracción con esa hoja DEBE marcar `requires_review` y no fallar por hojas incompletas.
- **FR-004**: Un fallo distinto en el último intento DEBE seguir fallando.

## Criterios de éxito

- **SC-001**: Una entrega con una hoja en blanco se califica con las demás hojas y queda para revisión docente.
- **SC-002**: Las pruebas existentes de lectura siguen pasando.
