# Lista de calidad de requisitos: integridad de la cola

**Propósito**: validar que persistencia, recuperación, concurrencia y compatibilidad estén especificadas antes de implementar
**Creada**: 2026-09-12
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están definidos el estado persistido previo al encolado y todos los registros que deben sobrevivir a un fallo de publicación? [Completitud, Spec §FR-001, §FR-006]
- [x] CHK002 ¿Están cubiertos los recorridos individual, online, mixto, modo salón, reemplazo, reintento y lote? [Cobertura, Spec §FR-014]
- [x] CHK003 ¿Están documentadas las responsabilidades que permanecen fuera de esta fase, incluidos inferencia, selección de IA, publicación de notas y UI? [Completitud, Spec §FR-012, §FR-013]

## Claridad y consistencia

- [x] CHK004 ¿Es inequívoco que “un único proceso” significa una identidad lógica reutilizable y no un mensaje de broker que jamás pueda repetirse? [Claridad, Spec §FR-004, §FR-007]
- [x] CHK005 ¿Son consistentes los requisitos de una calificación vigente, un proceso hijo por entrega y un resumen padre? [Consistencia, Spec §FR-003, §FR-004, §FR-005]
- [x] CHK006 ¿Está claramente separado el fallo al publicar del fallo posterior durante la inferencia? [Claridad, Spec §FR-006, Historia 2/AC3]

## Medición y aceptación

- [x] CHK007 ¿Puede medirse objetivamente que la respuesta inicial no espera la inferencia y conserva el estado pendiente? [Medición, Spec §SC-001]
- [x] CHK008 ¿La prueba de 30 entregas y tres docentes define resultados exactos para detectar duplicados y cruces? [Medición, Spec §SC-002]
- [x] CHK009 ¿Los criterios abarcan publicación fallida, republicación y reclamación duplicada con identidad estable? [Cobertura, Spec §SC-003]

## Recuperación, concurrencia y dependencias

- [x] CHK010 ¿Está especificado el comportamiento ante confirmación tardía, trabajo sin mensaje y mensajes duplicados? [Cobertura, Spec §Casos límite]
- [x] CHK011 ¿El aislamiento por docente y la conservación de permisos actuales están definidos tanto para creación como para consulta? [Completitud, Spec §FR-009]
- [x] CHK012 ¿Está documentado que la solución depende de la reclamación atómica y recuperación existentes sin redefinirlas en esta fase? [Supuesto, Spec §Supuestos]

## Notas

- Esta lista revisa la calidad de los requisitos; las pruebas de implementación están en `tasks.md`.
- `$speckit-implement` leerá estos marcadores, pero no debe modificarlos.
