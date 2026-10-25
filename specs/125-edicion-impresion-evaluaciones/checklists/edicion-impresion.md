# Lista de calidad de requisitos: edición e impresión

**Propósito**: revisar claridad, completitud, consistencia y medición del diseño antes de implementar.
**Creada**: 2026-10-24
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa calidad del requisito aprobada, no implementación o pruebas terminadas. Revisión autorizada y realizada el2026-10-24; no certifica CI ni despliegue.

## Completitud

- [x] CHK001 ¿Quedan definidos los modos de escala, el inicio por dispositivo y la diferencia entre material y documento final, incluyendo lectura/carga fallida? [Completitud, Spec FR-001–FR-002; Historia1]
- [x] CHK002 ¿La navegación de pregunta única, opciones avanzadas, teclado, borrador y conflicto tienen resultados inequívocos sin eliminar funciones? [Cobertura, Spec FR-003–FR-004, FR-015; Historia2]
- [x] CHK003 ¿Letra, espacios, columnas y meta de hojas tienen límites medibles y una salida clara cuando no cabe, sin ocultar o reordenar contenido? [Claridad, Spec FR-005–FR-007; Historia3]

## Claridad y consistencia

- [x] CHK004 ¿Persistencia y versiones distinguen impresión de cambio académico y protegen legacy, claves, notas, entregas, evidencias y exportaciones históricas? [Consistencia, Spec FR-008, FR-012, FR-015; data-model]
- [x] CHK005 ¿Se distinguen decoración, figura académica, transparencia y blanco/negro, con revisión y alternativa real ante capacidad ausente o color significativo? [Claridad, Spec FR-009–FR-011; Historia4]
- [x] CHK006 ¿Quedan explícitos permisos, soluciones privadas, rutas configurables, cero gasto al reutilizar y límites de generación/trabajos sin reintentos ocultos? [Cobertura, Spec FR-012–FR-014; contratos]

## Medición y trazabilidad

- [x] CHK007 ¿Los resultados medibles cubren ambas pantallas, motores, formatos, paginación real, fallos y conservación de datos sin afirmar validaciones aún no realizadas? [Medición, Spec SC-001–SC-007; quickstart]
- [x] CHK008 ¿El alcance distingue esta presentación de Spec124, fija exclusiones y dependencias y permite mapear los quince FR a tareas y pruebas después de aprobación? [Trazabilidad, Spec Supuestos y límites; plan]

## Evidencia de revisión

CHK001–003: Historias1–3 definen entradas/salidas y mínimos; CHK004: modelo distingue legacy/versionado y preserva recalificación; CHK005–006: Historia4/contrato definen semántica, capacidad ausente, autorización y gasto; CHK007–008: SC y quickstart miden resultados y diferencian Spec124. No inconsistencias bloqueantes en los ocho puntos. La aclaración de generar solo texto queda cubierta por acceso a materiales desde borrador, sin llamadas ocultas.
