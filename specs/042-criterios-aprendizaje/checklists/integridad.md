# Lista de calidad de requisitos: integridad pedagógica y transición

**Propósito**: validar que los requisitos protegen la autoridad docente, las notas históricas, la privacidad y la adopción progresiva antes de implementar
**Creada**: 2026-09-13
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud pedagógica

- [ ] CHK001 ¿Están documentadas tanto la creación manual como la creación asistida sin obligar a usar IA, material o estándares oficiales? [Completitud, Spec §FR-001–FR-003]
- [ ] CHK002 ¿Está especificada la información mínima de intención docente necesaria para distinguir qué se enseñó de qué se evaluará? [Claridad, Spec §FR-003–FR-005]
- [ ] CHK003 ¿Están definidos los atributos observables, evidencia esperada, peso o puntaje y procedencia de cada criterio? [Completitud, Spec §FR-005]
- [ ] CHK004 ¿Los requisitos distinguen de manera consistente criterio, rúbrica, actividad, material de apoyo y estándar oficial? [Consistencia, Spec §FR-010–FR-011, FR-017, FR-022]
- [ ] CHK005 ¿Está establecido qué ocurre cuando el material contradice la intención docente o no alcanza para proponer criterios confiables? [Cobertura, Spec §FR-004, FR-015, FR-019]

## Autoridad, aprobación y versiones

- [ ] CHK006 ¿La aprobación humana está definida como una compuerta inequívoca para toda propuesta asistida y no solo para evaluaciones nuevas? [Claridad, Spec §FR-009, SC-002]
- [ ] CHK007 ¿Están especificadas todas las operaciones permitidas antes de aprobar y la prohibición de modificar una versión aplicada? [Completitud, Spec §FR-006–FR-009, FR-012]
- [ ] CHK008 ¿La creación de una versión posterior y su efecto sobre consumidores nuevos e históricos está descrita sin ambigüedad? [Consistencia, Spec §FR-012, FR-023]
- [ ] CHK009 ¿Están definidos los bloqueos de aprobación para criterios incompletos, pesos, puntajes, fuentes y cobertura insuficiente? [Cobertura, Spec §FR-008–FR-009]
- [ ] CHK010 ¿Está documentado que archivar o eliminar lógicamente no puede borrar snapshots, notas ni explicaciones ya emitidas? [Gap, Spec §FR-012, FR-023]

## Calificación explicable

- [ ] CHK011 ¿El detalle exigido por respuesta incluye evidencia, criterio/versionado, máximo, otorgado y una explicación específica? [Completitud, Spec §FR-013, SC-003]
- [ ] CHK012 ¿La igualdad entre componentes explicados, nota sugerida y escala está expresada de forma objetivamente medible? [Medición, Spec §FR-014, SC-003]
- [ ] CHK013 ¿Está explícito que asociar varios criterios a una respuesta no puede duplicar el puntaje? [Gap, Spec §FR-013–FR-014]
- [ ] CHK014 ¿La revisión manual por evidencia insuficiente cubre texto ilegible, páginas faltantes, contradicciones y cobertura parcial? [Cobertura, Spec §FR-015, SC-004]
- [ ] CHK015 ¿Los requisitos de ajuste manual preservan propuesta original, motivo, actor, fecha y efecto en publicación/PQRS? [Completitud, Spec §FR-016]

## Privacidad, permisos y datos

- [ ] CHK016 ¿La privacidad por defecto y la condición exacta para exponer una fuente al estudiante están definidas para todos los tipos de fuente? [Claridad, Spec §FR-018]
- [ ] CHK017 ¿Los límites de profesor propietario, profesor ajeno, estudiante y administrador están especificados para metadatos, contenido, descarga y edición? [Cobertura, Spec §FR-020, SC-007]
- [ ] CHK018 ¿Está documentada la retención o eliminación de archivos, texto extraído y fragmentos cuando falla, se reemplaza o se archiva una fuente? [Gap, Spec §FR-018–FR-020]
- [ ] CHK019 ¿La compatibilidad con DBA define preservación de vínculos e históricos sin convertir automáticamente el catálogo oficial en criterio calificable? [Consistencia, Spec §FR-017, SC-005]

## Recuperación, transición y medición

- [ ] CHK020 ¿El borrador recuperable define estados visibles, reintento, idempotencia y ausencia de duplicados después de fallos parciales? [Cobertura, Spec §FR-019, Casos límite]
- [ ] CHK021 ¿La transición histórica exige conservar UUID, snapshots, fórmulas, notas, desglose, publicación y PQRS sin recalcular? [Completitud, Spec §FR-023, SC-009]
- [ ] CHK022 ¿El rollback y la activación progresiva están especificados para que deshabilitar la función no borre datos nuevos ni afecte calificaciones existentes? [Gap, Plan §Fases de implementación, Riesgos y reversión]
- [ ] CHK023 ¿Los requisitos separan de manera medible tiempo activo docente, espera automática, edición y aprobación? [Medición, Spec §FR-024, SC-001, SC-010]
- [ ] CHK024 ¿Los estados y recorridos responsivos incluyen carga, vacío, procesamiento, error, recuperación, borrador, aprobación y solo lectura? [Cobertura, Spec §FR-021, SC-006]

## Notas

- Esta lista evalúa la calidad del requisito, no el funcionamiento del código.
- `$speckit-implement` consulta estos marcadores, pero no puede aprobarlos en nombre del revisor.
- El usuario autorizó el 2026-09-27 continuar con la simplificación guiada mientras estos 24 controles se validan progresivamente. Los marcadores permanecen sin alterar y siguen siendo compuerta antes del despliegue.
