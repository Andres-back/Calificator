# Lista de calidad de requisitos: asistencia y captura docente

**Propósito**: revisión previa de claridad, cobertura y medición del alcance aprobado.
**Creada**: 2026-10-01 | **Especificación**: [spec.md](../spec.md)

Los marcadores pertenecen al revisor: aprobar requisitos no certifica código implementado ni pruebas ejecutadas.

Revisión asistida autorizada explícitamente por el usuario el 2026-10-01: «Sí, revisa la lista y continúa». Resultado: 10/10 criterios satisfechos contra las referencias indicadas; sin cambios de alcance. Esta revisión precede a Implement y no certifica implementación.

## Claridad y completitud

- [x] CHK001 ¿Se define que el resumen participa en el documento en todas las anchuras, sin variantes flotantes? [Claridad, spec FR-001, SC-001; plan decisión 1]
- [x] CHK002 ¿Se distinguen resumen compacto, desglose y ayuda plegados de las reglas globales de guardado que permanecen? [Completitud, spec FR-002–004, SC-003]
- [x] CHK003 ¿Quedan identificados modalidades, permisos y destinos diferentes de captura y consulta? [Consistencia, spec FR-005–006, SC-007; contracts/ui.md]
- [x] CHK004 ¿Se define el envío único como acción explícita y no como envío automático al fotografiar? [Claridad, spec FR-007; US3; plan decisiones 3–4]

## Estados y recuperación

- [x] CHK005 ¿Están especificados análisis pendiente, foto inutilizable y PDF sin páginas conocidas sin inventar estados o conteos? [Cobertura, spec FR-008; plan decisión 6; data-model.md]
- [x] CHK006 ¿Se distinguen aceptación, error y resultado de IA, preservando paquete y destinatario en error? [Cobertura, spec FR-009–010, SC-005–006]
- [x] CHK007 ¿Se cubren doble envío, refetch con borrador, cambio de contexto y resultados tardíos sin relajar protección de salida? [Cobertura, spec casos límite, FR-008–009; plan decisiones 5, 7–9]
- [x] CHK008 ¿Se declara que consulta, historial, publicación y notas anteriores no cambian ni se recalculan por navegar? [Consistencia, spec FR-011, SC-006–007]

## Medición y trazabilidad

- [x] CHK009 ¿Son medibles las cinco anchuras, dos temas, zoom/reflujo, altura inicial y objetivos táctiles, sin confundir densidad con zoom? [Medición, spec FR-012, SC-001–002; quickstart.md casos 1–2]
- [x] CHK010 ¿Está delimitada la medición de cuatro acciones y la cobertura de 30 alumnos, paquetes y permisos en suites existentes? [Trazabilidad, spec SC-003–007; quickstart.md casos 3–9]
