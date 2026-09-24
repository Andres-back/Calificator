# Tareas: retroalimentación formativa

## Fase 1: Preparación
- [x] T001 Registrar aprobaciones y revisar contexto aislado en specs/047-retroalimentacion-formativa/spec.md y plan.md.

## Fase 2: Fundamentos
- [x] T002 Añadir regresiones de reglas presentes/ausentes/nulas/inválidas, evidencia completa y respaldo con cliente simulado en backend/tests/unit/test_comparator_feedback.py (FR-001, FR-002, FR-003, FR-006; SC-002–004).

## Fase 3: Historia 1 — orientación coherente
- [x] T003 [US1] Transmitir reglas JSON y límites formativos en render_grader_prompt y plantilla de backend/app/modules/calificaciones/agents.py (FR-001–003).
- [x] T004 [US1] Reutilizar constructor en router_grader_agent de backend/app/modules/calificaciones/agents.py sin nuevas llamadas (FR-006; SC-003).

## Fase 4: Historia 2 — calidad interpretable
- [x] T005 [US2] Completar 25 descriptores, ficha y límites académicos en specs/047-retroalimentacion-formativa/rubrica-calidad.md (FR-004, FR-005, FR-007; SC-001).

## Fase 5: Validación local
- [x] T006 Ejecutar pytest de feedback, extracción y pipeline explicable y Ruff; documentar resultados en specs/047-retroalimentacion-formativa/quickstart.md (FR-002–006; SC-002–004).
- [x] T007 Actualizar trazabilidad en specs/README.md y revisar diff de backend/app/modules/calificaciones/agents.py sin cambios ajenos (FR-006).
- [x] T008 Evaluar convergencia y registrar límites/pedidos pendientes en specs/047-retroalimentacion-formativa/tasks.md (FR-001–007).

## Fase 6: Publicación protegida — bloqueada
- [x] T009 Obtener autorización específica para crear issue en Andres-back/Calificator, asociarlo a specs/047-retroalimentacion-formativa/spec.md y plan.md antes de versionado; PR/CI y autorización de despliegue posteriores (Constitución VII–VIII). Issue #94 creado y asociado el 2026-09-19.

## Dependencias y estrategia

T001 → T002 → T003 → T004 → T006 → T007 → T008. T005 es documentación independiente ya preparada. T009 quedó resuelta con el issue #94; T010 mantiene cerradas las puertas de PR, CI y publicación.

MVP: US1, sin nueva UI o llamadas externas. US2 usa registro existente; revisión/calibración académica es condición del piloto definitivo, no prueba de software.

Trabajo paralelo posible: revisión académica de la ficha mientras se prueba el prompt; no se delega automáticamente.

## Resultado de revisión local — 2026-09-18

7 FR, 4 SC, 5 escenarios, 7 decisiones de diseño y 8 principios revisados. Alcance funcional local satisfecho: 87 pruebas aprobadas, 1 omitida por falta de PostgreSQL aislado, Ruff y diff sin errores. Las pruebas son simuladas: no validan calidad pedagógica ni latencia real. La ficha sigue siendo borrador; no se habilitó el estudio ni se cambió frontend. El issue ya está asociado; T010 conserva el control de PR, CI y publicación.

## Phase 7: Convergence

- [x] T010 Verificar la asociación del issue #94, las aprobaciones `spec-approved` y `plan-approved`, y la ejecución de los controles de PR/CI en el PR #127 antes de fusionar, según Constitución VII–VIII. El merge continúa condicionado a CI verde.

## Fase 8: Evolución posterior al primer piloto — issue #137

- [x] T011 [US3] Registrar hallazgos anonimizados, límites y protección de históricos en specs/047-retroalimentacion-formativa/spec.md, plan.md, research.md y rubrica-calidad.md (FR-012; SC-008).
- [x] T012 [US3] Añadir regresiones de transcripción literal y desacuerdo visual en backend/tests/unit/test_vision_extractor.py y backend/tests/unit/test_comparator_feedback.py (FR-008, FR-009; SC-005, SC-006).
- [x] T013 [US3] Reforzar las instrucciones de extracción y verificación independiente en backend/app/services/vision_extractor.py y backend/app/modules/calificaciones/agents.py sin nuevas llamadas de IA (FR-008, FR-011; SC-006, SC-007).
- [x] T014 [US3] Añadir una guarda determinista de coherencia entre componentes, nota y feedback en backend/app/modules/calificaciones/breakdown_policy.py y backend/app/modules/calificaciones/breakdown_service.py (FR-009, FR-010; SC-005).
- [x] T015 [US3] Probar que la guarda mantiene revisión, conserva trazabilidad y no altera calificaciones históricas en backend/tests/unit/test_breakdown_persistence.py (FR-009, FR-010, FR-012; SC-005, SC-007, SC-008).
- [x] T016 Ejecutar pruebas focalizadas, Ruff y git diff --check; documentar resultados en specs/047-retroalimentacion-formativa/quickstart.md.
- [x] T017 Actualizar trazabilidad de specs/README.md, abrir el PR #138 enlazado al issue #137 y ejecutar el control de CI; el merge continúa bloqueado hasta que todos los trabajos estén verdes.
