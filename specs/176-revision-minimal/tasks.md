# Tareas: Vista por pregunta sin ruido y con la zona siempre a la vista

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #372. Aprobados por el usuario el 2026-11-12: aprobó por adelantado las specs necesarias para dejar hechas estas mejoras (`spec-approved` y `plan-approved` en #372).

### Pruebas primero (RED)

- [X] T001 `GradeQuestionEvidence.test.tsx`: sin cabeceras, con otro tipo o con la lectura fallida se pide la hoja versionada y se conserva la zona; con 409, otra versión u otra hoja no se señala nada. RED: 3 casos fallaban con «No pudimos comprobar». (FR-001, FR-002)
- [X] T002 `evidenceViewport.test.ts` y `GradeEvidenceViewer.test.tsx`: apertura al ancho con tope, visor ampliado a 100 %, barra en una fila con iconos de 44 px e instrucciones ocultas en ordenador. (FR-003, FR-005)
- [X] T003 `GradeBreakdown.test.tsx`: aviso en una línea sin caja, caja para la revisión prioritaria, índice con número y puntos. (FR-004, FR-006)
- [X] T004 `ReviewContextNavigation.test.tsx`: «N por revisar» con pendientes y nada sin ellos. (FR-007)

### Implementación (GREEN)

- [X] T005 Comprobación tolerante en `VersionedEvidence`. (FR-001, FR-002)
- [X] T006 `fitEvidenceWidth` y su uso al abrir el visor de una respuesta sin zona. (FR-003)
- [X] T007 Barra del visor en una fila, controles con icono, instrucciones solo para lectores de pantalla desde 1024 px. (FR-005)
- [X] T008 Aviso «Conviene comprobar» en una línea; índice con número y puntos; recorrido sin fondo en ordenador. (FR-004, FR-006)
- [X] T009 `pendingCount` en la cabecera de la nota. (FR-007)

### Validación

- [X] T010 Suite del frontend, tipos y lint; medición en el navegador a 1440 px; inventario y gobernanza; resultados en `quickstart.md`. (FR-001 a FR-007)

## Dependencias

T001 → T005. T002 → T006, T007. T003 → T008. T004 → T009. T010 al final.
