# Lista de calidad de requisitos: rendimiento y estados asíncronos

**Propósito**: validar que los requisitos de velocidad, confiabilidad, transparencia y estados sean completos antes de implementar
**Creada**: 2026-09-03
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [ ] CHK001 ¿Están definidos los resultados visibles para estudiante y profesor durante cola, proceso, reintento, revisión y finalización? [Completitud, Spec §Historia 1, FR-002, FR-033]
- [ ] CHK002 ¿Los requisitos distinguen explícitamente una nota ausente de una nota real igual a cero en todas las superficies? [Completitud, Spec §FR-034–FR-035]
- [ ] CHK003 ¿La cola grupal especifica validación, asociación, aislamiento, recuperación y agregación para los 30 elementos? [Completitud, Spec §Historia 6, FR-026–FR-032]
- [ ] CHK004 ¿La preservación del desglose por respuesta, criterios, confianza y decisión docente está documentada durante la optimización? [Completitud, Spec §FR-015, FR-022]

## Claridad y consistencia

- [ ] CHK005 ¿El término “Calificando” tiene una correspondencia inequívoca con todos los estados transitorios y no se confunde con revisión manual? [Claridad, Spec §Historia 1, FR-033]
- [ ] CHK006 ¿Los requisitos de no abandonar solicitudes lentas son consistentes con los de reintento, recuperación y estados terminales? [Consistencia, Spec §Casos límite, FR-020–FR-021]
- [ ] CHK007 ¿La independencia de estudiantes distintos es consistente con el tratamiento de varias páginas del mismo estudiante como un solo trabajo? [Consistencia, Spec §Historia 6, Supuestos]
- [ ] CHK008 ¿La selección explícita de modelo y las advertencias de eficiencia están diferenciadas sin sustitución silenciosa? [Claridad, Spec §Historia 4, FR-005–FR-007]

## Medición y cobertura

- [ ] CHK009 ¿Los objetivos de calificación, digitalización y presentaciones indican percentil, límite y condiciones de medición? [Medición, Spec §SC-001–SC-003]
- [ ] CHK010 ¿La prueba de 30 evidencias mide pérdida, duplicación, asignación cruzada y continuidad ante un fallo aislado? [Medición, Spec §SC-011–SC-012]
- [ ] CHK011 ¿Los requisitos cubren cierre del navegador, reinicio de worker, saturación, proveedor lento y publicación duplicada? [Cobertura, Spec §Casos límite, FR-003–FR-004]
- [ ] CHK012 ¿Se documenta cómo diferenciar demora interna, tiempo en cola y latencia externa sin registrar contenido sensible? [Cobertura, Spec §FR-001, FR-008, FR-024]

## Riesgos y límites

- [ ] CHK013 ¿Los requisitos prohíben cumplir metas de tiempo reduciendo explicaciones, verificadores o controles de calidad? [Riesgo, Spec §FR-014–FR-016, Supuestos]
- [ ] CHK014 ¿La compatibilidad con trabajos históricos y configuraciones personales está definida para despliegue y reversión? [Cobertura, Spec §FR-023, FR-025]
- [ ] CHK015 ¿El comportamiento ante una presentación válida sin alguna imagen está delimitado sin perder contenido pedagógico? [Edge Case, Spec §Casos límite]
- [ ] CHK016 ¿Los criterios evitan presentar como garantía estadísticas basadas en muestras insuficientes? [Claridad, Spec §Casos límite, FR-024]

## Notas

- Revisión formal previa a implementación; cubre requisitos, no ejecución de pruebas.
