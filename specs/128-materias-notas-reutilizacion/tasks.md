# Tareas: materias, notas exportables y evaluación reutilizable

Spec/plan y revisión de requisitos autorizados por el usuario el 2026-10-25. Sin fusión/despliegue autorizados.

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisar requisitos en specs/128-materias-notas-reutilizacion/checklists/integridad-ux.md; comprobar hooks e ignorados.
- [x] T002 Analizar cobertura de spec/plan/tasks y registrar resultado en specs/128-materias-notas-reutilizacion/quickstart.md antes de implementar.

## Fase 2: Fundamentos

- [x] T003 Comprobar permisos/política de intentos y preparar datos sintéticos en frontend/src/modules/materias/GradebookExport.test.tsx y backend/tests/unit/test_calificaciones_boletin_permissions.py.

## Fase 3: Historia 1 — CSV fiable (P1)

Prueba independiente: comparar celdas del archivo real con muestra mixta de notas/estados, sin escritura académica. FR-001–006, FR-016–018, SC-001–002/005.

- [x] T004 [US1] Añadir regresiones final/provisional/cero/homónimos/contexto en frontend/src/modules/materias/GradebookExport.test.tsx y gradebookExportModel.test.ts.
- [x] T005 [US1] Crear modelo independiente con intentos vigentes, orden alfabético y CSV seguro en frontend/src/modules/materias/gradebookExportModel.ts.
- [x] T006 [US1] Añadir modo, conteos, vista previa y cancelación por actor/contexto en frontend/src/modules/materias/GradebookExport.tsx sin cambiar gradebookModel.ts.
- [x] T007 [US1] Verificar descarga real de archivo y ambos temas/anchuras en frontend/e2e/gradebook-export.spec.ts y configuraciones CI efectivas.
- [x] T008 [US1] Ejecutar pruebas de solo_lectura/política vigente en backend/tests/unit/test_calificaciones_boletin_permissions.py y registrar resultados en specs/128-materias-notas-reutilizacion/quickstart.md.

## Fase 4: Historia 2 — Materias (P2)

Prueba independiente: editar, archivar, consultar/exportar y restaurar conservando expediente; carreras/cupo/ACL. FR-007–010/016–018, SC-003/005.

- [x] T009 [US2] Añadir regresiones conservación/cupo/archivo/ACL en backend/tests/unit/test_materias_service.py y backend/tests/integration/test_materia_lifecycle.py.
- [x] T010 [US2] Centralizar transiciones y bloqueo/cupo/auditoría en backend/app/modules/materias/service.py, schemas.py y router.py, compatible con PATCH.
- [x] T011 [US2] Cerrar admisión a materias archivadas en backend/app/modules/matriculas/service.py y entradas de evaluaciones/calificaciones; conservar trabajos ya aceptados.
- [x] T012 [US2] Añadir edición/archivo/restauración y filtros en frontend/src/modules/materias/api.ts, MateriasListPage.tsx, MateriaVistaGeneral.tsx y componentes compartidos.
- [x] T013 [US2] Añadir regresiones UI y flujo responsive/temas en frontend/src/modules/materias/MateriasListPage.test.tsx y frontend/e2e/materia-lifecycle.spec.ts.
- [x] T014 [US2] Ejecutar persistencia/concurrencia aisladas y documentar conservación en specs/128-materias-notas-reutilizacion/quickstart.md.

## Fase 5: Historia 3 — Copiar evaluación (P2)

Prueba independiente: copiar lectura/preguntas/figuras/clave/formato; guardar/reabrir/exportar; editar sin modificar origen; fallos no dejan copia incompleta. FR-011–018, SC-004–005.

