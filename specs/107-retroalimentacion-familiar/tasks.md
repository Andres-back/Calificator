# Tareas: devolución individual, enlaces temporales y calidad de modelos

Issue #223; spec y plan aprobados el 2026-10-20. Implementación local en curso; revisión de calidad expresamente autorizada y completada 8/8. Cada marca significa evidencia real de finalización, no aprobación ni trabajo planeado. Los archivos de tareas pendientes son destinos previstos, no funcionalidades entregadas.

## Fase 1: Preparación

- [X] T001 Resolver la revisión autorizada de `specs/107-retroalimentacion-familiar/checklists/entrega-individual.md`, registrar análisis sin modificar marcadores desde Implement y confirmar permisos/alcance del issue #223. [FR-024, SC-008]
- [X] T002 Verificar baseline/ignores y entorno aislado en `specs/107-retroalimentacion-familiar/quickstart.md`; registrar head de Alembic, estado de datos previos y coordinación #206 sin tocar 098/101 ni producción. [FR-024, SC-008]

## Fase 2: Fundamentos

- [X] T003 Escribir pruebas de esquema/constraints y preservación en `backend/tests/integration/test_feedback_sharing_migration.py` antes de añadir tablas. [FR-024, SC-008]
- [X] T004 Añadir modelos en `backend/app/modules/feedback_sharing/models.py` y migración aditiva en `backend/alembic/versions/` (revisión asignada según heads reales), registrar en `backend/app/db/base.py` y respetar schema ownership; ejecutar T003. [FR-006/008/012/013/018/020/021/024/027, SC-008/010]
- [X] T005 Escribir pruebas de proyección/huella/nota manual en `backend/tests/unit/test_feedback_sharing_projection.py`, con respuesta oculta, desglose incompleto y total discrepante. [FR-003/006/015/017, SC-002/008]
- [X] T006 Implementar schemas/proyección/contexto seguro en `backend/app/modules/feedback_sharing/schemas.py` y `projection.py`, usando desglose estudiante y nota confirmada, sin recalcular históricos ni incluir JSON crudo; ejecutar T005. [FR-003/006/007/012/015/017/024, SC-002/006/008]
- [X] T007 Escribir pruebas de vigencia, token, propiedad, matrícula y carreras en `backend/tests/integration/test_feedback_sharing_authorization.py`. [FR-008/009/010/012/013/017/018, SC-005/006]
- [X] T008 Implementar autorización/transacciones/huella en `backend/app/modules/feedback_sharing/access_policy.py` y `service.py`, con token hash, orden de locks y auditoría transaccional; integrar suspensión en `calificaciones/service.py` y `breakdown_service.py`, cubriendo todos los escritores encontrados; ejecutar T007. [FR-006/007/008/009/010/012/013/017/018/021/024, SC-005/006/008]
- [X] T009 Introducir bandera deshabilitada en `backend/app/core/config.py` y probar apagado/compatibilidad en `backend/tests/unit/test_feedback_sharing_feature_flag.py`; no activar modelos ni compartir registros automáticamente. [FR-001/007/024, SC-008]

## Fase 3: Historia 1 — Coherencia académica y calidad (P1)

Objetivo: cálculo verificable y devolución fundada sin cambios históricos. Prueba independiente: discrepancias/lectura dudosa/feedback contradictorio conservan salida original y exigen decisión docente; comparación no activa candidatos.

