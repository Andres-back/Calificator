# Especificación: En un desacuerdo entre modelos vale el modelo principal

**Rama**: `codex/212-modelo-principal-desacuerdo` | **Creada**: 2026-11-21 | **Estado**: Aprobada e implementada | **Issue**: [#445](https://github.com/Andres-back/Calificator/issues/445)

**Entrada**: el usuario preguntó si el comparador o el verificador no resolvían el desacuerdo entre las dos lecturas de IA y pidió «que ponga la del modelo principal». Ante las opciones de alcance eligió «Preguntas + notas».

## Hallazgo

Cada pregunta la valoran el modelo principal (A) y el verificador (B). En producción, en los últimos 30 días:

| Medida | Valor |
| --- | --- |
| Desgloses automáticos con «requiere revisión» | 176 de 178 |
| Desgloses bloqueados por alguna nota del verificador | 170 |
| Preguntas pendientes con valoración válida del modelo principal | 92 |
| Comparador (`targeted_recheck`) antes de la Spec 205 | 57 de 93 fallidas por `output_budget_exhausted` |
| Comparador después de la Spec 205 | 33 de 34 correctas |

El comparador entrega solo una nota total; el desglose por pregunta no usa su veredicto. Cualquier nota del verificador bloqueaba, incluso las que solo confirman («Suma verificada dígito a dígito»).

## Escenarios de usuario y pruebas

### Historia 1 - La pregunta en desacuerdo tiene puntaje (Prioridad: P1)

**Aceptación**:
1. **Dado** que A y B discrepan en una pregunta y A dio una valoración válida, **entonces** la pregunta toma el puntaje, el estado y la explicación de A, con origen `modelo_principal`, y conserva las dos valoraciones.
2. **Dado** que B no pudo valorar la pregunta y A sí, **entonces** vale A.
3. **Dado** que A no pudo valorar la pregunta, **entonces** sigue pendiente.
4. **Dado** que el verificador objeta esa pregunta (clave, puntaje, «no coincide», arbitraje), **entonces** sigue pendiente.

### Historia 2 - Las notas del verificador informan sin bloquear (Prioridad: P1)

**Aceptación**:
1. **Dada** una nota del verificador que no es objeción concreta, **entonces** se muestra al docente y no bloquea el desglose.
2. **Dado** un desglose completo, sin bloqueos, sin decisión docente y sin otro motivo de revisión, **entonces** la calificación queda «sugerida» y el docente la confirma antes de publicarla.
3. **Dado** que el modelo principal pidió revisión, que falta la segunda revisión, que se aplicó el piso objetivo, que se reescribió la retroalimentación, que falta evidencia o que la lectura pidió revisión, **entonces** la calificación sigue en «requiere revisión».

### Historia 3 - La interfaz muestra la decisión (Prioridad: P2)

**Aceptación**:
1. **Dada** una pregunta con origen `modelo_principal`, **entonces** pide atención con el texto «El verificador propuso N puntos; se usó la valoración del modelo principal» (o «no pudo valorarla») y no se marca como bloqueada.
2. **Dado** que el modelo principal tiene baja confianza, **entonces** la pregunta sigue bloqueada.

## Requisitos

### Requisitos funcionales

- **FR-001**: En `component_consensus`, si A tiene puntaje y estado valorado (`correcta`, `parcial`, `incorrecta`, `sin_respuesta`) y hay diferencia material con B o B quedó pendiente, la pregunta DEBE tomar la valoración de A con origen `modelo_principal` y sin revisión, conservando ambas valoraciones.
- **FR-002**: Si A no tiene valoración válida, la pregunta DEBE seguir pendiente como antes.
- **FR-003**: Las objeciones concretas del verificador DEBEN detectarse también por la mención de la clave, «no coincide» o «arbitraje», y DEBEN dejar esa pregunta pendiente.
- **FR-004**: Las notas y solicitudes del verificador NO DEBEN agregarse como bloqueos del desglose; siguen visibles en `grader_b.alertas`.
- **FR-005**: Con el desglose completo y sin bloqueos, una nota global del modelo distinta de la suma NO DEBE bloquear: la nota es la suma y la retroalimentación se rehace desde el desglose (estado `rebuilt` del guardián).
- **FR-006**: Tras el desglose, si la calificación estaba en «requiere revisión» solo por señales del verificador o del comparador, sin decisión docente, DEBE quedar «sugerida» y registrar `revision_resuelta_por_desglose`. Cualquier otro motivo (`review_reasons_outside_breakdown`) la mantiene en revisión; un dato ausente cuenta como motivo.
- **FR-007**: Ninguna decisión docente (confirmada, ajustada, publicada, anulada o revisada) DEBE cambiar.
- **FR-008**: La interfaz DEBE mostrar las preguntas con origen `modelo_principal` como atención, con lo que propuso el verificador, y considerar solo la confianza de A.

## Criterios de éxito

- **SC-001**: Pruebas del consenso, del desglose y nuevas de la Spec 212 en verde.
- **SC-002**: Pruebas de calificaciones del frontend en verde.
- **SC-003**: Ninguna calificación existente cambia: la regla rige para calificaciones nuevas o recalificadas.
