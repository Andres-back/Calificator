# Tareas: inicio docente claro en iPhone y Android

Issue #184; rama `codex/089-inicio-docente-movil`; alcance y plan aprobados. Revisar checklist antes de implementar. Datos ficticios, sin cambios de backend, identidad instalable o registros académicos.

## Fase 1: Preparación

- [x] T001 Registrar la revisión autorizada del checklist y las aprobaciones en specs/089-inicio-docente-movil/checklists/ux.md y plan.md, sin marcar requisitos o tareas como ejecutados sin evidencia (Constitución VII).
- [x] T002 Comprobar dependencias e ignores existentes en frontend/package-lock.json, .gitignore, .dockerignore y frontend/eslint.config.js; conservar manifest, rutas y política de service workers (FR-002/010).

## Fase 2: Fundamentos

- [x] T003 Cubrir detección instalada Android/iOS, navegador y ausencia de señales con pruebas en frontend/src/lib/installedApp.test.ts, antes del helper (FR-001/002, SC-003).
- [x] T004 Crear helper mínimo compartido frontend/src/lib/installedApp.ts, sin user agent, permisos, persistencia o dependencias nuevas (FR-001/002).

## Fase 3: Historia 1 — entrada protegida (P1)

**Meta**: validar sesión antes de entrar desde el icono, conservando landing e identidad.
**Prueba independiente**: raíz navegador/instalada con sesión válida/ausente, tres roles, cambio de contraseña y enlaces profundos.

- [x] T005 [P] [US1] Añadir regresiones de bootstrap instalado y espera de sesión en frontend/src/components/auth/RouteGuards.test.tsx (FR-001/002, SC-003).
- [x] T006 [P] [US1] Añadir regresiones de landing pública y redirección solo instalada en frontend/src/modules/auth/LandingPage.test.tsx (FR-001/002, Historia 1/AC4–5).
- [x] T007 [US1] Extender bootstrap solo para raíz instalada en frontend/src/components/auth/RequireAuth.tsx y entrada instalada en frontend/src/modules/auth/LandingPage.tsx, reutilizando guardas vigentes (FR-001/002, SC-003).

## Fase 4: Historia 2 — materias primero (P1)

**Meta**: identificar grupo y entrar a Evaluaciones/Asistencia con un toque autorizado.
**Prueba independiente**: tres materias, nombres largos, búsqueda de 30 grupos, carga/vacío/error y docente limitado.

- [x] T008 [US2] Añadir regresiones de prioridad, búsqueda, nombres completos, permisos, estados y destinos en frontend/src/modules/dashboard/DashboardPage.test.tsx antes de cambiar la composición (FR-003/004/005/008/009, SC-001/002/005).
- [x] T009 [US2] Reorganizar frontend/src/modules/dashboard/DashboardPage.tsx con saludo compacto, materias y búsqueda local, accesos contextuales autorizados y estados independientes; preservar inicios de otros roles (FR-003/004/005/008/009).

## Fase 5: Historia 3 — atención y ayuda voluntarias (P2)

**Meta**: pendientes resumidos y herramientas secundarias, con guía corta omisible.
**Prueba independiente**: detalle cerrado inicial, apertura manual, enlaces sin escrituras, fallo de bandeja/recursos, omisión y reapertura.

- [x] T010 [US3] Añadir regresiones de resumen/detalle, fallos parciales y ayuda en frontend/src/modules/dashboard/DashboardPage.test.tsx (FR-005/006/007/008/010, SC-005/006).
- [x] T011 [US3] Reutilizar consulta/listas en frontend/src/modules/dashboard/TeacherInbox.tsx mediante presentación compacta y detalle voluntario, con estados/error/reintento accesibles (FR-005/006/009).
- [x] T012 [US3] Integrar ayuda existente y nivel secundario en frontend/src/modules/dashboard/DashboardPage.tsx respetando permisos y monitores, sin controles funcionales simulados ni navegación paralela (FR-007/008/009, SC-006).

## Fase 6: Validación y entrega

