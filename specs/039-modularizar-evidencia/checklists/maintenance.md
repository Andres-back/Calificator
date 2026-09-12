# Lista de calidad de requisitos: Modularización segura de evidencia

**Propósito**: validar claridad, completitud y seguridad del corte modular antes de implementarlo
**Creada**: 2026-09-12
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están enumeradas todas las responsabilidades de evidencia incluidas y excluidas? [Completitud, Spec §FR-003–FR-009]
- [x] CHK002 ¿Están documentados los contratos que deben permanecer idénticos para imagen, PDF y multihoja? [Cobertura, Spec §US1–US2]
- [x] CHK003 ¿Los requisitos cubren ruta privada, referencia autorizada y permisos sin relajar seguridad? [Completitud, Spec §FR-001–FR-002]

## Claridad y consistencia

- [x] CHK004 ¿Los límites de página, caché, orientación y errores se describen sin interpretaciones alternativas? [Claridad, Spec §FR-003]
- [x] CHK005 ¿La exclusión de cola, IA y nota es consistente entre historias, requisitos, plan y supuestos? [Consistencia, Spec §FR-008]
- [x] CHK006 ¿La compatibilidad temporal de consumidores internos está acotada a esta extracción? [Claridad, Spec §FR-007]

## Medición y trazabilidad

- [x] CHK007 ¿Los criterios permiten demostrar cero cambios de endpoints, datos y resultados de calificación? [Medición, Spec §SC-002, §SC-004–SC-005]
- [x] CHK008 ¿La propiedad interna única puede comprobarse sin depender de una apreciación subjetiva? [Medición, Spec §FR-006, §SC-003]
- [x] CHK009 ¿Los casos de archivo dañado, página inválida, exceso de páginas y limpieza fallida tienen resultados definidos? [Cobertura, Spec §Casos límite]

## Notas

- Profundidad formal de PR; foco en integridad de evidencia y preservación del flujo estable.
