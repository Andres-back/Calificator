# Lista de calidad de requisitos: boletín docente en mosaico

**Propósito**: revisión previa de claridad, cobertura y conservación de datos; profundidad estándar, destinada al revisor antes de implementar.
**Creada**: 2026-10-08
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa aprobación de calidad de requisitos, no implementación. El agente solo puede asistir con la revisión mediante autorización explícita. Implement lee estos marcadores sin cambiarlos.

## Completitud y claridad

- [x] CHK001 ¿Están delimitados docente, materia, padrón y permisos, sin modificar la vista estudiante? [Completitud, Spec §FR-001, §FR-010]
- [x] CHK002 ¿Se distinguen claramente el resumen filtrado del mosaico y el boletín completo del alumno, sin ocultar evaluaciones por el filtro? [Claridad, Spec §FR-003, §FR-004]
- [x] CHK003 ¿Está definida la jerarquía compacta de ficha, nombre completo e identificación de homónimos sin desplegar todos los detalles? [Claridad, Spec §FR-002, Historia 1]

## Consistencia y recuperación

- [x] CHK004 ¿Está documentado el significado de notas, sugerencias, publicación, ausencia y procesamiento, preservando cero real y precisión? [Consistencia, Spec §FR-005, modelo de lectura]
- [x] CHK005 ¿Se diferencian carga, ausencia y error parcial, con recuperación que no declare un boletín incompleto como completo? [Cobertura, Spec §FR-009, Casos límite]
- [x] CHK006 ¿Se especifican conservación de búsqueda/filtros/posición/foco y descarte de selección al cambiar contexto o autorización? [Cobertura, Spec §FR-007, Casos límite]

## Medición y conservación

- [x] CHK007 ¿Son medibles los requisitos de celular, desplazamiento, accesibilidad y velocidad de selección con 30 alumnos? [Medición, Spec §FR-008, §SC-001, §SC-003, §SC-005]
- [x] CHK008 ¿Están explícitas la consulta sin escrituras, explicación y exportación compatibles, y conservación de registros, fórmulas y permisos? [Trazabilidad, Spec §FR-006, §FR-010, §SC-006]

## Notas

- Revisión asistida autorizada expresamente por «autorizo» el 2026-10-08: 8/8 puntos satisfechos. Alcance de consulta, filtros, estados, contexto, celular y conservación definidos en las referencias citadas; ninguna incoherencia detectada. No significa implementación completa.
- Foco: jerarquía móvil y lectura fiel/segura. No pide una nueva funcionalidad ni sustituye las pruebas previstas.