- [x] T015 [US3] Añadir contratos/ACL/idempotencia/integridad de copia en backend/tests/integration/test_evaluation_copy.py con archivos sintéticos.
- [x] T016 [US3] Reutilizar operación durable ai_jobs sin cambio de esquema en backend/app/modules/evaluaciones/copy_service.py; comprobar compatibilidad y ausencia de llamadas de configuración IA en backend/tests/integration/test_evaluation_copy.py.
- [x] T017 [US3] Implementar snapshot/remapeo editorial de lectura, preguntas, criterios, recursos, DBA y formato en backend/app/modules/evaluaciones/copy_service.py.
- [x] T018 [US3] Implementar staging/compensación/reanudación de archivos y trabajo sin IA en backend/app/modules/evaluaciones/copy_worker.py y registro de workers existente.
- [x] T019 [US3] Exponer solicitud/progreso privado con permisos/versiones en backend/app/modules/evaluaciones/copy_router.py y copy_schemas.py e integrar router y tipo de trabajo existentes, sin modelos nuevos.
- [x] T020 [US3] Crear diálogo/API compartido en frontend/src/modules/evaluaciones/EvaluationCopyDialog.tsx y api.ts; integrar MateriaEvaluaciones.tsx y EvaluacionesPage.tsx.
- [x] T021 [US3] Añadir regresiones UI y flujo de copia en frontend/src/modules/evaluaciones/EvaluationCopyDialog.test.tsx y frontend/e2e/evaluation-copy.spec.ts.
- [x] T022 [US3] Verificar persistencia/ACL/caídas/hash/compatibilidad sin cambio de esquema y exportación PDF/Word sintética en backend/tests/integration/test_evaluation_copy.py y specs/128-materias-notas-reutilizacion/quickstart.md.

## Fase final: Validación

- [x] T023 Actualizar specs/003-usuarios-materias-matriculas, specs/005-evaluaciones, specs/007-entregas-estudiante, specs/008-calificaciones y Specs090/101/113/125 responsables con contratos implementados, índice e inventario scripts/build_system_inventory.py.
- [x] T024 Ejecutar TypeScript/lint/Vitest/backend/E2E/build/auditorías/gobernanza y registrar comandos/resultados reales en specs/128-materias-notas-reutilizacion/quickstart.md.
- [x] T025 Ejecutar Converge, resolver brechas y marcar solo tareas verificadas en specs/128-materias-notas-reutilizacion/tasks.md; preparar entrega/PR sin fusionar ni desplegar.

## Dependencias y estrategia

T001→T002→T003 bloquean historias. US1 primero como incremento mínimo; US2 después; US3 usa cierre de admisión de US2. Cada historia es validable independientemente con sus datos sintéticos. T023–025 requieren las tres. Ejemplos de trabajo paralelo posible (sin exigir agentes): pruebas de modelo y formato de US1 en archivos separados; regresiones backend y UI de US2; contratos backend y UI de US3 tras estabilizar contratos. No se marcan [P] mientras dependen de fundamentos incompletos. 25 tareas: 3 preparación/fundamentos, 5 US1, 6 US2, 8 US3, 3 validación.

## Trazabilidad explícita

FR-001: T004–007. FR-002: T004–008. FR-003: T004–008. FR-004: T004–007. FR-005: T004–007. FR-006: T004–008.
FR-007: T009–014. FR-008: T009–014. FR-009: T009–014. FR-010: T009–014.
FR-011: T015–022. FR-012: T015–022. FR-013: T015–022. FR-014: T015–022. FR-015: T015–022.
FR-016: T003–024. FR-017: T007/T013/T021/T024. FR-018: T007/T008/T014/T022–025.

## Seguimiento de CI del PR #271

- [x] T026 Corregir los paquetes PDF de Ubuntu 22.04 en .github/workflows/ci.yml, añadir generación/lectura sintética obligatoria y regresión en tests/spec_governance/test_backend_pdf_ci.py; comprobar gobernanza, documentar el resultado y reenviar CI sin fusionar ni desplegar (FR-018). Autorizado por el usuario: «corrige y manda ci».

## Coordinación 130 en curso

La recuperación añade una intención expresa al copy/job durable, permite solo esa copia en la misma materia y revalida procedencia/permisos. La reutilización normal conserva destino distinto y remapea documento, material y presupuestos, sin copiar estudiantes o notas. El alcance y las pruebas nuevos se registran una sola vez en [Spec130](../130-digitalizacion-secciones/spec.md), [su plan](../130-digitalizacion-secciones/plan.md) y [sus tareas](../130-digitalizacion-secciones/tasks.md), issue #274. Esta referencia no acredita cierre, CI ni activación en producción.