- [X] T010 [US1] Añadir regresiones en `backend/tests/unit/test_feedback_sharing_quality.py` para total discrepante, respuesta breve válida, ilegible, componente faltante y devolución contradictoria, sin imputar ceros por fallo de lectura. [FR-003/004, SC-002]
- [X] T011 [US1] Implementar puerta compartible y resumen de calidad en `backend/app/modules/feedback_sharing/quality_policy.py`, reutilizar redondeo/cálculo vigente y edición docente existente; corregir solo defectos reproducidos por T010 conservando trazabilidad. [FR-003/004/006/018, SC-002]
- [X] T012 [US1] Crear harness comparativo local en `scripts/benchmark_feedback_models.py`, configuración por etapa y reporte sin datos personales; pruebas sintéticas en `backend/tests/unit/test_feedback_model_comparison.py` de tiempos, concordancia y veto por error grave. [FR-001/002/005, SC-001/003]
- [X] T013 [US1] Definir registro/validación de cinco dimensiones, evaluador/versión e incidencias en `backend/app/modules/feedback_sharing/quality_policy.py` usando `impacto_tesis/schemas.py::FeedbackQualityPayload`, sin rellenar valores ni sustituir revisión por autoevaluación IA. [FR-004/005, SC-003]

Refinamiento de T010/T011 autorizado el 2026-10-20: pruebas adicionales `test_feedback_usefulness.py`, `test_feedback_refinement.py` y regresiones de consenso/ruta de OpenCode. Añadir control explicable de texto genérico, señales de utilidad en preview docente y reescritura opcional deshabilitada según la precisión de plan/FR-004; no marcar T014 por pruebas sintéticas ni modificar notas históricas.

- [X] T014 [US1] Registrar en `specs/107-retroalimentacion-familiar/spec.md`, `plan.md` y `validation.md` la separación expresamente aprobada el 2026-10-21 de la comparación de 20 actividades al issue #236; conservar defaults y harness sin activación. La ejecución experimental original continúa pendiente en ese issue y **no se presenta como realizada**. [FR-001/002/005, SC-001/003]

## Fase 4: Historia 2 — Compartir resultado revisado (P1)

Objetivo: preview/emisión por selección y lectura directa. Prueba independiente: nota elegible se abre sin cuenta, pendiente excluida y cuatro acciones principales como máximo, sin cambiar nota/publicación existente.

- [X] T015 [US2] Escribir contratos permitidos/denegados y lotes parciales en `backend/tests/integration/test_feedback_sharing_routes.py`, incluidos histórico manual y repetición sin recuperación de token crudo. [FR-006/007/008/013/022, SC-004/005/008]
- [X] T016 [US2] Implementar preview/emisión/lista docente y GET público de `contracts/http-and-ui.md` en `backend/app/modules/feedback_sharing/router.py` y `public_router.py`, registrarlos en `backend/app/api.py`; ejecutar T015. [FR-006/007/008/012/013/014/015/022/024, SC-004/005/006/008]
- [X] T017 [P] [US2] Escribir pruebas de flujo/estados/cliente sin cookies en `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.test.tsx` y `PublicFeedbackPage.test.tsx`. [FR-006/014/015/022/023, SC-004/007]
- [X] T018 [US2] Implementar `ShareFeedbackDialog.tsx`, `api.ts` y `publicApi.ts` en `frontend/src/modules/feedback_sharing/`, con preview explícita, 72 h default, duración 1..30 días, lote/selección todos y copia individual voluntaria; integrar acción compacta en workspace/lista de notas. [FR-006/007/008/014/022/026, SC-004]
- [X] T019 [US2] Implementar `frontend/src/modules/feedback_sharing/PublicFeedbackPage.tsx`, rutas públicas fuera de AppShell y estados vacíos/error/expirado, sin datos de otros alumnos; ejecutar la parte pública de T017. [FR-010/012/014/015/023, SC-004/006/007]
- [X] T020 [US2] Implementar proxy de evidencia propia opcional en `backend/app/modules/feedback_sharing/public_router.py` y pruebas en `backend/tests/integration/test_feedback_sharing_evidence.py`, revalidando cada página sin URL permanente. [FR-010/015/017, SC-005/006]

## Fase 5: Historia 3 — Fichas y enlaces individuales (P1)

Objetivo: hoja completa privada e impresión recortable; enlaces preparados en lote pero entregados separados. Prueba independiente: 30 mensajes completos en Carta/A4, ningún token o dato de otro estudiante en un recorte.

