# Tareas: boletín docente en mosaico

**Issue**: #194 | **Rama**: `codex/092-boletin-mosaico` | **Plan**: [plan.md](plan.md)

## Fase 1: Preparación

- [x] T001 Registrar aprobaciones de alcance/plan y revisar de forma autorizada `specs/092-boletin-mosaico/checklists/ux.md`; conservar cambios ajenos y comprobar exclusiones en `.gitignore`/`frontend/eslint.config.js` antes de implementar.

## Fase 2: Fundamentos

- [x] T002 Añadir pruebas previas de lectura docente `readOnly`, clave aislada y permisos en `frontend/src/modules/materias/MateriaBoletin.test.tsx` (FR-009, FR-010).
- [x] T003 Ajustar consultas docentes habilitadas por evaluación/filtro/previsualización, estados de carga/error independientes y selección por identidad/ámbito en `frontend/src/modules/materias/MateriaBoletin.tsx`, conservando el modelo de cálculos (FR-004, FR-007, FR-009, FR-010).

## Fase 3: Historia 1 — mosaico (P1)

**Meta**: encontrar alumnos sin recorrer boletines completos. **Prueba independiente**: grupo sintético de 30, homónimos/nombres largos, filtros y ausencia de evaluaciones.

- [x] T004 [US1] Ampliar pruebas de fichas, búsqueda/filtros, homónimos, padrón sin notas y estado sin alumnos en `frontend/src/modules/materias/MateriaBoletin.test.tsx` (FR-001, FR-002, FR-003; SC-001).
- [x] T005 [US1] Sustituir lista/tarjetas extensas por mosaico único, cabecera compacta y seguimiento plegado en `frontend/src/modules/materias/MateriaBoletin.tsx`, sin ocultar alumnos que aún no tienen evaluaciones (FR-001, FR-002, FR-003).

## Fase 4: Historia 2 — previsualización (P1)

**Meta**: consultar todas las notas del alumno sin cambiar registros. **Prueba independiente**: filtro único y diálogo completo con todos los estados, cero y centésimas.

- [x] T006 [US2] Añadir pruebas de boletín completo, notas/escalas/estados, explicación, carga/error parcial/reintento y actualización de resultados en `frontend/src/modules/materias/MateriaBoletin.test.tsx` (FR-004, FR-005, FR-006, FR-009; SC-002).
- [x] T007 [US2] Crear presentación `frontend/src/modules/materias/StudentGradebookPreview.tsx` reutilizando Modal y formato decimal existente, con filas compactas, nota/escala/estado, vacío/error/reintento y enlace de explicación (FR-004, FR-005, FR-006, FR-009).
- [x] T008 [US2] Integrar selección y cierre del diálogo en `frontend/src/modules/materias/MateriaBoletin.tsx`, conservar filtros/posición, impedir apilamiento de exportación y descartar contexto inaccesible (FR-007, FR-010; SC-004).

## Fase 5: Historia 3 — móvil y compatibilidad (P2)

**Meta**: consulta accesible desde celular conservando exportación y estudiante. **Prueba independiente**: recorrido móvil/escritorio con foco, scroll y permisos.

- [x] T009 [US3] Añadir pruebas de cierre/Escape/retorno de foco, cambios de usuario/materia/permiso/matrícula y regresión estudiante/exportación en `frontend/src/modules/materias/MateriaBoletin.test.tsx` (FR-007, FR-008, FR-010; SC-004, SC-006).
- [x] T010 [US3] Añadir caso de mosaico/previsualización sintético en `frontend/e2e/p2-responsive.spec.ts` e incluirlo en WebKit mediante `frontend/playwright.config.ts`; validar 360/390/768/1280, claro/oscuro, controles, nombres, último resultado, scroll/foco y apertura cacheada menor de un segundo (FR-008, FR-009; SC-003, SC-005).

## Fase final: Validación y entrega

- [x] T011 Ejecutar pruebas focalizadas de boletín/modelo/exportación/scroll, TypeScript/lint/build y matriz Chromium/WebKit de `specs/092-boletin-mosaico/quickstart.md`; corregir fallos y registrar evidencia real, sin datos productivos.
- [x] T012 Ejecutar regresiones aplicables de `backend/tests/unit/test_calificaciones_boletin_permissions.py` y pruebas existentes de modo solo lectura; documentar comandos/resultados en `specs/092-boletin-mosaico/quickstart.md` (FR-010; SC-006).
- [x] T013 Revisar eliminación de código de presentación sin consumidores en `frontend/src/modules/materias/MateriaBoletin.tsx`, ejecutar Converge y actualizar evidencia/estado de `specs/092-boletin-mosaico/` y `specs/README.md`; no cambiar cálculos ni vista estudiante.
- [x] T014 Crear PR enlazado al issue #194 con artefactos completos, aprobaciones y verificación; adjuntarlo al chat y registrar enlace en `specs/092-boletin-mosaico/quickstart.md`. No fusionar ni desplegar sin autorización separada y CI verde.

## Dependencias y estrategia

T001 → T002 → T003 → US1 (T004–T005) → US2 (T006–T008) → US3 (T009–T010) → validación T011–T014. Pruebas de cada fase se escriben antes de su implementación. Mosaico constituye el primer incremento, pero la entrega aprobada incluye las tres historias.

Paralelización posible, no necesaria: tras T008, preparar E2E T010 mientras se revisa T009 en otro archivo; tras implementar, validaciones frontend T011 y backend T012 son independientes. Mantener secuenciales ediciones del mismo archivo, sin requerir agentes adicionales.

Cobertura: US1 tiene dos tareas, US2 tres y US3 dos; fundamentos y cierre cubren requisitos transversales. Catorce tareas, IDs secuenciales, todas con rutas y criterios. Marcar solo tareas realmente completadas.

## Phase 6: Convergence

- [x] T015 Registrar `092-boletin-mosaico` en la lista de especificaciones activas de las pruebas `tests/spec_governance/` y ejecutar su batería antes de reenviar el PR, según Constitución VII y VIII (partial). CI detectó el registro administrativo faltante; no eliminar ni relajar la comprobación.

## Phase 7: Convergence

- [x] T016 Esperar visibilidad real tras la animación en `frontend/src/modules/materias/MateriaVistaGeneral.test.tsx`, conservando confirmación, cancelación y llamada única de renovación; ejecutar regresión focalizada y CI completo antes del merge, según FR-010 y Constitución VII/VIII (partial). No cambiar código funcional, omitir pruebas ni desactivar animaciones.
