# Lista de calidad de requisitos: recursos pedagógicos

**Propósito**: validar claridad, completitud, consistencia y medición de los requisitos pedagógicos y de consolidación  
**Creada**: 2026-08-28  
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [ ] CHK001 ¿Están especificadas las secciones obligatorias y el propósito diferencial de los cuatro formatos prioritarios? [Completitud, Spec §FR-003–FR-006]
- [ ] CHK002 ¿Está documentado el ciclo completo desde creación hasta edición, vista previa, exportación y asignación sin ampliar el alcance de publicación? [Cobertura, Spec §FR-008, §FR-013]
- [ ] CHK003 ¿Están definidas las reglas de compatibilidad para cada formato retirado de nuevas creaciones? [Completitud, Spec §FR-001–FR-002]
- [ ] CHK004 ¿Las reglas distinguen respuestas literales, evidencias y criterios de logro según el tipo de actividad? [Completitud, Spec §FR-004–FR-005]

## Claridad y consistencia

- [ ] CHK005 ¿La diferencia entre guía, taller, lectura y plan puede determinarse sin depender de ejemplos implícitos? [Claridad, Spec §Historia 2]
- [ ] CHK006 ¿Los términos “sesión”, “semana”, “punto”, “actividad” y “pregunta” se usan consistentemente entre requisitos y modelo? [Consistencia, Spec §FR-003–FR-007]
- [ ] CHK007 ¿La consolidación de ficha con taller es consistente con la obligación de conservar materiales históricos? [Consistencia, Spec §FR-001–FR-002, Supuestos]
- [ ] CHK008 ¿La separación entre plan docente y refuerzo personal de Xali está expresada como límite de alcance inequívoco? [Claridad, Spec §Supuestos]

## Medición y trazabilidad

- [ ] CHK009 ¿La expresión “cantidad solicitada” tiene criterios verificables para cantidades pequeñas que no permiten incluir todos los niveles de lectura? [Claridad, Spec §FR-004, §FR-007]
- [ ] CHK010 ¿La completitud de cada formato puede medirse con las reglas documentadas sin juicio subjetivo no declarado? [Medición, Spec §FR-003–FR-006]
- [ ] CHK011 ¿La paridad entre vista, edición y PDF tiene un resultado observable para cada sección y audiencia? [Medición, Spec §FR-008–FR-009]
- [ ] CHK012 ¿Cada requisito funcional está enlazado con al menos una historia, aceptación o caso límite? [Trazabilidad, Spec §Historias 1–4]

## Escenarios y riesgos

- [ ] CHK013 ¿Los requisitos cubren respuestas incompletas, proveedor no disponible, reintento y rechazo final sin persistencia parcial? [Cobertura, Spec §Historia 4, §FR-010–FR-011]
- [ ] CHK014 ¿Está definido el comportamiento para materiales históricos con estructuras parciales o campos antiguos? [Cobertura, Spec §Casos límite, §FR-002]
- [ ] CHK015 ¿Las reglas de ocultamiento de soluciones cubren vista web, edición docente y ambas versiones PDF? [Cobertura, Spec §Historia 3, §FR-009]
- [ ] CHK016 ¿La accesibilidad especifica anchos, ausencia de desbordamiento y disponibilidad de controles táctiles? [Completitud, Spec §FR-014, §SC-007]

## Dependencias y supuestos

- [ ] CHK017 ¿Está documentado que DBA y rúbrica permanecen opcionales e independientes para todos los formatos? [Assumption, Spec §FR-012]
- [ ] CHK018 ¿Está justificada la decisión de no migrar ni eliminar contenido histórico? [Assumption, Spec §Supuestos]
- [ ] CHK019 ¿El límite de un intento principal y una recuperación es consistente con los criterios de no duplicación y experiencia visible? [Consistencia, Plan §Contexto técnico]

## Notas

- Este checklist evalúa la calidad de los requisitos; no sustituye las pruebas de implementación.
- `$speckit-implement` lee este artefacto y no modifica sus marcadores.
