# Lista de calidad de requisitos: revisión docente amplia

**Propósito**: validar claridad, completitud, consistencia y medición de distribución y navegación.
**Creada**: 2026-10-06.
**Especificación**: [spec.md](../spec.md).

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada. La implementación lee los marcadores sin modificarlos.

## Completitud

- [x] CHK001 ¿Están delimitados los módulos y roles afectados, sin cambios de datos o calificación? [Completitud, Spec FR-001, FR-008]
- [x] CHK002 ¿Están definidos nombre, estado, nota y selección como información que debe conservar la lista? [Completitud, Spec FR-002, US1]
- [x] CHK003 ¿Está definido qué información permanece accesible al compactar cabeceras y detalles? [Completitud, Spec FR-004, FR-005]

## Claridad y consistencia

- [x] CHK004 ¿Ancho, filas visibles y altura de cabecera tienen umbrales medibles y condiciones explícitas? [Claridad, Spec SC-001, SC-002]
- [x] CHK005 ¿Es coherente la separación de paneles con una sola vista cuando no hay espacio suficiente? [Consistencia, Spec FR-003, FR-006, Plan decisiones 1–2]
- [x] CHK006 ¿Están especificadas protección de borradores, navegación y límites de permisos al reorganizar? [Claridad, Spec FR-007, US3]

## Medición y cobertura

- [x] CHK007 ¿Están definidos tamaños, temas, táctil, foco y escenarios de desplazamiento? [Medición, Spec FR-009, SC-003, SC-004]
- [x] CHK008 ¿Se cubren nombres largos, listas grandes, error, carga, temporizador, trabajos y publicación sin ocultar controles? [Cobertura, Spec casos límite, Plan decisión 3]
- [x] CHK009 ¿Se distingue lectura sin mutación de acciones explícitas de guardar, confirmar o publicar? [Consistencia, Spec FR-008, SC-005]
- [x] CHK010 ¿Los criterios de aceptación pueden trazarse a tareas y comprobaciones sin usar datos reales? [Trazabilidad, Spec FR-009, Plan verificación proporcional]

## Notas

Revisión asistida autorizada explícitamente por el usuario mediante «AUTORIZO» el 2026-10-06. Diez criterios satisfechos contra las referencias indicadas: límites/permisos, identidad, contenido, medidas, adaptación, borrador, dispositivos, casos especiales, lectura y trazabilidad. Sin contradicciones o huecos de alcance. Los marcadores certifican calidad de requisitos, no código o pruebas; no serán modificados por Implement.
