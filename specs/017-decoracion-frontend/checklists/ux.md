# Lista de calidad de requisitos: Decoración visual transversal

**Propósito**: validar claridad, completitud, consistencia y medición de los requisitos visuales
**Creada**: 2026-08-21
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [ ] CHK001 ¿Están documentados los límites que impiden modificar rutas, permisos, formularios, contratos y acciones? [Completitud, Spec §FR-001]
- [ ] CHK002 ¿Están definidos los requisitos para profesor, estudiante y las diferencias exclusivamente visuales entre ambos roles? [Cobertura, Spec §FR-004]
- [ ] CHK003 ¿Están cubiertos los estados de carga, vacío, error y ausencia del recurso ilustrado? [Cobertura, Spec §FR-008 y §FR-010]

## Claridad y consistencia

- [ ] CHK004 ¿La condición de “decorativo” está definida sin ambigüedad como no interactiva, secundaria e ignorada por tecnologías de asistencia? [Claridad, Spec §FR-003]
- [ ] CHK005 ¿Los requisitos de legibilidad, contraste y adaptación entre temas son consistentes con la prioridad de no saturar el contenido? [Consistencia, Spec §FR-005]
- [ ] CHK006 ¿La identidad visual solicitada es consistente con el supuesto de conservar la marca y mascota actuales? [Consistencia, Spec §FR-002 y Supuestos]

## Medición y trazabilidad

- [ ] CHK007 ¿Las cinco resoluciones objetivo y la ausencia de desbordamiento permiten evaluar objetivamente la respuesta adaptable? [Medición, Spec §SC-002]
- [ ] CHK008 ¿El requisito de preservar recorridos puede mapearse a pruebas de destinos y resultados existentes? [Trazabilidad, Spec §SC-001]
- [ ] CHK009 ¿La calidad del recurso ilustrado puede evaluarse objetivamente por ausencia de texto, marcas externas y controles aparentes? [Medición, Spec §SC-006]

## Accesibilidad y recuperación

- [ ] CHK010 ¿Está especificado el comportamiento cuando la imagen decorativa no se descarga o es bloqueada? [Cobertura, Spec §FR-008]
- [ ] CHK011 ¿Está definida la respuesta a movimiento reducido y ampliación de texto? [Cobertura, Spec §FR-009 y Casos límite]
- [ ] CHK012 ¿Está explícito que la decoración no debe cubrir ni desplazar controles en modales, tablas, formularios y visores largos? [Claridad, Historias 1 y 2]
- [ ] CHK013 ¿Está definido qué condiciones distinguen un botón funcional de un elemento meramente explicativo? [Claridad, Spec §FR-011 y §FR-012]
- [ ] CHK014 ¿Están documentadas la primera visita, omisión, reapertura y versión de las guías contextuales? [Cobertura, Spec §FR-013 y §FR-014]

## Notas

Lista destinada a revisión previa a implementación. No valida el código ni sustituye las pruebas visuales y funcionales.
