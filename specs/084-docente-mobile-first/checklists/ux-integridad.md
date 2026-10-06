# Lista de calidad de requisitos: experiencia móvil e integridad docente

**Propósito**: revisión de requisitos antes de implementar, con énfasis en móvil y conservación de datos.
**Creada**: 2026-10-05
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa calidad del requisito revisada, no implementación terminada. Revisión asistida autorizada por el usuario («autorizo», 2026-10-05), contra la especificación y el plan aprobados; no se detectaron inconsistencias.

## Completitud y límites

- [x] CHK001 ¿Está definido el acceso al examen dentro del celular, sin depender del visor externo, y sus alternativas de descarga? [Completitud, Spec FR-001–002, US1]
- [x] CHK002 ¿Se distingue explícitamente selección de criterios de materia, creación de criterio y edición de rúbrica propia? [Claridad, Spec FR-003–004, US2]
- [x] CHK003 ¿Queda definido que editar criterios conserva preguntas, claves, notas, entregas, evidencias e historial sin recalificación automática? [Consistencia, Spec FR-005, US2/AC5]
- [x] CHK004 ¿Se acota la simplificación a las secciones de materia y se distingue información opcional de errores y avisos que deben permanecer visibles? [Completitud, Spec FR-006, US3]

## Recuperación y privacidad

- [x] CHK005 ¿Se describen registro manual/foto, homónimos, asociación existente y recuperación tras pérdida de red sin duplicar identidades? [Cobertura, Spec FR-007, US4 y Edge Cases]
- [x] CHK006 ¿Se distingue impresión de credenciales disponibles de renovación confirmada, incluyendo cuentas internas compartidas y prohibición de recuperar claves personales? [Claridad, Spec FR-008–009, Assumptions]
- [x] CHK007 ¿Están especificados propiedad de materia, permisos y exclusión de gestión administrativa global en alumnos y perfil? [Consistencia, Spec FR-010–011, US4/AC6 y US5/AC5]
- [x] CHK008 ¿Se definen validación de clave actual, correo duplicado, cierre de sesión tras cambio de contraseña y ausencia de mutación parcial? [Cobertura, Spec FR-011–012, US5]

## Medición y experiencia

- [x] CHK009 ¿Son medibles la prioridad móvil, tamaños, objetivos táctiles, scroll, teclado y estados sin información cortada? [Medición, Spec FR-014 y SC-001–007]
- [x] CHK010 ¿Quedan explícitos límites de alcance, pruebas necesarias y prohibición de persistir credenciales o alterar modelos/calificación? [Trazabilidad, Spec FR-013–015, Assumptions]

## Notas

Revisión estándar para autor/revisor antes del desarrollo. Los diez puntos corresponden al alcance y plan aprobados; no constituyen pruebas de ejecución. Se mantiene aparte la lista built-in `requirements.md` (16/16).
