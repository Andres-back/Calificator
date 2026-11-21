# Especificación: Avisar qué respuestas no aparecen en las fotos de la entrega

**Rama**: `codex/207-respuestas-fuera-de-fotos` | **Creada**: 2026-11-20 | **Estado**: Aprobada e implementada | **Issue**: [#435](https://github.com/Andres-back/Calificator/issues/435)

**Entrada**: el usuario preguntó por qué una entrega no se calificaba «si ahí está el texto de la respuesta». La foto solo traía la cara con la respuesta 1; las respuestas 2 y 3 estaban al reverso y el texto que se veía era la lectura impresa. Aprobó mejorar el aviso. Después señaló otra entrega «con toda la evidencia» que no se calificó: la foto, completa, era una página de apuntes de otra actividad («Reino vegetal / Proceso de la fotosíntesis»); la IA lo detectó y no calificó, pero la pantalla solo decía «Falta información para completar la revisión».

## Problema

La calificación ya detecta qué preguntas no aparecen en las fotos (`evidence_coverage.faltantes`) y no les pone cero. Pero la pantalla lo comunicaba mal: el aviso general decía «No están revisadas todas las preguntas de forma consistente» y llevaba a los puntajes; cada pregunta solo decía «La valoración quedó pendiente». En producción había 15 entregas sin decidir en tres evaluaciones con este caso.

## Escenarios de usuario y pruebas

### Historia 1 - Saber qué falta y cómo resolverlo (Prioridad: P1)

**Aceptación**:
1. **Dada** una entrega en la que faltan las preguntas 2 y 3 en las fotos, **cuando** el docente abre la revisión, **entonces** ve «Las respuestas de las preguntas 2 y 3 no aparecen en las fotos», la indicación de añadir la foto del reverso u otra hoja en «Editar hojas» y un botón que lleva a la evidencia.
2. **Dada** la pregunta 2 de esa entrega, **entonces** su primer motivo es «Esta respuesta no aparece en las fotos de la entrega».

### Historia 2 - La foto no trae respuestas a la evaluación (Prioridad: P1)

**Aceptación**:
1. **Dada** una entrega cuya foto la IA consideró sin respuestas a la evaluación (por ejemplo, apuntes de otra actividad), **cuando** el docente abre la revisión, **entonces** ve primero «La IA no encontró en las fotos respuestas a esta evaluación», lo que la IA vio y qué hacer (cambiar la evidencia, añadir la hoja correcta o calificar a mano), con un botón a la evidencia.

### Historia 3 - Entregas ya calificadas (Prioridad: P1)

**Aceptación**:
1. **Dada** una entrega calificada antes de este cambio, **entonces** el aviso funciona sin recalificar, porque usa el dato que la calificación ya guardó.

### Casos límite

- Una pregunta ya decidida por el docente no muestra el motivo ni entra en el aviso.
- Sin el detalle de preguntas, el aviso dice «Faltan respuestas en las fotos de la entrega», con la misma indicación.
- Valores del resultado que no parecen números de pregunta se ignoran.

## Requisitos

### Requisitos funcionales

- **FR-001**: La pantalla DEBE leer las preguntas faltantes de `resultado_json.evidence_coverage.faltantes` cuando la cobertura requiere revisión.
- **FR-002**: El aviso general DEBE nombrar las preguntas faltantes pendientes, sustituir al aviso genérico de cobertura y llevar a la evidencia.
- **FR-003**: El aviso DEBE indicar que se añada la foto del reverso u otra hoja en «Editar hojas» y que la IA no pone cero a una respuesta que no ve.
- **FR-004**: Cada pregunta faltante no decidida por el docente DEBE mostrar como primer motivo «Esta respuesta no aparece en las fotos de la entrega».
- **FR-005**: Sin detalle de preguntas, el aviso de cobertura incompleta DEBE decir «Faltan respuestas en las fotos de la entrega» y llevar a la evidencia.
- **FR-006**: No DEBE cambiar la calificación ni los datos guardados.
- **FR-007**: Cuando la lectura de las fotos no encontró respuestas a la evaluación (`motivo_revision` `image_not_usable` o `student_answers_not_detected`), la revisión DEBE mostrar primero «La IA no encontró en las fotos respuestas a esta evaluación», con lo que explicó la IA (máximo 280 caracteres) y qué hacer, y su botón DEBE llevar a la evidencia; en ese caso no se muestra «Falta información para completar la revisión».
- **FR-008**: Cuando hay preguntas faltantes nombradas o una foto sin respuestas, ese aviso DEBE encabezar el resumen de revisión, con su indicación visible.

## Criterios de éxito

- **SC-001**: En 390 px y 1366 px el aviso y el motivo se ven sin desplazamiento lateral.
- **SC-002**: Las pruebas del módulo de calificaciones siguen pasando.