- [x] T013 Extender frontend/e2e/p2-responsive.spec.ts con casos «inicio docente móvil» para motores, modos, sesión/roles, cinco tamaños/dos temas, altura real de tarjetas, objetivos táctiles, búsqueda, ayuda, estados, destinos y cero escrituras/IA; configurar proyectos focalizados sin duplicar suites ajenas en frontend/playwright.config.ts (FR-001–010, SC-001–006).
- [x] T014 Ejecutar tipos, lint estricto, unitarias focalizadas, Chromium/WebKit secuenciales, build y auditoría; inspeccionar capturas móviles en ambos temas y registrar resultados reales en specs/089-inicio-docente-movil/quickstart.md (FR-009/010, SC-001/004/005).
- [x] T015 Registrar comprobaciones físicas iPhone/Android o disponibilidad pendiente explícita, según quickstart, en specs/089-inicio-docente-movil/quickstart.md; no confundir emulación e instalación real ni afirmar cobertura física inexistente (FR-010, SC-004).
- [x] T016 Ejecutar Converge sobre specs/089-inicio-docente-movil/spec.md, plan.md y tasks.md y resolver cualquier tarea añadida antes de solicitar entrega (FR-001–010, SC-001–006, Constitución VII).
- [x] T017 Documentar trazabilidad e invariantes de APIs/registros en specs/README.md y specs/089-inicio-docente-movil/quickstart.md; comprobar diff limpio y ningún cambio de backend, datos, manifest o rutas efectivas (FR-002/010, Constitución IV/VI/VII).
- [x] T018 Abrir PR enlazado al issue #184 con los artefactos specs/089-inicio-docente-movil completos y resultados; adjuntar PR al chat y comprobar CI requerido sin bypass. Solicitar autorización de fusión/despliegue por separado (Constitución VII/VIII).

## Dependencias y paralelismo

## Trazabilidad explícita para gobernanza

| Requisito | Tareas responsables |
|---|---|
| FR-001 | T003–T007, T013 |
| FR-002 | T002–T007, T017 |
| FR-003 | T008–T009, T013 |
| FR-004 | T008–T009, T013 |
| FR-005 | T008–T011, T013 |
| FR-006 | T010–T011, T013 |
| FR-007 | T010, T012–T013 |
| FR-008 | T008–T010, T012–T013 |
| FR-009 | T008–T009, T011–T014 |
| FR-010 | T002, T010, T013–T015, T017 |

Los identificadores se enumeran individualmente para el validador; los rangos de tareas solo resumen las tareas existentes, no crean ni marcan trabajo adicional.

## Secuencia de ejecución

T001–002 → T003 → T004 → T005/006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018. T005 y T006 son independientes y pueden prepararse en paralelo; ejecución secuencial válida sin subagentes. No editar DashboardPage/test simultáneamente entre historias.

Ejemplos por historia: US1 permite T005/T006 en archivos distintos; US2 se mantiene secuencial para probar antes de la composición; US3 se mantiene secuencial por integración compartida de dashboard. Las pruebas de motores se ejecutan en secuencia para conservar servidor 4175.

## Estrategia

MVP técnico: US1 estabiliza entrada y sesión, validable independientemente. Después US2 y US3 completan el alcance aprobado antes de PR; no desplegar un MVP parcial. Primero regresiones y luego implementación por historia. Cada tarea se marca solo tras ejecutarla; ninguna lista de calidad certifica funcionamiento. No tareas de IA, migraciones, APK, App Store, offline ni acceso a credenciales.

## Phase 7: Convergence

Revisión del 2026-10-07, correcciones autorizadas por el usuario tras diagnosticar CI. Dos brechas parciales de validación, sin cambios al alcance funcional o a datos: inventario de specs de pruebas incompleto (Constitución VII) y detector de IA que confunde `revision` con `vision` (SC-005/FR-010). Se conservan las pruebas y los controles; no se omite CI.

- [x] T019 Añadir `089-inicio-docente-movil` a ALL_SPECS en tests/spec_governance/test_spec_baseline.py y verificar identificación/artefactos, manteniendo igualdad estricta y propietarios funcionales per Constitución VII (partial).
- [x] T020 Corregir el detector de peticiones en frontend/e2e/p2-responsive.spec.ts con límites de segmento, cubrir consultas de revisión permitidas y llamadas IA/escrituras rechazadas, y reejecutar distribución en Chromium/WebKit antes de actualizar PR #185 per SC-005 y FR-010 (partial).
