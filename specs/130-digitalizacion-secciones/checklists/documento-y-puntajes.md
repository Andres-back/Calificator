# Lista de calidad de requisitos: documento completo y puntajes opcionales

**Propósito**: revisar claridad, consistencia, cobertura y medición del alcance aprobado antes de implementar.
**Creada**: 2026-10-26
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa aprobación de la calidad del requisito, no implementación terminada. Revisión asistida autorizada con la aprobación del plan que incluye esta puerta de calidad.

## Completitud

- [x] CHK001 ¿Están definidas conservación de secciones/subsecciones, lecturas, instrucciones y actividades sin convertirlas en preguntas? [Completitud, Spec FR-001/002, US1]
- [x] CHK002 ¿Están especificadas identidad única y numeración visible reiniciada sin ambigüedad de respuestas o puntos? [Claridad, Spec FR-003, SC-002]
- [x] CHK003 ¿Se exige cobertura documental localizada y se describe qué ocurre ante omisiones, asociaciones dudosas o material ausente? [Cobertura, Spec FR-004/010/014/015]

## Claridad y consistencia

- [x] CHK004 ¿Son consistentes edición, copia, consulta, impresión y contexto de todos los evaluadores con la misma versión? [Consistencia, Spec FR-005/006/007/008/020]
- [x] CHK005 ¿Se define el reparto opcional, su estado desactivado, suma exacta, vista previa y confirmación sin cambiar datos silenciosamente? [Claridad, Spec FR-017/018, US4]
- [x] CHK006 ¿Se describe la cobertura única de preguntas, padre/subsecciones, redondeo y ausencia de doble ponderación? [Consistencia, Spec FR-019, Casos límite, SC-007/008]

## Seguridad, recuperación y experiencia

- [x] CHK007 ¿Quedan explícitas conservación histórica, recuperación en copia y limitación de una transcripción sin figuras originales? [Cobertura, Spec FR-009/010/016, US3]
- [x] CHK008 ¿Se definen permisos, datos públicos/privados, errores, concurrencia y reintentos sin duplicados? [Completitud, Spec FR-011/012/015/016]
- [x] CHK009 ¿Están cuantificadas las condiciones móviles/escritorio y documentados límites de archivos/contexto/gasto sin afirmar reconocimiento infalible? [Medición, Spec FR-013/014, SC-005/006]

## Medición y trazabilidad

- [x] CHK010 ¿Cada requisito tiene aceptación medible, incluida la muestra 2+2+1, y límites de implementación y producción inequívocos? [Trazabilidad, Spec FR-001–020, SC-001–008, Supuestos]

## Notas

Generación: diez puntos, rigor estándar de revisión de PR, foco en integridad documental/puntajes y compatibilidad/privacidad. Sin aclaraciones adicionales: las decisiones solicitadas y sus límites figuran en el plan aprobado. La generación no evalúa ni marca sus propias casillas.

Revisión asistida separada de la generación, autorizada por «aprobe» del plan ampliado. Diez criterios completos: los veinte FR y ocho SC definen sus flujos/errores, conservación y opción de puntajes, y tienen tareas trazadas. No se marcaron casillas como prueba de funcionamiento; todavía corresponde implementar y ejecutar las verificaciones. Sin extensiones before/after_checklist.
