# Tareas: Estabilización de evidencia y calidad backend

**Entrada**: `spec.md`, `plan.md`, `research.md`, `data-model.md` y `contracts/`
**Flujo**: hotfix abreviado aprobado en el issue #76
**Cobertura**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007 y FR-008.

## Fase 1: Preparación

- [x] T001 Confirmar el contrato y ubicar las pruebas relacionadas en `backend/tests/unit/`.
- [x] T002 Registrar el módulo responsable en `specs/README.md` sin crear documentación contradictoria.

## Fase 2: Historia 1 — Recuperar evidencia completa (P1)

**Objetivo**: que el revisor autorizado reciba el archivo completo de la entrega.

**Prueba independiente**: invocar directamente la ruta con una entrega autorizada y comprobar `FileResponse`, tipo y encabezados privados.

- [x] T003 [US1] Escribir primero la prueba de regresión de evidencia completa en `backend/tests/unit/test_calificaciones_revision_workspace.py` y comprobar que falla.
- [x] T004 [US1] Restaurar el retorno de evidencia completa y eliminar código inalcanzable en `backend/app/modules/calificaciones/router.py`.
- [x] T005 [US1] Ejecutar las pruebas relacionadas con lectura de evidencia completa y por página.

## Fase 3: Historia 2 — Bloqueo de estructura controlado (P1)

**Objetivo**: responder con conflicto de negocio, no con error interno, al validar una evaluación ya bloqueada.

**Prueba independiente**: validar una evaluación fuera de borrador y comprobar HTTP 409 con mensaje estable.

- [x] T006 [US2] Escribir primero la prueba de regresión de estructura bloqueada en la prueba de servicio existente y comprobar que falla.
- [x] T007 [US2] Definir y usar el mensaje estable en `backend/app/modules/evaluaciones/service.py`.
- [x] T008 [US2] Ejecutar las pruebas relacionadas con el servicio de evaluaciones.

## Fase 4: Historia 3 — Barrera preventiva en CI (P2)

**Objetivo**: impedir nuevos nombres indefinidos sin ampliar este hotfix a una limpieza general.

**Prueba independiente**: ejecutar localmente el mismo comando de Ruff y obtener cero errores F821/F822/F823.

- [x] T009 [US3] Fijar Ruff como dependencia de desarrollo en `backend/requirements-dev.txt`.
- [x] T010 [US3] Resolver únicamente los falsos positivos actuales de referencias de modelos necesarios para habilitar la barrera.
- [x] T011 [US3] Añadir `ruff check --select F821,F822,F823 app tests` al trabajo backend de `.github/workflows/ci.yml`.
- [x] T012 [US3] Ejecutar Ruff y compilación sobre `backend/app` y `backend/tests`.

## Fase 5: Validación y convergencia

- [x] T013 Ejecutar las suites backend relacionadas y la suite completa aplicable indicada en `quickstart.md`.
- [x] T014 Ejecutar `git diff --check` y revisar que no haya secretos, migraciones ni cambios fuera del alcance.
- [x] T015 Ejecutar `$speckit-converge`, completar cualquier tarea faltante y dejar todos los criterios de aceptación satisfechos.
- [x] T016 Crear commit, publicar la rama, abrir PR enlazado al issue #76 y comprobar CI verde antes de fusionar.

## Dependencias

- T003 precede a T004; T006 precede a T007.
- T009 y T010 preceden a T011 y T012.
- T013–T016 requieren que T004, T007 y T012 estén completas.
