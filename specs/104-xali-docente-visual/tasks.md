# Tareas: Xali docente por materia y apoyos visuales

## Fase 1: Preparación

- [x] T001 Registrar aprobación y revisión de requisitos en specs/104-xali-docente-visual/checklists/ux-contexto.md; verificar ignores y contrato (FR-001–FR-011).

## Fase 2: Fundamentos

- [x] T002 Añadir corpus sintético compartido en specs/104-xali-docente-visual/fixtures/visuales.json y pruebas de contrato en backend/tests/unit/test_xali_visual_content.py y frontend/src/modules/xali/visualContent.test.ts (FR-005/FR-006/FR-009).
- [x] T003 Implementar validación, texto compatible y metadata en backend/app/modules/xali/visual_content.py (FR-005/FR-006/FR-009/FR-011).

## Fase 3: Historia 1 — Contexto docente

- [x] T004 [US1] Añadir pruebas de contexto, permisos, general y concurrencia en backend/tests/unit/test_xali_teacher_context.py (FR-001/FR-002/FR-003/FR-004/FR-008/FR-010).
- [x] T005 [US1] Implementar contexto docente y guardas de conversación en backend/app/modules/xali/teacher_context.py y router.py (FR-001/FR-002/FR-004/FR-008).
- [x] T006 [US1] Acotar recuperación opcional en backend/app/modules/rag/context_builder.py y retrieval_service.py, preservando defaults ajenos (FR-003/FR-010/FR-011).
- [x] T007 [US1] Integrar prompt, persistencia de intercambio/metadata e historial separado en backend/app/modules/xali/service.py (FR-001/FR-002/FR-003/FR-004/FR-008/FR-009/FR-010).

## Fase 4: Historia 2 — Apoyos visuales

- [x] T008 [US2] Implementar parser estricto en frontend/src/modules/xali/visualContent.ts, compatible con corpus del servidor (FR-005/FR-006/FR-009).
- [x] T009 [US2] Añadir pruebas e implementar tabla/plano/figura y carga diferida de gráficos en frontend/src/modules/xali/components/TeacherVisual.tsx y TeacherCharts.tsx (FR-005/FR-006/FR-007/FR-011).
- [x] T010 [US2] Integrar respuesta docente/visor accesible en frontend/src/modules/xali/components/TeacherResponse.tsx y pruebas correspondientes (FR-005/FR-007/FR-009).

## Fase 5: Historia 3 — Interacción y recuperación

- [x] T011 [US3] Añadir pruebas docentes de estado/cancelación en frontend/src/modules/xali/XaliPage.teacher.test.tsx y useTeacherConversation.test.tsx, conservar XaliPage.test.tsx estudiantil y API con AbortSignal (FR-001/FR-008/FR-010/FR-011).
- [x] T012 [US3] Integrar contexto claro, respuestas docentes y recuperación segura en frontend/src/modules/xali/XaliPage.tsx y api.ts sin alterar política estudiantil (FR-001/FR-004/FR-007/FR-008/FR-009/FR-011).
- [x] T013 [US3] Probar persistencia y locks con PostgreSQL aislado en backend/tests/integration/test_xali_teacher_visual.py (FR-002/FR-008/FR-009/FR-010).
- [x] T014 [US3] Crear E2E sintético en frontend/e2e/xali-teacher-visual.spec.ts para 360/390/1440 y ambos temas/motores, foco, cuenta/materia y errores (FR-001/FR-004/FR-005/FR-006/FR-007/FR-008/FR-009/FR-010/FR-011).

## Fase final: Validación

- [x] T015 Ejecutar pruebas backend/frontend aplicables, tipos, lint, build y auditorías; registrar evidencia en specs/104-xali-docente-visual/quickstart.md (FR-001–FR-011).
- [x] T016 Ejecutar Converge, registrar evolución en specs/README.md y specs/009-xali-rag-refuerzos/spec.md; abrir PR sin fusionar/desplegar (FR-010/FR-011).

## Dependencias y estrategia

T001 → T002 → T003; T004 precede T005–T007; T003/T007 y T008 preceden T009/T010. T011 precede T012; T012 integra historias 1/2. T013/T014 comprueban el conjunto antes de T015/T016. Corpus y pruebas de backend/frontend pueden prepararse independientemente, sin delegación requerida. MVP verificable: contexto autorizado sin documentos; incremento siguiente: visuales; cierre: recuperación y móvil. No se omiten tareas del alcance aprobado.

## Corrección de CI aprobada — 2026-10-17

- [x] T017 Corregir la medición subpíxel de E2E sin rebajar los 44 px CSS, añadir regresión que rechaza controles realmente pequeños y repetir Chromium/WebKit; registrar resultado y actualizar PR #217 sin fusionar ni desplegar (FR-007, SC-003).
