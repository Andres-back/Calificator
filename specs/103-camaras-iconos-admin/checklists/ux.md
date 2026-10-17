# Lista de calidad de requisitos: cámaras e iconos

**Propósito**: revisión previa a implementación, centrada en contexto, recuperación y coherencia visual.
**Creada**: 2026-10-17
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor; aprobar calidad no acredita implementación. El usuario autorizó al agente a revisar esta lista el 2026-10-17.

## Completitud y recuperación

- [x] CHK001 ¿Están definidos selección, nombres alternativos, actualización y recuperación sin/una/varias cámaras? [Completitud, Spec FR-001/FR-003, casos límite]
- [x] CHK002 ¿Se especifican cambios rápidos, respuestas tardías, cierre, segundo plano y conservación de fotos/contexto? [Cobertura, Spec FR-002/FR-005]
- [x] CHK003 ¿Se delimita la duración de la preferencia y la ausencia de audio/persistencia de identificadores? [Claridad, Spec FR-004]

## Coherencia y medición

- [x] CHK004 ¿Están identificadas entradas, cabeceras, tres ilustraciones, fallback y conservación de permisos? [Consistencia, Spec FR-006/FR-007]
- [x] CHK005 ¿Son medibles tamaños, accesibilidad, transparencia y ausencia de envíos automáticos sin equiparar emulación con hardware? [Medición, Spec FR-008, SC-001/SC-004, supuestos]
- [x] CHK006 ¿Se separan la implementación aprobada y la propuesta docente adicional, sin alterar notas, evidencias ni Spec 101? [Límites, Spec FR-005/FR-009, supuestos]

## Notas

La revisión documenta cumplimiento de requisitos, no pruebas realizadas. Implement lee estos marcadores, no los modifica.

Revisión delegada del 2026-10-17: 6/6 satisfechos. CHK001–003 cubiertos por historias/casos límite y contrato de captura; CHK004–005 por FR-006–008 y SC-001–004; CHK006 por FR-009 y propuesta #215. No se detectan inconsistencias ni se acredita implementación.