- [X] T021 [US3] Escribir pruebas de selección/permisos/texto íntegro en `backend/tests/integration/test_feedback_sharing_print.py` y `frontend/src/modules/feedback_sharing/FeedbackPrintSheet.test.tsx`. [FR-011/014/025/026, SC-006/009]
- [X] T022 [US3] Implementar proyección de fichas en `backend/app/modules/feedback_sharing/router.py` y preview/portal en `frontend/src/modules/feedback_sharing/FeedbackPrintSheet.tsx`, con todos/algunos y sin claves/enlaces colectivos; ejecutar T021. [FR-011/014/025/026, SC-006/009]
- [X] T023 [US3] Añadir estilos aislados y continuación identificada en `frontend/src/modules/feedback_sharing/feedback-print.css`, revisar interacción con `frontend/src/print.css` y limpieza afterprint. [FR-023/025, SC-007/009]
- [X] T024 [US3] Validar selección y entrega separada en `frontend/src/modules/feedback_sharing/IndividualLinks.test.tsx`, con nombres/apellidos repetidos y sin selector público; coordinar aceptación #206 en `specs/107-retroalimentacion-familiar/validation.md`. [FR-011/012/014/026, SC-006/009]

## Fase 6: Historia 4 — Xali limitado y seguro (P1)

Objetivo: preguntas útiles dentro de revisión autorizada y cupo persistente. Prueba independiente: cinco aceptadas, sexta rechazada sin IA, lectura independiente y cero respuesta tras cerrar acceso.

- [X] T025 [US4] Escribir pruebas concurrentes/temporales de cuota en `backend/tests/integration/test_feedback_sharing_quota.py`: seis solicitudes reales, 599/600 s, duplicados, múltiples dispositivos/enlaces/generaciones, fallo de proveedor y apellidos iguales. [FR-019/020/027, SC-010]
- [X] T026 [US4] Implementar admisión durable/idempotencia/espera en `backend/app/modules/feedback_sharing/quota_service.py`, sin fallback permisivo y sin lock durante IA; ejecutar T025. [FR-019/020/027, SC-010]
- [X] T027 [US4] Escribir pruebas de prompt seguro, respuesta tardía, worker redespachado y broker/DB fallidos en `backend/tests/integration/test_feedback_sharing_chat.py`, con proveedor simulado. [FR-010/016/017/019/027, SC-005/006/008/010]
- [X] T028 [US4] Implementar chat/request 202 y polling en `backend/app/modules/feedback_sharing/chat_service.py` y `public_router.py`, con contexto seguro de revisión y capacidad LLMRouter existente, sin historial autenticado; ejecutar T027. [FR-010/012/016/017/019/020/027, SC-005/006/008/010]
- [X] T029 [US4] Implementar despacho pendiente/claim/recuperación en `backend/app/workers/tasks_feedback_chat.py`, registrar cola en `worker.py` y consumidor acotado en `docker-compose.yml`; probar que redespacho no reinfiere y fallo incierto no se reenvía a ciegas. [FR-016/019/020/027, SC-008/010]
- [X] T030 [P] [US4] Implementar y probar chat/cupo/espera accesible en `frontend/src/modules/feedback_sharing/PublicFeedbackChat.tsx` y `PublicFeedbackChat.test.tsx`, sin bloquear lectura, con teclado/reintento seguro y limpieza al cambiar enlace. [FR-016/019/020/023/027, SC-007/010]
- [X] T031 [US4] Añadir controles de abuso independientes, límites de concurrencia/contexto/timeout y pruebas en `backend/tests/unit/test_feedback_sharing_abuse.py` y `backend/app/modules/feedback_sharing/chat_service.py`, sin usar IP/familia como cupo académico. [FR-013/016/019/020, SC-006/010]

## Fase 7: Historia 5 — Control docente de vigencia (P1)

Objetivo: desactivar/reactivar/renovar sin alterar notas ni cuota. Prueba independiente: cerrar desde docente y probar otra pestaña, inferencia pendiente, nueva revisión y generación reemplazada.

