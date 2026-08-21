# Lista de calidad: transparencia y adopción segura de calificaciones

**Propósito**: validar que los requisitos permiten implementar y revisar una calificación explicable sin alterar silenciosamente el flujo vigente
**Creada**: 2026-08-21
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada. `$speckit-implement` lee este estado y no modifica los marcadores.

## Completitud

- [ ] CHK001 ¿Están definidos todos los campos necesarios para explicar cada punto asignado —respuesta, referencia, puntaje, máximo, estado, evidencia y explicación— en todas las modalidades? [Completitud, Spec §FR-001–FR-010]
- [ ] CHK002 ¿Está definido cuándo un DBA es solo contexto y cuándo una rúbrica puede aportar puntos, incluida la prohibición de duplicar puntaje? [Completitud, Spec §FR-014]
- [ ] CHK003 ¿Están documentados los componentes manuales para ausencia, entrega tardía y nota sin evidencia sin fabricar respuestas? [Cobertura, Spec §FR-029–FR-030]
- [ ] CHK004 ¿Están definidos los datos de auditoría tanto para cambios por componente como para ajustes globales? [Completitud, Spec §FR-020–FR-023]

## Claridad y consistencia

- [ ] CHK005 ¿La fórmula especifica inequívocamente suma, escala, ajuste, límites, precisión y redondeo para reproducir la nota almacenada? [Claridad, Spec §FR-012–FR-015]
- [ ] CHK006 ¿Son consistentes los estados de componente con la regla que impide convertir ilegibilidad, ausencia de hoja o clave incompleta en cero? [Consistencia, Spec §FR-007–FR-009]
- [ ] CHK007 ¿La noción de “discrepancia material” tiene un umbral cuantificado y coherente entre especificación, investigación y plan? [Claridad, Research §4]
- [ ] CHK008 ¿Está diferenciada sin ambigüedad la explicación verificable del motivo interno y de la explicación pedagógica estudiantil? [Claridad, Spec §FR-010–FR-011, FR-020]

## Integridad, roles y privacidad

- [ ] CHK009 ¿Están especificados los datos que puede recibir cada rol y el momento exacto en que un estudiante accede al desglose? [Cobertura, Spec §FR-024–FR-026, FR-032]
- [ ] CHK010 ¿La redacción de claves durante entregas abiertas está definida como obligación del servidor y no solo de presentación visual? [Consistencia, Plan §Verificación de la constitución]
- [ ] CHK011 ¿Los requisitos prohíben explícitamente persistir razonamiento privado, prompts, secretos y campos desconocidos del proveedor? [Completitud, Spec §FR-011]
- [ ] CHK012 ¿La solicitud de revisión queda vinculada a una instantánea y componente publicados sin cambiar automáticamente la nota? [Trazabilidad, Spec §FR-027]

## Excepciones y recuperación

- [ ] CHK013 ¿Están cubiertos duplicados, cobertura incompleta, sumas incoherentes, concurrencia y cancelación de cambios con resultados definidos? [Cobertura, Spec §Casos límite]
- [ ] CHK014 ¿La idempotencia define qué ocurre con reintentos iguales, reintentos nuevos y propuestas ya revisadas por el docente? [Cobertura, Spec §FR-023, FR-031]
- [ ] CHK015 ¿Está definido el comportamiento de notas heredadas sin desglose sin inferencia o backfill artificial? [Claridad, Spec §FR-028]
- [ ] CHK016 ¿El plan de reversión conserva notas y endpoints cuando se desactiva la nueva autoridad de cálculo? [Recuperación, Spec §FR-035]

## Medición y aceptación

- [ ] CHK017 ¿Los criterios de éxito permiten demostrar que todas las notas nuevas se reproducen y que cada componente aparece exactamente una vez? [Medición, Spec §SC-001–SC-003]
- [ ] CHK018 ¿Están cuantificados tiempo docente, acceso estudiantil, tamaños de pantalla y presupuesto de rendimiento? [Medición, Spec §SC-006–SC-012]
- [ ] CHK019 ¿La validación controlada define cómo comparar el motor vigente y el nuevo sin modificar notas oficiales? [Aceptación, Spec §FR-035, Quickstart §Escenarios backend]
- [ ] CHK020 ¿Los requisitos y el plan incluyen una prueba de regresión para cada endpoint actual que seguirá siendo compatible? [Cobertura, Plan §Fase 5]

## Notas

- Este checklist es una puerta formal para revisión de PR enfocada en integridad académica y despliegue progresivo.
- Los elementos permanecen sin marcar porque pertenecen al revisor; la autorización “adelante y no pares” permite continuar la implementación aun con esta revisión pendiente.
