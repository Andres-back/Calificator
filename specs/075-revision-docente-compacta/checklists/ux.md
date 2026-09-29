# Lista de calidad de requisitos: revisión docente compacta

**Propósito**: revisar claridad, completitud, consistencia y medición de la experiencia docente antes de implementar.
**Creada**: 2026-09-28
**Especificación**: [spec.md](../spec.md)
**Enfoque**: jerarquía móvil, edición segura y navegación contextual. Profundidad estándar; revisión humana previa a implementación.

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada. Esta lista se genera sin marcas; no sustituye las pruebas de código.

## Completitud

- [x] CHK001 ¿Está definido qué información aparece primero y cuál queda bajo demanda, incluyendo nota, estado, criterios y alertas? [Completitud, Spec FR-001–003, SC-002]
- [x] CHK002 ¿Está especificado el acceso progresivo a evidencia, fórmula, retroalimentación, historial, verificaciones, PQRS, reemplazo, reanálisis y nota manual sin eliminar capacidades? [Completitud, Spec FR-008, SC-007]
- [x] CHK003 ¿Están definidos el acceso desde cada evaluación, el retorno a la materia y las excepciones por rol y estado? [Cobertura, Spec FR-010–012, SC-001]

## Claridad y consistencia

- [x] CHK004 ¿La compactación diferencia respuestas breves de textos extensos y conserva etiquetas, motivo completo y legibilidad? [Claridad, Spec FR-004–005, SC-003]
- [x] CHK005 ¿Se distinguen criterios reales, preguntas y valoraciones históricas sin inventar pesos, relaciones ni valores ausentes? [Consistencia, Spec FR-002, Supuestos; Plan Decisión 5]
- [x] CHK006 ¿Están diferenciados confirmar, ajustar, guardar y publicar, sin atribuir corrección comprobada a la confianza de modelos ni mostrar cero por procesamiento? [Claridad, Spec FR-009, FR-013]

## Cobertura y recuperación

- [x] CHK007 ¿Están especificadas las protecciones del borrador al plegar, cambiar de pregunta o alumno, volver, recibir polling y afrontar un conflicto o error de guardado? [Cobertura, Spec FR-006–007, Casos límite; Plan Decisiones 2–3]
- [x] CHK008 ¿Se cubren enlaces directos, alertas, evidencia multihoja, nota cero real, ausencia de desglose y permisos estudiantiles sin cambios históricos ni inferencias implícitas? [Cobertura, Spec FR-007–009, FR-015–016, Casos límite]

## Medición y trazabilidad

- [x] CHK009 ¿La mejora de espacio y acceso al editor tiene umbrales comparables, conservando texto y controles en vez de achicarlos? [Medición, Spec SC-003–004]
- [x] CHK010 ¿Están definidos resoluciones, temas, tamaño táctil, foco, desplazamiento y límites de la emulación frente al teclado físico? [Medición, Spec FR-014, SC-005; Investigación §Incertidumbres y límites]

## Notas

- Revisión asistida presentada al usuario y aprobada mediante «aprove» el 2026-09-28. Los diez marcadores registran esa aprobación humana, no pruebas ni implementación.
- El usuario pidió revisar esta lista antes de implementar el 2026-09-28. No hay cambios funcionales ni validaciones ejecutadas por generar este documento.
- `$speckit-implement` consulta el estado de esta lista y no modifica sus marcadores. Una aprobación del plan no equivale a marcas de revisión en esta lista.
- Las referencias permiten evaluar los requisitos; las pruebas posteriores comprobarán la implementación, no estos marcadores.
