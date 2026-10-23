# Lista de calidad de requisitos: recuperación de calificación

**Propósito**: revisión previa a implementación del hotfix #253.
**Creada**: 2026-10-23 | **Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` aprueba calidad de requisitos, no implementación.

## Completitud

- [x] CHK001 ¿Se distinguen el tope de 60 segundos por llamada y la espera total con cola/etapas? [Claridad, Spec FR-001/002]
- [x] CHK002 ¿La recuperación conserva las etapas válidas y repite solo el rol/modelo pendiente? [Completitud, Spec FR-003/005]
- [x] CHK003 ¿El máximo de dos intentos incluye reinicios y excluye errores permanentes? [Cobertura, Spec FR-004/SC-004]

## Consistencia y protección

- [x] CHK004 ¿La revisión dual requiere dos roles válidos y distingue cualquier propuesta parcial? [Consistencia, Spec FR-005/006]
- [x] CHK005 ¿Se define la prioridad docente y la conservación de evidencia, notas y permisos? [Cobertura, Spec FR-007]
- [x] CHK006 ¿La compatibilidad del progreso excluye reutilización entre entregas/configuraciones diferentes? [Cobertura, Spec FR-003, casos límite]

## Medición y trazabilidad

- [x] CHK007 ¿Los diagnósticos separan espera de conexión/lectura/plazo total sin datos sensibles ni atribuciones no demostradas? [Claridad, Spec FR-008]
- [x] CHK008 ¿La prueba de veinte entregas es simulada, acotada y mide llamadas/concurrencia/coste normal sin prometer disponibilidad externa absoluta? [Medición, Spec FR-009/SC-001/005]

## Notas

Revisión asistida autorizada explícitamente por el usuario el 2026-10-23: «Sí, revisa y continúa». Los ocho criterios están cubiertos en los requisitos citados y en contratos/recovery.md; sin inconsistencias ni vacíos bloqueantes. No son pruebas de funcionamiento. Implement conserva los marcadores como solo lectura.
