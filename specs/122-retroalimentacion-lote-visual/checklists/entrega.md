# Lista de calidad de requisitos: entrega en lote y fichas

**Propósito**: revisión de requisitos previa a implementación, centrada en integridad, privacidad y experiencia docente.
**Creada**: 2026-10-23
**Especificación**: [spec.md](../spec.md)

> Lista del revisor: `[x]` significa calidad del requisito revisada, no implementación terminada. La generación deja los ítems sin marcar; una revisión autorizada los evalúa por separado.

## Completitud y consistencia

- [x] CHK001 ¿Está delimitada la decisión global de aceptar/publicar, diferenciándola de recalificar e imprimir? [Claridad, Spec FR-002/012]
- [x] CHK002 ¿Está definida la prioridad de los ajustes previos y el tratamiento de notas ya publicadas? [Consistencia, Spec FR-002/004]
- [x] CHK003 ¿Se especifican fallos parciales, concurrencia, reintentos y conservación de la fuente por estudiante? [Cobertura, Spec FR-004/011]
- [x] CHK004 ¿Se define la copia individual/múltiple tras reabrir y la limitación de enlaces históricos no recuperables? [Completitud, Spec FR-005/006]

## Privacidad, presentación y medición

- [x] CHK005 ¿Quedan definidos destinatario, permisos, evidencia, caducidad y cuota sin cambios implícitos al copiar? [Consistencia, Spec FR-007]
- [x] CHK006 ¿Son inequívocos el mínimo de veinte motivos transparentes, la opción sin decoración y el modo variado estable? [Claridad, Spec FR-008]
- [x] CHK007 ¿Se cuantifica la legibilidad y se cubren corte, continuaciones y formatos de impresión? [Medición, Spec FR-009 y SC-003]
- [x] CHK008 ¿Se delimitan anchos, temas, objetivos táctiles, lectura y recuperación de errores sin pérdida de selección? [Cobertura, Spec FR-001/010/011 y SC-005]

## Notas

Revisión delegada explícitamente al agente mediante «Sí, revisa y continúa». Ocho criterios contrastados y satisfechos contra FR-001–012, SC-001–005 y el contrato aprobado. No se marcaron tareas de implementación por aprobar estos requisitos. Sin hooks de extensión.
