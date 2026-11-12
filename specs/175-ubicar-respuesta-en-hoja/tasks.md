# Tareas: Ubicar la respuesta en la hoja al revisar una calificación

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #370. Aprobados por el usuario el 2026-11-12 (`spec-approved` y `plan-approved` en #370).

### Pruebas primero (RED)

- [X] T001 `backend/tests/unit/test_answer_location.py`: las zonas se guardan fuera de los componentes, la huella de una devolución no cambia, una zona propia no se reemplaza, sin pendientes no se lee, el tercer intento se rechaza, un fallo no guarda ni cuenta, una nota recalificada durante la lectura no se escribe, el contexto no lleva claves, el estudiante no recibe zonas y la ruta existe. RED: el módulo no existía. (FR-003 a FR-008)
- [X] T002 Frontend: `evidenceViewport.test.ts` (recuadro), `GradeEvidenceViewer.test.tsx` (recuadro, reenfoque y alto), `GradeQuestionEvidence.test.tsx` (acción de ubicar y límite), `GradeBreakdown.test.tsx` (respuesta pulsable) y `ubicarRespuestas.test.ts`. (FR-001, FR-002, FR-003, FR-007, FR-009)

### Implementación (GREEN)

- [X] T003 `located_answer_regions` y `location_attempts`; el desglose docente une la zona ubicada a la pregunta que no trae la suya. (FR-004, FR-005)
- [X] T004 `answer_location_service.locate_answers` y `POST /calificaciones/{id}/ubicar-respuestas`. (FR-003, FR-004, FR-006, FR-007, FR-008)
- [X] T005 Recuadro sobre la zona y reenfoque por `focusSignal` en el visor. (FR-001, FR-002)
- [X] T006 Respuesta del estudiante pulsable en la comparación; en teléfono la pantalla baja hasta la hoja. (FR-002)
- [X] T007 «Ubicar respuestas con IA» y sus avisos en el visor de la respuesta; llamada y refresco del detalle. (FR-003, FR-006, FR-007)
- [X] T008 Marco del visor de una respuesta con alto de pantalla desde 1024 px. (FR-009)

### Validación

- [X] T009 Suites de backend y frontend, tipos y lint; comprobación en el navegador a 1440 y 360 px; guardado contra la base local real con una lectura simulada; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-009)

## Dependencias

T001 → T003 → T004. T002 acompaña a T005 a T008. T007 depende de T004. T009 al final.
