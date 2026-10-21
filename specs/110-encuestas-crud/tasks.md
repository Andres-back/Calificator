# Tareas: CRUD administrativo de encuestas

## Fase 1: Preparación

- [x] T001 Registrar aprobación humana y revisar requisitos/contratos de specs/110-encuestas-crud/ antes de implementar (FR-001–011).

## Fase 2: Fundamentos

- [x] T002 Crear regresiones sintéticas de migración, integridad, permisos e idempotencia en encuesta-docente/tests/test_administration.py (FR-002/004/006/009).
- [x] T003 Implementar migración aditiva, proyección y comandos transaccionales en encuesta-docente/administration.py e integrar inicialización en app.py (FR-002/004/006).

## Fase 3: Historia 1 — Registro y consulta

- [x] T004 [US1] Integrar consulta administrativa autenticada y estado en encuesta-docente/app.py (FR-001/009).
- [x] T005 [US1] Añadir registro mediante formulario y controles de consulta/original/historial en encuesta-docente/public/admin.html y admin.js (FR-001/010).

## Fase 4: Historia 2 — Correcciones

- [x] T006 [US2] Validar parches con contexto original y rechazar campos protegidos en encuesta-docente/administration.py (FR-003/004).
- [x] T007 [US2] Integrar POST protegido y exportación corregida separada en encuesta-docente/app.py (FR-006/008/009).
- [x] T008 [US2] Crear editor tipado, motivo, historial y recuperación de errores en encuesta-docente/public/administration.js (FR-003/004/006/010).

## Fase 5: Historia 3 — Papelera

- [x] T009 [US3] Implementar retirada/restauración confirmadas y pruebas de transición en encuesta-docente/administration.py y tests/test_administration.py (FR-005/006).
- [x] T010 [US3] Separar activas/retiradas e informes originales por versión en encuesta-docente/app.py y public/admin.js (FR-007/008).
- [x] T011 [US3] Añadir papelera, confirmación y restauración accesibles en encuesta-docente/public/admin.html, administration.js y styles.css (FR-005/010).

## Fase final: Validación

- [x] T012 Subir software a 5.1.0 e incluir módulo en encuesta-docente/measurement.py y Dockerfile, sin modificar instrumentos (FR-011).
- [x] T013 Ejecutar regresiones Python/Node, migración repetida y concurrencia; documentar resultados en specs/110-encuestas-crud/quickstart.md (FR-002–009).
- [x] T014 Comprobar ambos paneles Chromium/WebKit desde 360 px y escritorio; construir y probar imagen aislada; registrar en specs/110-encuestas-crud/quickstart.md (FR-001/010/011).
- [x] T015 Actualizar inventario con scripts/build_system_inventory.py y verificar gobernanza; registrar convergencia en specs/110-encuestas-crud/tasks.md (FR-011).
- [x] T016 Preparar PR enlazado al issue #228 con evidencia y limitaciones en specs/110-encuestas-crud/quickstart.md; no fusionar con CI pendiente o rojo.

## Dependencias y estrategia

T001 → T002 → T003. US1: T004/T005 tras fundamentos; US2: T006/T007/T008 tras consulta; US3: T009/T010/T011 tras fundamentos y antes de validación final. T012–T016 al terminar las tres historias. Primero pruebas y módulo, luego integración y UI; entrega conjunta para no publicar acciones incompletas. Las pruebas de lectura y editor pueden ejecutarse independientemente sobre sus muestras una vez disponibles los contratos. No se paralelizan modificaciones de app.py/admin.js.

Cobertura: 11/11 requisitos y 5/5 resultados asociados a tareas; no implica pruebas superadas. Lista requirements.md: 16/16 requisitos de calidad revisados, sin pendientes; no hay hooks de extensiones. Análisis previo: sin contradicciones ni requisitos sin tarea; permisos, conservación, versiones y rollback explícitos. Aprobación recibida; no se precisa ampliar alcance.

## Phase 6: Convergence

- [x] T017 Conservar el procedimiento explícito de supresión del custodio en encuesta-docente/manage.py y probarlo con eventos sintéticos en tests/test_administration.py; la nueva FK no debe impedir el procedimiento existente (FR-005, plan: compatibilidad de datos; partial).

### Trazabilidad explícita

| Requisito | Tareas |
|-----------|--------|
| FR-001 | T004, T005, T014 |
| FR-002 | T002, T003, T013 |
| FR-003 | T006, T008, T013 |
| FR-004 | T002, T003, T006 |
| FR-005 | T009, T011, T017 |
| FR-006 | T003, T007, T008, T013 |
| FR-007 | T010, T013 |
| FR-008 | T007, T010, T013 |
| FR-009 | T002, T004, T007 |
| FR-010 | T005, T008, T011, T014 |
| FR-011 | T012, T015, T016 |

## Fase 7: Reparación de CI autorizada

- [x] T018 Añadir una regresión de carga diferida del inicio en frontend/e2e/materia-queue-mobile.spec.ts, corregir la preparación de navegación en frontend/e2e/fixtures/explainableGrading.ts, verificar regresión/materia/cola y preparar la nueva ejecución completa de CI; registrar evidencia y consumidores adicionales en quickstart.md. No reducir controles ni cambiar la app productiva (FR-012). Fusión bloqueada hasta que todos los controles remotos terminen verdes.
