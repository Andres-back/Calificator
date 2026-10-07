# Lista de calidad de requisitos: coherencia del estudiante

**Propósito**: revisar claridad y cobertura de autorización, resultados y experiencia móvil antes de implementar.
**Creada**: 2026-10-07
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa aprobación de calidad del requisito, no implementación. Revisión asistida autorizada explícitamente por el usuario: «Sí, revisa y continúa».

## Completitud

- [x] CHK001 ¿Está definido el alcance de soluciones ocultas para actividades y los límites de matrícula, publicación y autoría? [Completitud, Spec §FR-001, §FR-011]
- [x] CHK002 ¿Se distingue explícitamente actividad evaluativa de material de apoyo y se preserva la práctica autorizada? [Claridad, Spec §FR-002, §FR-004]
- [x] CHK003 ¿Se especifica un único lugar para resolver/entregar y el caso de actividad sin evaluación enlazada, sin aparentar guardado local? [Cobertura, Spec §FR-003, §Edge Cases, Plan §Decisiones 2]

## Claridad y consistencia

- [x] CHK004 ¿Se define la misma jerarquía y acción de explicación en ambos boletines, sin controles docentes? [Consistencia, Spec §FR-005, §FR-006, §FR-013]
- [x] CHK005 ¿Se distingue inequívocamente nota pendiente de cero confirmado y acceso de lectura de apertura de nuevos intentos? [Claridad, Spec §Edge Cases, Plan §Decisiones 3]
- [x] CHK006 ¿Se diferencian fallo de consulta, denegación de permisos y ausencia de desglose sin inventar antigüedad, con recuperación definida? [Cobertura, Spec §FR-007, §FR-008, §Clarifications]

## Medición y conservación

- [x] CHK007 ¿Se definen tamaños móviles, claro/oscuro, controles táctiles y ausencia de scroll bloqueado con aceptación medible? [Medición, Spec §FR-009, §SC-005]
- [x] CHK008 ¿Se excluyen cambios a registros, fórmulas, secretos y permisos, y se especifican regresiones y CI antes de merge? [Trazabilidad, Spec §FR-010, §FR-012, §SC-006]

## Notas

Checklist de requisitos, no batería de pruebas. Revisión asistida: 8/8 satisfechos por los apartados referenciados, sin brechas nuevas. El autor docente y apoyo conservan práctica; los resultados distinguen cero, pendiente, error y ausencia. El caso sin evaluación enlazada está en Plan §Decisiones 2/contrato. Implement lee esta lista como gate y no modifica sus marcadores.
