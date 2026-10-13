# Lista de calidad de requisitos: creación en dos pantallas

**Propósito**: revisar simplicidad, control docente y recuperación antes del código.
**Creada**: 2026-10-13
**Especificación**: [spec.md](../spec.md)

> Marcadores del revisor: `[x]` aprueba calidad de requisitos, no implementación. Generada sin marcar; el usuario autorizó su revisión separada al aprobar el plan.

## Claridad y completitud

- [x] CHK001 ¿Están delimitadas dos pantallas IA y la entrada común sin tercera etapa obligatoria? [Claridad, FR-001, FR-002, SC-001]
- [x] CHK002 ¿Se especifican contexto heredado, nombre editable y defaults solo para creaciones nuevas? [Completitud, FR-003, FR-004, Supuestos]
- [x] CHK003 ¿Se define la conservación de tipos/criterios y el resumen de personalización plegada sin selección automática? [Consistencia, FR-004, FR-005, SC-003]
- [x] CHK004 ¿Están definidos revisión de respuestas, puntajes, rúbrica y acceso a correcciones/avisos relevantes? [Cobertura, FR-007, FR-009]

## Integridad y recuperación

- [x] CHK005 ¿Se distingue generar borrador, guardar cambios y publicar, sin presentar ediciones locales como documentos guardados? [Claridad, FR-006, FR-008, Supuestos]
- [x] CHK006 ¿Se preservan estado histórico, guardado diferencial, permisos y registros académicos? [Consistencia, FR-009, FR-013, SC-005]
- [x] CHK007 ¿Están definidos recuperación de seis etapas, cuenta/materia, TTL, reselección y almacenamiento denegado? [Cobertura, FR-010, Casos límite, SC-004]
- [x] CHK008 ¿Se especifican espera, fallo, doble envío, ID eliminado/revocado y conflicto sin sobrescritura? [Completitud, FR-006, FR-009, Casos límite]

## Medición y límites

- [x] CHK009 ¿Se cuantifican pantallas, tamaño táctil, scroll/foco y separación entre motor probado y dispositivo físico? [Medición, FR-012, SC-006]
- [x] CHK010 ¿Son explícitos ayuda a petición, ausencia de llamadas IA por navegar y controles de entrega/demo? [Límites, FR-011, FR-014]

## Notas

Lista nueva, profundidad estándar, revisor antes de implementación; foco UX y conservación. Sin hooks ni preguntas adicionales de alcance. Implement lee la lista sin cambiar marcadores.

Revisión separada autorizada realizada el 2026-10-13: 10/10. Alcance de dos pantallas solo IA, defaults nuevos, selección y edición histórica, recuperación v7 y controles de entrega están delimitados y medibles. Sin inconsistencias pendientes ni permiso para alterar producción.
