# Lista de calidad de requisitos: calificación clara

**Propósito**: revisar claridad de mensajes, distribución móvil e integridad antes de implementar.
**Creada**: 2026-10-06.
**Especificación**: [spec.md](../spec.md). **Plan**: [plan.md](../plan.md).

> Los marcadores pertenecen al revisor. `[x]` aprueba calidad del requisito, no certifica implementación. Generada sin marcar; Implement solo consulta estas marcas.

## Claridad y consistencia

- [x] CHK001 ¿Está definida la diferencia entre estado vigente, aviso general y alerta individual, incluso en una nota confirmada/publicada? [Consistencia, Spec FR-001–002; H1]
- [x] CHK002 ¿Están especificados mensaje y siguiente acción para motivos conocidos y desconocidos sin perder la traza original? [Completitud, Spec FR-003; contratos §Mensajes]
- [x] CHK003 ¿La simplificación mantiene explícita la diferencia entre puntos, nota proporcional, nota vigente y ajuste docente? [Claridad, Spec FR-004; H3]

## Experiencia y casos límite

- [x] CHK004 ¿Se define qué se ve primero y qué se abre bajo demanda, sin añadir pantallas obligatorias ni esconder advertencias? [Claridad, Spec FR-005–006; plan §Distribución]
- [x] CHK005 ¿Están especificados cinco tamaños, dos temas, foco, scroll, controles táctiles de 44 px y ausencia de contenido tapado? [Medición, Spec FR-007; SC-003]
- [x] CHK006 ¿Están cubiertos datos históricos, ausencia de desglose/evidencia, procesamiento, cero legítimo y edición pendiente/conflicto? [Cobertura, Spec §Casos límite; plan §Validación]

## Integridad y verificación

- [x] CHK007 ¿Quedan fuera del cambio cálculo, modelos, notas guardadas, políticas de publicación y permisos, sin mutaciones por lectura? [Límites, Spec FR-008; contratos §Seguridad]
- [x] CHK008 ¿Cada resultado requerido tiene aceptación y pruebas trazables, y la validación con docentes reales está separada de CI? [Trazabilidad, Spec FR-009; SC-001–005; quickstart]

## Notas

Revisión asistida autorizada por el usuario el 2026-10-06. Ocho criterios satisfechos contra alcance y plan aprobados, sin inconsistencias: CHK001–003 estados/mensajes/cálculo; CHK004–006 progresividad/dispositivos/casos límite; CHK007–008 integridad y validación separada. No certifica implementación. Implement consulta estas marcas sin alterarlas.
