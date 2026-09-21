# Tareas: conservar respuestas dibujadas al calificar

## Fase 1: Preparación

- [X] T001 Documentar incidente, FR-001–FR-005 y ensayo seguro en `specs/057-drawn-answer-evidence/spec.md`, `plan.md` y `research.md`.

## Fase 2: Fundamentos

- [X] T002 [US1] Añadir prueba de regresión para respuesta textual y dibujo asociado a pregunta/página en `backend/tests/unit/test_vision_extractor.py` según FR-001, FR-002 y FR-004.
- [X] T003 [US1] Añadir pruebas de regresión para pregunta gráfica incierta en `backend/tests/unit/test_photo_grading_failures.py` y `test_grading_component_consensus.py` según FR-003.

## Fase 3: Historia 1 - El dibujo también es una respuesta

**Prueba independiente**: evidencia textual y visual de la foto matemática llega junta a valoración; si el dibujo no se distingue, el caso requiere revisión sin declararlo ausente.

- [X] T004 [US1] Capturar descripción visual literal y conservarla en la respuesta normalizada en `backend/app/services/vision_extractor.py` según FR-001 y FR-002.
- [X] T005 [US1] Señalar incertidumbre gráfica y bloquear cero no verificado en `backend/app/modules/calificaciones/orchestrator.py`, `agents.py`, `breakdown_policy.py` y `breakdown_service.py` según FR-003 y FR-004.

## Fase final: validación

- [X] T006 Ejecutar las regresiones, Ruff e inventario de `specs/057-drawn-answer-evidence/quickstart.md` según FR-005.
- [X] T007 Registrar el hotfix en `specs/README.md` y `tests/spec_governance/test_spec_baseline.py`; comprobar `specs/system-inventory/current.json`.
- [X] T008 Preparar PR y controles CI con protocolo de reensayo productivo sin publicar nota en `specs/057-drawn-answer-evidence/quickstart.md` según FR-005.

## Dependencias y estrategia

T001 precede T002/T003; las dos regresiones preceden T004/T005. T006/T007 preceden T008. El reensayo productivo se ejecuta después del merge, con el resultado registrado en el issue. MVP: una sola descripción visual y revisión honesta, sin alterar modelos ni fórmula.
