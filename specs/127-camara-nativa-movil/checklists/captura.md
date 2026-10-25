# Lista de calidad de requisitos: captura móvil

**Propósito**: revisión de claridad, completitud y protección de las hojas antes de implementar.
**Creada**: 2026-10-25
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor: `[x]` aprueba la calidad del requisito, no su implementación. El usuario autorizó esta revisión al aprobar el plan el 2026-10-25.

## Completitud y recuperación

- [x] CHK001 ¿Se distinguen captura móvil, cámara de PC y subida, con actores y límites por consumidor explícitos? [Completitud, Spec §FR-001, FR-008, FR-009, FR-012]
- [x] CHK002 ¿Se definen aceptación, cancelación y ausencia de resultado sin pérdida ni envío automático? [Cobertura, Spec §FR-003, FR-005]
- [x] CHK003 ¿Se especifica añadir o reemplazar una sola posición conservando orden y demás hojas? [Claridad, Spec §FR-004]
- [x] CHK004 ¿Están cubiertos cambios de entrega, A→B→A, desmontaje y deshabilitación sin confundirlos con ocultarse para usar la cámara? [Consistencia, Spec §FR-006, FR-007]

## Compatibilidad, medición y trazabilidad

- [x] CHK005 ¿Se diferencian las preferencias de dispositivo de garantías del navegador, sin decidir solamente por ancho? [Supuestos, Spec §FR-008, Casos límite]
- [x] CHK006 ¿Se conservan formatos, tamaños, calidad, duplicados y permisos sin conversiones o nuevos envíos implícitos? [Integridad, Spec §FR-010, FR-012]
- [x] CHK007 ¿Se cuantifican anchuras, temas, orientaciones y tamaño de controles de la página? [Medición, Spec §FR-011, SC-004]
- [x] CHK008 ¿Se separan las pruebas automatizadas de retorno del archivo de la comprobación física del teléfono, con criterios trazables para los cuatro consumidores? [Trazabilidad, Spec §SC-001, SC-005, Supuestos]

## Notas

Revisión autorizada realizada el 2026-10-25: 8/8 satisfechos contra las referencias indicadas. La generación inicial dejó los ocho marcadores sin aprobar; esta evaluación posterior no declara implementación, CI ni prueba física completos. Implement no cambia sus marcadores.
