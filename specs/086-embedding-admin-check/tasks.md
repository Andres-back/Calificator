# Tareas: Comprobación de embeddings institucionales

## Fase 1: Preparación

- [x] T001 Registrar issue #178, aprobación hotfix y especificación/plan en `specs/086-embedding-admin-check/`.

## Fase 2: Fundamentos

- [x] T002 Añadir regresiones previas de helper, contrato administrativo y permisos en `backend/tests/unit/test_admin_embedding_check.py`.
- [x] T003 [P] Añadir regresiones de estados/controles internos y acción de prueba en `frontend/src/modules/admin/ai/sections/ProvidersSection.test.tsx`.

## Fase 3: Historia 1

- [x] T004 [US1] Corregir catálogo persistido, cliente interno, validación y error estructurado en `backend/app/modules/admin_ai_config/router.py` (FR-001/002/003/005/006).

## Fase 4: Historia 2

- [x] T005 [US2] Diferenciar estados y ocultar controles cloud inaplicables en `frontend/src/modules/admin/ai/sections/ProvidersSection.tsx` (FR-004/005).

## Fase final: Validación

- [x] T006 Actualizar canónica `specs/021-configuracion-ia-docente/spec.md`, índice `specs/README.md` y baseline `tests/spec_governance/test_spec_baseline.py`.
- [x] T007 Ejecutar regresiones, tipos, lint, build y gobernanza; registrar evidencia en `specs/086-embedding-admin-check/quickstart.md` (SC-001/002/003).
- [x] T008 Ejecutar Converge y cerrar tareas documentales en `specs/086-embedding-admin-check/tasks.md`; abrir PR con CI como gate externo, sin desplegar sin autorización.

## Dependencias

T001 → T002/T003 → T004/T005 → T006/T007 → T008. Tests primero. US1 y US2 tienen pruebas independientes. T002/T003 permiten ejecución paralela sin agentes; implementación es secuencial. MVP = US1, entregar con US2 para que el panel no siga exigiendo clave.

## Trazabilidad

FR-001: T002/T004; FR-002: T002/T004; FR-003: T002/T004; FR-004: T003/T005; FR-005: T002/T003/T004/T005; FR-006: T002/T004/T007. SC-001: T002/T004/T007; SC-002: T003/T005/T007; SC-003: T002/T007. No tareas ajenas al alcance aprobado.

## Gate externo de entrega

El cierre documental no certifica CI remoto ni producción. La apertura del PR acompaña este commit; fusión y despliegue autorizados por el usuario únicamente con todos los controles verdes. Resultados y versión desplegada se registrarán en el PR para no relanzar CI con cambios de estado.
