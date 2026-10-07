# Tareas: recursos y resultados coherentes del estudiante

**Issue**: #192 | **Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Fase 1: Preparación

- [x] T001 Registrar las aprobaciones humanas de alcance y plan en specs/091-estudiante-recursos-resultados/spec.md y plan.md, con etiquetas del issue #192.
- [x] T002 Obtener revisión o autorización explícita de revisión asistida para specs/091-estudiante-recursos-resultados/checklists/student-ux.md y documentar evidencia sin eludir el gate.

## Fase 2: Fundamentos

- [x] T003 Verificar ignora artefactos/secrets y no incluye Spec Kit en runtime en .gitignore, .dockerignore, frontend/.dockerignore y configuración ESLint existente; ejecutar Analyze sobre specs/091-estudiante-recursos-resultados/ y registrar resultado sin modificar sus conclusiones.

## Fase 3: Historia 1 — recursos evaluativos protegidos

**Objetivo**: impedir soluciones/validaciones falsas y dirigir al flujo único de entrega, conservando apoyo/docente.
**Prueba independiente**: consulta de recurso evaluativo, apoyo y autor con fixtures; permiso denegado; PDF con grilla/pistas pero sin respuestas; acción móvil de resolver sin formulario local paralelo.

- [x] T004 [US1] Añadir regresiones de lectura segura, autor/apoyo sin modificación y denegación sin escrituras en backend/tests/unit/test_material_classroom_assignment.py; reutilizar backend/tests/unit/test_student_activity_payload.py.
- [x] T005 [US1] Añadir regresión de grilla/pistas de PDF seguro y compatibilidad original en backend/tests/unit/test_herramientas_render_contracts.py.
- [x] T006 [US1] Añadir regresiones del visor estudiantil de actividad/apoyo, sin solución/verificación falsa y evaluación ausente en frontend/src/modules/herramientas/StudentResourcePage.test.tsx.
- [x] T007 [US1] Reutilizar constructor de actividad segura en backend/app/modules/herramientas/service.py y admitir máscara/pistas seguras en backend/app/modules/herramientas/pdf_render.py sin modificar originales ni permisos.
- [x] T008 [US1] Compactar frontend/src/modules/herramientas/StudentResourcePage.tsx con acciones semánticas, apoyo de práctica y acceso único a resolver/entregar; sin formularios evaluativos locales, soluciones ni enlaces inválidos.

## Fase 4: Historia 2 — resultados y explicación coherentes

**Objetivo**: una acción a explicación de nota desde ambos boletines con la misma jerarquía.
**Prueba independiente**: nota positiva/cero/pendiente, encabezados largos y feedback progresivo, sin controles docentes ni nuevas consultas por tarjeta.

- [x] T009 [US2] Añadir regresiones de tarjeta de resultados compartida, enlaces, cero y pendiente en frontend/src/modules/calificaciones/StudentResultCard.test.tsx y estudiante en frontend/src/modules/materias/MateriaBoletin.test.tsx.
- [x] T010 [US2] Implementar componente presentacional frontend/src/modules/calificaciones/StudentResultCard.tsx y reutilizar únicamente en variantes estudiantiles de frontend/src/modules/calificaciones/BoletinPage.tsx y frontend/src/modules/materias/MateriaBoletin.tsx.
- [x] T011 [US2] Añadir ancla estable de resultado y desplazamiento de lectura sin nuevos intentos en frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx y su prueba existente.

## Fase 5: Historia 3 — errores de carga comprensibles

**Objetivo**: distinguir fallo, ausencia y denegación; reintento solo de lectura.
**Prueba independiente**: simular 500/red, 403 y éxito null/datos; recuperar consulta sin escrituras ni mensaje histórico falso.

- [x] T012 [US3] Añadir regresiones de error/reintento, null neutral y permiso denegado en frontend/src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx.
- [x] T013 [US3] Separar carga/error/ausencia/datos del desglose en frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx manteniendo Xali y explicación existente.

## Fase final: Validación y entrega

- [x] T014 Ejecutar pytest/Vitest dirigidos, TypeScript, lint y build aplicables; registrar resultados y limitaciones en specs/091-estudiante-recursos-resultados/quickstart.md.
- [x] T015 Verificar recursos→actividad y boletines→explicación en 360/390/1366 px claro/oscuro en Chromium/WebKit, con Playwright CLI y recorridos existentes; guardar evidencia en output/playwright/ y specs/091-estudiante-recursos-resultados/quickstart.md.
- [ ] T016 Ejecutar Converge sobre specs/091-estudiante-recursos-resultados/ y completar cualquier brecha antes de cerrar tasks.md; actualizar índice specs/README.md sin certificar producción.
- [ ] T017 Publicar rama y PR enlazado a #192 con espec/plan aprobados, tareas y evidencia en specs/091-estudiante-recursos-resultados/quickstart.md; no fusionar ni desplegar sin autorización aparte y CI verde.

## Dependencias y ejecución

T001 → T002 → T003 bloquean implementación. US1: T004–T006 antes de T007–T008; US2: T009 antes de T010–T011; US3: T012 antes de T013. US2/US3 comparten resolver, por lo que T011 y T013 se ejecutan secuencialmente. T014–T017 después de las tres historias.

Pruebas backend/frontend de US1 y de tarjeta en US2 pueden ejecutarse en paralelo como procesos de herramientas, sin delegación ni ediciones simultáneas de un mismo archivo. No se marcan como [P] porque el orden de pruebas y evidencia se conserva en este flujo.

MVP: US1 protege el contenido y su entrega; luego US2 y US3 completan el alcance aprobado. Cada historia se verifica de forma independiente; el PR contiene las tres. Todos los requisitos FR-001–FR-013 se cubren en T004–T015; no hay tareas de migración, datos reales o modelos LLM.

## Mapeo explícito de requisitos

FR-001: T004/T007; FR-002: T006/T008; FR-003: T006/T008; FR-004: T004/T006/T007; FR-005: T009/T010/T011; FR-006: T009/T011/T012; FR-007: T012/T013; FR-008: T011/T012/T013; FR-009: T008/T010/T014/T015; FR-010: T004/T009/T012/T015; FR-011: T004/T007/T012; FR-012: T004/T005/T006/T009/T012/T014; FR-013: T009/T010/T015.

T003/T014 incluyen mantenimiento mecánico del inventario generado y test de baseline para registrar 091; no alteran APIs públicas.
