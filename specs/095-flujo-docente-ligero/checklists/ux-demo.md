# Lista de calidad de requisitos: flujo docente ligero

**Propósito**: revisar jerarquía visual, identidad de alumnos y conservación durante la demo.
**Creada**: 2026-10-13
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` aprueba calidad de requisitos, no implementación. Lista nueva, profundidad estándar, revisión previa a código; el usuario autorizó revisarla al aprobar el plan.

## Completitud y claridad

- [x] CHK001 ¿Se define qué contexto queda siempre visible y qué información se puede plegar? [Claridad, Spec FR-001, SC-001]
- [x] CHK002 ¿Están delimitadas acciones principales y secundarias por estado/modalidad/permisos, incluyendo borradores? [Completitud, Spec FR-002, SC-002]
- [x] CHK003 ¿Se especifica cómo reconocer filtros activos y conservar búsqueda, selección y exportación? [Cobertura, Spec FR-003]
- [x] CHK004 ¿Se distingue nota vigente, suma, ajuste, aviso activo e historial sin alterar decisiones? [Consistencia, Spec FR-004]

## Aislamiento y recuperación

- [x] CHK005 ¿Están descritos datos mínimos, caducidad, aislamiento y limpieza del contexto de continuación? [Completitud, Spec FR-005, FR-006; Plan Persistencia]
- [x] CHK006 ¿Se definen recuperación ante acceso perdido, cuenta distinta, alumno eliminado y almacenamiento no disponible? [Cobertura, Spec FR-006; Casos límite]
- [x] CHK007 ¿El progreso distingue registro/nota final, duplicados, matrícula actual y datos incompletos? [Claridad, Spec FR-007, SC-004]
- [x] CHK008 ¿La propuesta siguiente exige elección explícita y preserva identidad, hojas, elegibilidad y recuperación ante fallos? [Consistencia, Spec FR-008, FR-011]

## Medición y límites

- [x] CHK009 ¿Terminología, tamaños, pantallas, modos y navegación por teclado tienen criterios verificables? [Medición, Spec FR-009, FR-010, SC-006]
- [x] CHK010 ¿Son explícitos conservación de registros, exclusión de IA/datos reales y autorización de producción? [Límites, Spec FR-011, FR-012, SC-005]

## Notas

No hay hooks ni dudas de alcance que requieran preguntas nuevas. La revisión se realizará como paso separado antes de Implement; no garantiza que el código ya cumpla.

Revisión autorizada realizada el 2026-10-13 como paso separado: 10/10. Cabeceras/acciones/filtros tienen límites de medición; continuación define siete días, cuenta, limpieza y recuperación; progreso/siguiente preservan identidad y no prometen nota final. Sin inconsistencias que exijan modificar el alcance. Implement lee estos marcadores sin modificarlos.
