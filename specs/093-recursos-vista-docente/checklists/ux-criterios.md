# Lista de calidad de requisitos: criterios y vista docente

**Propósito**: revisión previa a implementación de claridad, conservación y experiencia docente.
**Creada**: 2026-10-10
**Especificación**: [spec.md](../spec.md)
**Audiencia**: revisor; profundidad estándar, centrada en los tres ajustes aprobados.

> Los marcadores pertenecen al revisor. `[x]` significa calidad de requisitos aprobada, no implementación terminada. Spec Kit genera esta lista sin marcarla; la asistencia del agente para revisarla requiere autorización explícita.

## Completitud y consistencia

- [x] CHK001 ¿Se distingue criterio simple de rúbrica y se definen logro, evidencia, regla, niveles y pesos según corresponda? [Completitud, Spec FR-001–002]
- [x] CHK002 ¿Se documenta cómo conservar criterios docentes y resolver propuestas incompletas o conflictivas sin reemplazo silencioso? [Cobertura, Spec FR-003–005; modelo §Fuentes y precedencia]
- [x] CHK003 ¿Está explícita la conservación de preguntas, claves, grilla, puntajes y registros, sin doble puntuación ni nueva penalización? [Consistencia, Spec FR-004/011; plan §Decisiones]
- [x] CHK004 ¿Se separan recursos de apoyo y evaluativos y se mantiene revisión docente sin llamadas adicionales obligatorias de IA? [Límites, Spec FR-005; plan §Resumen]

## Estados y recuperación

- [x] CHK005 ¿Se distingue ausencia confirmada de reclamos de carga, error y contador positivo con lista vacía en ambas presentaciones? [Cobertura, Spec FR-006–007/SC-003]
- [x] CHK006 ¿Se definen observaciones desplegables, texto existente y conservación de borradores/guardado ante búsqueda, colapso y fallo parcial? [Cobertura, Spec FR-009–010; contratos §Asistencia]

## Medición, acceso y seguridad de datos

- [x] CHK007 ¿La compactación incluye umbral de filas, anchuras, modos de color, legibilidad y tamaño táctil verificables? [Medición, Spec FR-008/SC-004–005]
- [x] CHK008 ¿Se mantienen permisos, aislamiento, protección de soluciones e idempotencia sin reparación retrospectiva ni uso de datos reales en pruebas? [Consistencia, Spec FR-011/SC-006; plan §Constitución]

## Notas

Revisión asistida autorizada expresamente por el usuario («Sí, revisa y continúa») el 2026-10-10. Ocho puntos satisfechos por las referencias indicadas: fuentes/conflictos y puntuación separados; estados de bandeja, borradores y umbrales medibles; permisos y conservación explícitos. No acredita pruebas o cambios funcionales; `$speckit-implement` consulta estos marcadores sin alterarlos.
