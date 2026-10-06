# Lista de calidad de requisitos: Asistencia automática

**Propósito**: revisión previa de claridad, recuperación y conservación de datos.

**Creada**: 2026-10-06

**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa calidad del requisito revisada, no implementación completa. Lista nueva: pendiente de revisión humana o autorización de revisión asistida. Implement no puede modificar estos marcadores.

## Completitud y límites

- [x] CHK001 ¿Está definido que guardar un alumno no exige completar el grupo ni modifica alumnos omitidos? [Completitud, Spec FR-001–FR-002, US1]
- [x] CHK002 ¿Están especificadas matrícula activa, autorización y conservación de asistencias previas y calificaciones? [Cobertura, Spec FR-010–FR-011]

## Claridad y consistencia

- [x] CHK003 ¿Se diferencian pendientes de asistencia y cambios no confirmados, incluyendo estados guardando, guardado y error? [Claridad, Spec FR-003, FR-009, US2]
- [x] CHK004 ¿Está especificado cómo conservar la última corrección y evitar confirmaciones falsas ante respuestas antiguas o consultas actualizadas? [Consistencia, Spec FR-004, Edge Cases]
- [x] CHK005 ¿Está definido cuándo guardar observaciones y qué ocurre si falta el estado del alumno? [Claridad, Spec FR-007, US3]

## Recuperación y aceptación

- [x] CHK006 ¿Están definidos reintento seguro, cambios rápidos y protección de salida/fecha sin prometer durabilidad offline? [Cobertura, Spec FR-005, FR-008, Assumptions]
- [x] CHK007 ¿Está acotado el marcado masivo para conservar estados y observaciones previas sin depender de búsqueda? [Consistencia, Spec FR-006, US1]
- [x] CHK008 ¿Son medibles la preservación de 30 cambios y la accesibilidad móvil, scroll y ampliación 200 %? [Medición, Spec SC-002, SC-005, FR-012]

## Notas

Revisión asistida autorizada por el usuario con «autorizo» el 2026-10-06, antes de Implement. Ocho puntos revisados y satisfechos contra sus referencias; sin inconsistencias. No valida ejecución ni reemplaza pruebas. Gate: 8/8 PASS.
