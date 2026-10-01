# Lista de calidad de requisitos: consulta docente compacta

**Propósito**: revisar requisitos de integridad, claridad y menor saturación antes de implementar.
**Creada**: 2026-09-30
**Especificación**: [spec.md](../spec.md)

> Revisión de requisitos, no ejecución de pruebas. Los marcadores pertenecen al revisor; su aprobación no implica implementación terminada.

**Ampliación pendiente**: esta lista conserva la revisión original de historias 1–3 sin marcar. Antes de implementar se ampliará/revisará, con autorización del usuario, para cubrir resultado de cuatro secciones, respaldo registrado, contexto de creación y borradores de historias 4–5. La revisión automática de `requirements.md` no sustituye este gate.

## Completitud

- [x] CHK001 ¿Está definido que las marcas y el guardado incluyen a alumnos ocultos por búsqueda? [Completitud, Spec §FR-002/003]
- [x] CHK002 ¿Se incluyen todos los matriculados y los estados sin nota/procesamiento en la evaluación seleccionada? [Cobertura, Spec §FR-007/012]
- [x] CHK003 ¿Están definidos los campos de la fila compacta y el acceso progresivo al detalle? [Claridad, Spec §FR-012]

## Claridad y consistencia

- [x] CHK004 ¿Se distinguen resultado de una evaluación, promedio general y sugerencia no definitiva? [Consistencia, Spec §FR-005/007/011]
- [x] CHK005 ¿La retirada lateral conserva roles especiales, enlaces previos y menús de otros perfiles? [Cobertura, Spec §FR-008/009]
- [x] CHK006 ¿Se definen recuperación de filtros, ausencia de coincidencias y selección desaparecida? [Cobertura, Spec §FR-003/006/007]

## Medición

- [x] CHK007 ¿La búsqueda tiene un objetivo temporal y tamaño de grupo verificables? [Medición, Spec §SC-001/002]
- [x] CHK008 ¿La densidad móvil de notas y el número total de alumnos tienen aceptación cuantificada? [Medición, Spec §SC-007]
- [x] CHK009 ¿Desplazamiento, resolución, temas y controles táctiles tienen límites explícitos? [Claridad, Spec §FR-010, SC-005]
- [x] CHK010 ¿Está expresamente excluida cualquier modificación de notas, asistencias o IA por los filtros? [Límites, Spec §FR-011, SC-006]

## Resultado y creación contextual

- [x] CHK011 ¿Se define el orden de las cuatro secciones y qué queda abierto en todos los tamaños? [Claridad, Spec §FR-014, SC-008]
- [x] CHK012 ¿Está definido el respaldo permitido de la nota, el ajuste global y el mensaje de ausencia histórica sin motivos inventados? [Consistencia, Spec §FR-015, SC-009]
- [x] CHK013 ¿La progresividad conserva alertas, enlaces a pregunta/hoja y decisiones docentes sin bloqueos ocultos? [Cobertura, Spec §FR-016, Historia 4]
- [x] CHK014 ¿Se especifica la conservación de filtros y cambios sin guardar al volver o plegar el detalle? [Cobertura, Spec §FR-013/016, SC-009]
- [x] CHK015 ¿Se distingue creación contextual de entrada general y edición, sin repetir materia/grado/área ni ampliar permisos? [Claridad, Spec §FR-017, SC-010]
- [x] CHK016 ¿Se define la recuperación de borradores por materia, incluidos anteriores, sin reasignación o sobrescritura ajena? [Cobertura, Spec §FR-019, SC-010]
- [x] CHK017 ¿Las opciones progresivas mantienen valores, errores visibles y revisión humana de escala, pesos, rúbrica y respuestas? [Completitud, Spec §FR-018, Historia 5]

## Revisión autorizada 2026-09-30

El usuario autorizó mediante «SIGUE» la revisión en Codex ante la pregunta explícita de alcance, plan y checklist. Se evaluaron los 17 requisitos contra las referencias indicadas: todos tienen definición, estados alternativos y criterio medible; no hay gaps críticos. Los marcadores se actualizaron en esta revisión autorizada, separada de la generación del checklist y de Implement. No significan que el código esté terminado.
