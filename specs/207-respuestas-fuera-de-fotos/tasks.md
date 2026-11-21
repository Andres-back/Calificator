# Tareas: Avisar qué respuestas no aparecen en las fotos de la entrega

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #435. Aprobados por el usuario el 2026-11-20: ante la propuesta «avisar claramente cuando faltan respuestas en las fotos» respondió «así es» (`spec-approved` y `plan-approved` en #435).

### Pruebas

- [X] T001 Lectura de preguntas faltantes: con y sin revisión requerida, resultado vacío y valores inválidos. (FR-001)
- [X] T002 Aviso general con preguntas, indicación y destino evidencia; sin aviso genérico de cobertura. (FR-002, FR-003)
- [X] T003 Motivo por pregunta, sin cambios en las demás y sin motivo en preguntas decididas por el docente. (FR-004)
- [X] T004 Aviso sin detalle de preguntas y versión histórica. (FR-005)
- [X] T005 Recorrido con API simulada en 390 px y 1366 px: aviso, botón a la evidencia y motivo de la pregunta. (FR-002, FR-003, FR-004, FR-006)
- [X] T011 Foto sin respuestas: lectura del motivo, todas las preguntas con el motivo, aviso con lo que vio la IA y sin el aviso genérico. (FR-007)
- [X] T012 Recorrido con API simulada de una foto sin respuestas en 390 px y 1366 px, con el aviso al frente. (FR-007, FR-008)

### Implementación

- [X] T006 `missingQuestionsInPhotos` y paso del dato desde la revisión. (FR-001)
- [X] T007 Motivo `missing_in_photos` en la clasificación de preguntas. (FR-004)
- [X] T008 Aviso `faltan_en_fotos` y mensajes. (FR-002, FR-003, FR-005)
- [X] T009 Indicación visible en «Ver todos los avisos». (FR-003)
- [X] T013 `photosWithoutAnswers` y aviso `fotos_sin_respuestas`. (FR-007)
- [X] T014 Aviso al frente del resumen con indicación y botón. (FR-008)

### Validación

- [X] T010 Pruebas del módulo de calificaciones, tipos, lint, inventario y gobernanza. (FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008)

## Dependencias

T001 → T006. T003 → T007. T002 y T004 → T008. T011 → T013. T005, T012 y T014 después de T006 a T009 y T013. T010 al final.