- [X] T032 [US5] Escribir contratos de ciclo de vida/auditoría/versiones en `backend/tests/integration/test_feedback_sharing_lifecycle.py`, con edición simultánea y pérdida de permisos/matrícula. [FR-009/010/018/021/022, SC-005/008]
- [X] T033 [US5] Implementar endpoints y transacciones de ciclo de vida en `backend/app/modules/feedback_sharing/router.py` y `service.py`, con reautorización explícita, timestamps auditados y sin reiniciar cuota; ejecutar T032. [FR-008/009/010/018/021/022/024, SC-005/008/010]
- [X] T034 [P] [US5] Implementar controles/estados/versiones y pruebas en `frontend/src/modules/feedback_sharing/FeedbackAccessList.tsx` y `FeedbackAccessList.test.tsx`, con renovación distinta de reactivación y fallos parciales comprensibles. [FR-008/009/021/022/023/026, SC-004/007]
- [X] T035 [US5] Implementar limpieza solo de conversaciones temporales según retención en `backend/app/workers/tasks_feedback_chat.py` y probar reloj/reactivación/cupo preservado en `backend/tests/integration/test_feedback_sharing_retention.py`; no borrar registros académicos. [FR-009/021/024/027, SC-008/010]

## Fase final: Validación transversal

- [X] T036 Proteger bootstrap/telemetría/metadatos/caché y proxy en `frontend/src/router.tsx`, `frontend/src/main.tsx`, `frontend/nginx.conf`, `nginx/templates/default.conf.template` y superficies reales encontradas; añadir regresiones en `frontend/src/modules/feedback_sharing/privacy.test.ts` y `backend/tests/unit/test_feedback_sharing_headers.py`, sin relajar CSP ni registrar tokens. [FR-013/017/023/024, SC-005/006/007/008]
- [X] T037 Ejecutar Playwright CLI Chromium/WebKit 360/390/1440, ambos temas y altura reducida, y revisión de impresión A4/Carta de 30 fichas; inspeccionar páginas y registrar comandos/resultados y límites en `specs/107-retroalimentacion-familiar/validation.md`. Se utiliza CLI conforme a la skill; no se presenta un archivo E2E inexistente como entregado ni emulación como teclado físico. La regresión persistente de estados/privacidad/selección reside en `frontend/src/modules/feedback_sharing/*.test.tsx`. [FR-023/025, SC-004/007/009]
- [X] T038 Medir carga sintética de 30 consultas, prioridad grading/feedback y regresión de hashes/cantidades previas en `backend/tests/integration/test_feedback_sharing_regression.py` y `specs/107-retroalimentacion-familiar/validation.md`; verificar rollback de app/bandera sin downgrade destructivo. [FR-007/019/020/024, SC-008/010]
- [X] T039 Ejecutar calidad backend/frontend, E2E, contenedores e inventario/gobernanza; registrar comandos/resultados reales en `specs/107-retroalimentacion-familiar/validation.md`, sin sustituciones de CI ni falsos aprobados. [FR-024, SC-007/008]
- [X] T040 Ejecutar Converge y reconciliar `specs/107-retroalimentacion-familiar/tasks.md` con spec/plan/código/pruebas, mantener pendientes corpus/pruebas humanas faltantes y preparar PR enlazado #223 sin fusionar/desplegar ni activar modelos sin autorización propia. [FR-001/002/005/024, SC-001/003/008]

## Dependencias y estrategia incremental

Incremento de consulta pública del 2026-10-20: T019 y T030 cubiertos por 26 pruebas focalizadas de cliente, página, evidencia, chat y privacidad. T017 sigue pendiente porque falta el diálogo docente; T036 sigue pendiente de prueba real de proxy/bootstrap y T037 de E2E/teclado/impresión. No confundir las pruebas de componentes con aceptación responsive ni con despliegue. Ver `validation.md` para fallos y comprobaciones amplias.

T001 bloquea implementación; T002 precede tests de DB. Fundamentos T003..009 preceden historias. Pruebas T003/T005/T007 se escriben y fallan por carencia reproducible antes del código correspondiente. No usar SQLite como sustituto de bloqueos PostgreSQL.

