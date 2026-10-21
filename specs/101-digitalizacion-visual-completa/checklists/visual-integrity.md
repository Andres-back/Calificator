# Lista de calidad de requisitos: Integridad visual y edición docente

**Propósito**: validar claridad, completitud, consistencia y medición antes de implementar.
**Creada**: 2026-10-15
**Especificación**: [spec.md](../spec.md)
**Audiencia y profundidad**: revisor del cambio; revisión estándar centrada en integridad académica y recorrido móvil.

> Los marcadores pertenecen al revisor. `[x]` significa aprobación de la calidad del requisito, no implementación terminada. Esta lista se genera sin marcar; el agente solo puede evaluarla por petición explícita del revisor.

## Completitud

- [x] CHK001 ¿Está delimitado qué significa conservar «todo», incluyendo PDF mixto, imágenes/tablas nativas y recursos compartidos, sin prometer recuperar contenido nunca capturado? [Completitud, Spec FR-001–005, Supuestos, SC-001/002]
- [x] CHK002 ¿Están definidos carga e IA por pregunta, aceptación previa, edición de celdas/datos, cancelación y límites de figuras no editables? [Completitud, Spec Historia 5, FR-017–019/022]
- [x] CHK003 ¿Los requisitos abarcan vista docente y estudiante, PDF, Word y contexto del calificador/verificador, sin pérdidas entre etapas? [Cobertura, Spec FR-007–010/021, SC-003/004/008]

## Claridad y consistencia

- [x] CHK004 ¿Se distingue claramente original privado contestado de estímulo publicable y se definen permisos y separación de claves/anotaciones en todas las salidas? [Claridad, Spec FR-006/009/014, Plan decisiones 6/9]
- [x] CHK005 ¿Está definida la conservación de versiones y el tratamiento de registros antiguos sin inventar contexto histórico ni recalcular notas al editar? [Consistencia, Spec FR-013/020, Plan decisiones 3/4, data-model §Entrega y calificación]
- [x] CHK006 ¿Se definen omisiones, datos ilegibles, fallos, conflictos, reintentos y limpieza sin convertir falta de contexto en cero ni borrar recursos conservados? [Cobertura, Spec FR-005/011/012/016/018/022, Casos límite]

## Medición y trazabilidad

- [x] CHK007 ¿Son verificables los requisitos móviles y de escritorio, con ampliación, tablas anchas, mensajes comprensibles y distinción entre emulación y dispositivos físicos? [Medición, Spec FR-007/015, SC-005, contracts §Lector y editor]
- [x] CHK008 ¿Están delimitados límites, rendimiento, coste y activación/rollback, con resultados medibles y sin promesas de velocidad no sustentadas? [Trazabilidad, Spec FR-001/012, SC-006, Plan §Contexto técnico y decisión 10, quickstart §Rendimiento]

## Notas

- Revisión autorizada explícitamente por el usuario el 2026-10-15 mediante «aprovado». CHK001–008 satisfechos por las referencias citadas; 8/8 completos. Esto no acredita implementación ni pruebas.
- Spec Kit Implement lee estos marcadores como puerta de entrada, sin cambiarlos.
