# Tareas: recuperar respuestas manuscritas antes de calificar

- [x] T001 Documentar impacto, reproducción, causa y solución en `specs/069-recuperar-respuestas-manuscritas/` (FR-001–FR-006).
- [x] T002 [US1] Reforzar conservación y búsqueda de lápiz tenue en `backend/app/services/image_preprocessing.py` y `backend/app/services/vision_extractor.py` (FR-001, FR-002, FR-004).
- [x] T003 [US1] Activar contingencia y bloquear cero inconcluso en `backend/app/modules/calificaciones/orchestrator.py` (FR-002, FR-003).
- [x] T004 [US1] Hacer independiente la comprobación visual en `backend/app/modules/calificaciones/agents.py` (FR-004).
- [x] T005 [US2] Permitir reintento seguro de sugerencias pendientes en `backend/app/modules/calificaciones/router.py` y `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` (FR-005, FR-006).
- [x] T006 [US1] Añadir regresiones sintéticas en `backend/tests/unit/test_vision_extractor.py` y pruebas focalizadas del reintento (FR-001–FR-006).
- [x] T007 Ejecutar pruebas focalizadas, validaciones estáticas y `git diff --check`.
- [x] T008 Abrir PR enlazado al issue #143 y aplicar las etiquetas `hotfix` y `spec-approved`.
