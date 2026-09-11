# Lista de calidad de requisitos: operabilidad del control de IA

**Propósito**: validar claridad, seguridad, trazabilidad y recuperación de los requisitos antes de implementar
**Creada**: 2026-09-10
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están definidos la capacidad, condición, consumidor y estado editable de cada etapa mostrada al administrador? [Completitud, Spec §FR-003/FR-005]
- [x] CHK002 ¿Están diferenciados disponibilidad de herramienta, permiso del rol, visibilidad del material y selección de IA? [Completitud, Spec §FR-015]
- [x] CHK003 ¿Están definidos los efectos sobre trabajos aceptados, reintentos, recursos históricos y calificaciones al publicar o pausar? [Cobertura, Spec §FR-010/FR-013]

## Claridad y consistencia

- [x] CHK004 ¿Son inequívocas las diferencias entre configuración guardada, resolución efectiva y ejecución observada? [Claridad, Spec §FR-004]
- [x] CHK005 ¿Es consistente la autorización de preferencias personales del docente con la publicación institucional de trabajos futuros? [Consistencia, Spec §FR-011]
- [x] CHK006 ¿Está especificado que los alias históricos no generan herramientas ni configuraciones duplicadas? [Claridad, Spec §FR-012]

## Excepciones y recuperación

- [x] CHK007 ¿Están cubiertos conflicto de versión, restauración, credencial ausente, modelo retirado, proveedor desactivado y caché no disponible? [Cobertura, Spec §FR-008/FR-009 y Casos límite]
- [x] CHK008 ¿Está definida la conducta atómica cuando una dependencia del borrador es inválida o falla la transacción? [Recuperación, Spec §FR-008]
- [x] CHK009 ¿Se especifica qué puede consultar un administrador sobre una configuración docente sin revelar secretos? [Seguridad, Spec §FR-011]

## Medición y accesibilidad

- [x] CHK010 ¿Los requisitos de métricas distinguen muestras, período, éxito, fallo, cola, ejecución, solapamiento y medición humana? [Medición, Spec §FR-016/FR-017]
- [x] CHK011 ¿La experiencia responsive incluye filtros, detalle, diff, confirmación, conflicto y auditoría además de la página inicial? [Cobertura, Spec §FR-020 y SC-008]
- [x] CHK012 ¿Los criterios de éxito permiten demostrar que todo control editable posee consumidor real y prueba de regresión? [Trazabilidad, Spec §SC-006]

## Notas

- Este checklist evalúa la calidad de los requisitos; las pruebas de implementación se describen en `quickstart.md` y `tasks.md`.
- `$speckit-implement` lee estos marcadores, pero no debe modificarlos.