US1 T010..013 prepara consistencia/revisión y harness. T014 registró la separación aprobada de la validación humana/experimental externa al issue #236: esa validación sigue pendiente y no se declara ejecutada. US2 necesita fundamentos y puerta de calidad T011, no activación de modelos ni terminar el experimento para esta entrega. US3 depende de preview/proyección US2. US4 depende de acceso público US2 y cuota durable; US5 se integra con los mismos servicios de autorización, sin edición simultánea de archivos compartidos. Cierre local no declara CI verde, despliegue ni evidencia académica obtenida.

MVP seguro: fundamentos + coherencia local US1 + preview/enlace de lectura US2, con bandera apagada hasta validación. No exponer chat sin T025..031 ni generar hoja colectiva pública. Después impresión, chat y ciclo de vida, y validación completa. No recortar garantías para acelerar demo.

Paralelismo posible, sin obligación de delegar: US1 fixtures de benchmark frente a pruebas de cálculo en archivos distintos; US2 T017 frente a pruebas backend T015; US3 estilos frente a pruebas backend tras fijar contrato; US4 T030 frente a worker tras fijar DTO; US5 T034 frente a pruebas backend T032. Archivos `service.py`, routers, worker y workspace se editan secuencialmente.

## Control de formato y cobertura

40 tareas originales, IDs T001..T040, más T041 añadida por convergencia. Historias originales: US1 5, US2 6, US3 4, US4 7, US5 4; preparación/fundamentos 9 y transversal 5. Cada tarea lleva ruta y referencias explícitas FR/SC; las marcas corresponden a su evidencia local registrada, no sustituyen revisión humana, CI o despliegue. Sin hooks de extensión configurados.

## Phase 9: Convergence

- [X] T041 Añadir defensa independiente contra intentos masivos de lectura/credenciales públicas en `backend/app/modules/feedback_sharing/public_router.py`, reutilizando el limitador de transporte y probándolo en `backend/tests/unit/test_feedback_sharing_abuse.py`; preservar cuota académica durable, NAT compartido, cabeceras privadas y fallo de acceso sin inferencia por FR-013/020, casos límite de acceso abusivo, plan decisión 2 (partial, HIGH).

## Matriz explícita de requisitos

| Requisito | Tareas |
|---|---|
| FR-001 | T009, T012, T014 |
| FR-002 | T012, T014 |
| FR-003 | T005, T006, T010, T011 |
| FR-004 | T010, T011, T013 |
| FR-005 | T012, T013, T014 |
| FR-006 | T005, T006, T015, T016, T017, T018 |
| FR-007 | T008, T009, T018, T038 |
| FR-008 | T004, T007, T008, T032, T033, T034 |
| FR-009 | T007, T008, T032, T033, T034, T035 |
| FR-010 | T007, T019, T020, T027, T028 |
| FR-011 | T021, T022, T024 |
| FR-012 | T006, T008, T019, T020, T024 |
| FR-013 | T007, T008, T031, T036, T041 |
| FR-014 | T017, T018, T019, T021, T022, T024 |
| FR-015 | T006, T019, T020, T028 |
| FR-016 | T027, T028, T029, T030, T031 |
| FR-017 | T006, T007, T020, T028, T036 |
| FR-018 | T008, T032, T033 |
| FR-019 | T025, T026, T027, T028, T029, T030, T031 |
| FR-020 | T025, T026, T029, T030, T031, T035, T038, T041 |
| FR-021 | T008, T032, T033, T034, T035 |
| FR-022 | T015, T016, T017, T018, T034 |
| FR-023 | T019, T023, T030, T034, T036, T037 |
| FR-024 | T003, T004, T008, T009, T035, T038, T039, T040 |
| FR-025 | T021, T022, T023, T037 |
| FR-026 | T018, T021, T022, T024, T034 |
| FR-027 | T025, T026, T027, T028, T029, T030, T035 |
