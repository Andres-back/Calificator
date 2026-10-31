# Lista de calidad de requisitos: Revisión clara y navegación contextual

**Propósito**: revisar claridad, conservación y cobertura antes del código funcional.
**Creada**: 2026-10-30
**Especificación**: [spec.md](../spec.md)
**Audiencia**: revisor de la entrega; profundidad estándar, énfasis en integridad y experiencia móvil.

> Los marcadores pertenecen al revisor. `[x]` indica calidad revisada del requisito, no implementación terminada. Implement no modifica estos marcadores.

## Completitud y conservación

- [x] CHK001 ¿Está definido qué información se retira de la lectura principal, dónde se conserva y qué avisos deben permanecer visibles? [Completitud, Spec FR-001/FR-002/FR-009]
- [x] CHK002 ¿Son explícitos el vocabulario único y la exclusión de textos guardados por usuarios, campos internos y enlaces históricos? [Consistencia, Spec FR-003, Assumptions]
- [x] CHK003 ¿Se define una sola acción principal por paso de retroalimentación sin perder impresión, copia, permisos o tratamiento de fallos? [Claridad, Spec FR-004/SC-002]
- [x] CHK004 ¿Se especifican los niveles de regreso, selección conservada, destino de enlaces directos y rechazo del contexto contradictorio? [Cobertura, Spec FR-005/FR-006, US2]

## Límites, móvil y proceso

- [x] CHK005 ¿Se distinguen permisos de revisión, materias y bandeja, y se excluye la eliminación del boletín de estudiante? [Completitud, Spec FR-006/FR-007/FR-009, Edge Cases]
- [x] CHK006 ¿Se documenta la muestra limitada de Pendientes sin convertirla en totales por evaluación ni añadir consultas por evaluación? [Claridad, Spec FR-007/SC-005, Research R3]
- [x] CHK007 ¿Son medibles el alcance móvil/escritorio,44px,200%letra, teclado y scroll desde el contenido, con capturas384px diferenciadas de maqueta? [Medición, Spec FR-008/FR-010/SC-004]
- [x] CHK008 ¿Están definidos la sustracción de controles, incrementos, conservación de borradores, rollback de código, pruebas y exclusión de escrituras productivas/IA? [Trazabilidad, Spec FR-009/FR-011/FR-012]

## Notas

Revisión delegada explícitamente por el usuario: «Sí, revísala y continúa». Resultado8/8: cada pregunta está resuelta por las referencias indicadas; plan/contrato precisan permisos separados, muestra6 y vuelta determinista. No es una prueba ejecutada ni aprobación de producción. Se revisó como fase de calidad, antes de Implement; no se marcó durante la ejecución de tareas.
