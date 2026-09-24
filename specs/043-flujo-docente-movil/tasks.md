# Tareas: Flujo docente móvil de calificación

## Fase 1: Preparación

- [x] T001 Verificar el comportamiento móvil existente y documentar los puntos de integración en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`

## Fase 2: Fundamentos

- [x] T002 Crear pruebas de regresión para contexto compacto, acciones móviles y continuidad de revisión en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`

## Fase 3: Historia 1 - Encontrar estudiantes

- [x] T003 [US1] Mantener búsqueda y filtros accesibles durante el desplazamiento móvil en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [x] T004 [US1] Verificar escritura diferida, lista estable y conservación de filtro en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`

## Fase 4: Historia 2 - Revisar con pocas decisiones

- [x] T005 [US2] Hacer persistentes las pestañas Evidencia y Revisar respuestas y reducir controles secundarios visibles en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [x] T006 [P] [US2] Ajustar jerarquía táctil y semántica móvil del panel de excepciones en `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx`

## Fase 5: Historia 3 - Terminar y continuar

- [x] T007 [US3] Incorporar barra inferior móvil por estado con navegación segura al siguiente estudiante en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [x] T008 [US3] Cubrir permisos, cambios sin guardar, confirmación, publicación y siguiente estudiante en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`

## Fase 6: Historia 4 - Contexto compacto

- [x] T009 [US4] Reemplazar selectores móviles permanentes por un resumen expandible de materia y evaluación en `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`
- [x] T010 [US4] Verificar expansión, selección ausente y compatibilidad de escritorio en `frontend/src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx`

## Fase final: Validación

- [x] T011 Ejecutar pruebas focalizadas, typecheck y lint del frontend y registrar resultados en `specs/043-flujo-docente-movil/quickstart.md`
- [x] T012 Validar 360×800 y 390×844 en navegador real y documentar evidencia en `specs/043-flujo-docente-movil/quickstart.md`
- [x] T013 Ejecutar convergencia de requisitos y cerrar tareas restantes en `specs/043-flujo-docente-movil/tasks.md`

## Dependencias

- T001 precede a todas las tareas de implementación.
- T002 define la cobertura base antes de T003, T005, T007 y T009.
- T003 y T004 pueden validarse independientemente de las historias 2 a 4.
- T005 y T006 pueden ejecutarse en paralelo después de T002.
- T007 depende de la protección de cambios ya cubierta por T002.
- T009 puede implementarse después de T002 y antes de la validación final.
- T011 y T012 requieren que las historias 1 a 4 estén completas; T013 cierra la convergencia.

## Ejecución paralela

- US1: implementación y ampliación de pruebas se ejecutan secuencialmente por compartir el workspace.
- US2: T006 puede avanzar en paralelo con T005 porque modifica un componente aislado.
- US3 y US4 comparten el workspace principal y deben aplicarse secuencialmente.

## Estrategia de implementación

El MVP corresponde a las historias 1, 2 y 3: encontrar, revisar y continuar. La historia 4 se añade después para recuperar espacio vertical sin alterar el flujo funcional. Cada historia conserva el backend y las reglas de calificación actuales.
