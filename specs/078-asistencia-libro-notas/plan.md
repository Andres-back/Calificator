# Plan: Flujo docente contextual y resultados ordenados

**Rama**: `codex/078-asistencia-libro-notas` | **Fecha**: 2026-09-30 | **Spec**: [spec.md](./spec.md) | **Issue**: [#163](https://github.com/Andres-back/Calificator/issues/163)

**Estado**: Alcance inicial aprobado mediante «aprove» y plan mediante «si» el 2026-09-30; ampliación y revisión de calidad autorizadas mediante «SIGUE» ante la pregunta consolidada. Implementación posterior a checklist/análisis; fusión/despliegue requieren autorización separada.

## Resumen

Añadir búsqueda local a `MateriaAsistencia`, un selector de evaluación a `TeacherGradebook` en `MateriaBoletin` y una regla contextual para ocultar la entrada lateral redundante. La enmienda reutiliza `CalificacionesWorkspace` para entrar desde cada evaluación a su lista y mostrar el resultado en cuatro secciones progresivas; ajusta `GenerationWizard` para presentar la materia como contexto fijo y proteger borradores. Se mantienen consultas, permisos, funciones de guardado y rutas actuales. Consultar no genera escrituras ni inferencias.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6 y React 18.3 según `frontend/package.json`; React Router 7.
**Dependencias**: Estado local, `useMemo`, TanStack Query y componentes UI existentes. Sin paquetes nuevos.
**Persistencia**: Ninguna tabla, migración ni cambio de API. Borrador de asistencia completo independiente de la lista visible. Filtros temporales de consulta sin almacenamiento nuevo. La recuperación del borrador local existente del wizard se aislará por materia, manteniendo una lectura compatible y conservadora del borrador anterior; no se reasignará ni eliminará por abrir otro contexto.
**Pruebas**: Vitest/Testing Library focales, pruebas Playwright existentes con respuestas sintéticas y controles obligatorios de CI. No se utilizarán registros escolares reales.
**Plataforma objetivo**: 360×800, 390×844 y 1366×768, claro/oscuro, teclado y desplazamiento táctil.
**Rendimiento y escala**: Coincidencias locales en menos de un segundo con 100 estudiantes. Sin peticiones por pulsación. Las consultas de notas se limitarán a las evaluaciones visibles usando sus claves existentes; procesamiento conserva su refresco actual.

## Verificación de la constitución

- Separación de roles: los controles docentes siguen los permisos existentes. El menú estudiantil y administrativo permanece igual. Solo se oculta el enlace de calificaciones si existe el recorrido autorizado por Materias y Evaluaciones.
- Integridad y trazabilidad: no cambian `createAttendanceDraft`, `buildAttendancePayload`, `markPendingPresent`, `hasTeacherDecision` ni las calificaciones persistidas. El libro reutiliza `buildFollowUpRows` con las evaluaciones de la selección; porcentajes de consulta no sustituyen notas oficiales.
- Asincronía e idempotencia: se conservan carga, error, reintento y refresco de notas en procesamiento. Cambiar filtros no guarda ni inicia trabajos. No se añade una cola o estado asíncrono nuevo.
- Datos y secretos: datos sintéticos en pruebas; cero consultas o mutaciones productivas necesarias para validar. Sin secretos, archivos de evidencia ni migraciones.
- Accesibilidad: etiquetas visibles, `type="search"`, cantidades anunciadas y controles de limpiar/selección de 44 px. Flujo normal del documento; no añadir barras sticky ni contenedores que bloqueen desplazamiento.
- Gobernanza y pruebas: issue #163 con alcance y plan ampliados aprobados y revisión de calidad autorizada. Checklist y análisis antes de implementar. Sin push directo a main. CI aplicable requerido antes de fusión.

La revisión posterior al diseño mantiene estos gates sin excepciones constitucionales.

## Estructura del proyecto

- `frontend/src/modules/materias/MateriaAsistencia.tsx`: texto de búsqueda, cantidad, limpiar, estado vacío y filas filtradas; conservar numeración original y resumen global.
- `frontend/src/modules/materias/attendanceModel.ts` y `.test.ts`: helper puro de coincidencias de nombre/correo y regresión de marcas, observaciones y payload completo. No alterar funciones de guardado.
- `frontend/src/modules/materias/MateriaBoletin.tsx`: selector, evaluaciones visibles, consultas y filas derivadas de esa selección, rótulos de resultado individual y recuperación si desaparece la selección.
- `frontend/src/modules/materias/gradebookModel.test.ts`: demostrar aislamiento de datos por selección reutilizando el modelo existente y conservación de todos los estados, incluido cero real.
- `frontend/src/config/nav.ts`, `frontend/src/components/layout/Sidebar.tsx` y `frontend/src/config/studentNavigation.test.ts`: regla de navegación comprobable, fallback autorizado y regresión de menús estudiante/admin.
- `frontend/src/modules/materias/MateriaEvaluaciones.tsx` y `.test.tsx`: acceso «Notas y entregas» al workspace existente, contextual y autorizado; entrada de creación de una materia y edición intactas.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `.mobile.test.tsx`, junto con pruebas existentes de revisión: orden y expansión de secciones, explicación basada en datos, enlaces profundos y guardas de edición. Reutilizar `GradeBreakdown`, guía, evidencia, historial y acciones existentes, sin replicar mutations ni cálculo de nota.
- `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`, `generationWizardModel.ts` y sus pruebas: contexto fijo, opciones progresivas y borradores aislados/compatibles. Revisar `DigitalizarEvaluacionModal` y `EvaluacionesPage` para confirmar que sus entradas contextual/general mantienen el contrato sin añadir grado/área.
- Pruebas de componente y `frontend/e2e` existentes: extender cobertura de selección, búsqueda, persistencia y geometría móvil; crear un archivo de prueba focal solo si no existe un contenedor apropiado, sin añadir páginas o infraestructura productiva.
- `specs/README.md`, baseline de gobernanza e inventario generado: registrar esta evolución y regenerar el inventario conforme al cambio, sin reasignar dueños de módulos.

## Decisiones y complejidad

1. Búsqueda local de asistencia por nombre o correo con normalización de tildes/mayúsculas; el helper devuelve proyecciones de registros y posición original, nunca un borrador reducido. Se descarta búsqueda remota porque la lista ya está cargada.
2. Resumen, marcar pendientes y guardar trabajan siempre con el borrador completo. Se aclarará «todo el grupo» en el botón global. El filtro no debe habilitar un guardado incompleto.
3. `selectedEvaluationId` vacío significa «Todas». Derivar `visibleEvaluations` antes de consultas/modelo; mantener asociación por ID al construir `gradesByEvaluation`. Reutilizar caches existentes y el refresco de procesamiento; no mezclar resultados al cambiar selección.
4. En selección individual, rótulo «Resultado de esta evaluación» y razón de prioridad acorde a la selección, evitando decir promedio general o afirmar que todas las evaluaciones cerradas tienen decisión. En «Todas» se conserva la presentación general vigente.
5. Mantener búsqueda y filtros de prioridad/decisión al cambiar evaluación, mostrando un estado vacío recuperable si la combinación no encuentra alumnos. Si desaparece la evaluación del listado actualizado, restablecer «Todas» y avisar una vez; no restablecer durante la carga inicial.
6. Ocultar el enlace lateral de calificaciones solo cuando `subjects.read` y `evaluations.read` permiten el recorrido contextual. Conservarlo para perfiles personalizados sin ese recorrido y con `grading.read`. No eliminar entradas de rutas, permisos, botones de evaluación ni accesos de pendientes/PQRS/libro.
7. Verificaciones locales proporcionales: tipos, lint, pruebas focales y UI sintética móvil. CI completo aplicable antes de merge; sin repetir benchmarks de IA porque no cambia el pipeline.
8. Con una evaluación elegida, usar una lista compacta de todo el grupo, sin tarjetas de prioridad, razones ni correo repetidos por alumno. Cada fila muestra nombre, nota (definitiva o sugerencia rotulada), estado y enlace de detalle contextual; procesamiento y ausencia nunca se convierten en cero. Resumen ampliado y explicación bajo `details`, accesible por teclado. En «Todas» se mantiene el seguimiento existente con sus notas y lógica.
9. La entrada desde una evaluación seguirá usando `routes.calificacionesEvaluacion`, no una página nueva. Mantener evaluación/materia de la URL y la lista existente de `evaluation-review`, con todos los estados y paginación explícita. El botón contextual cambia su copy a «Notas y entregas»; añadir entrega y establecer nota siguen accesibles desde ese contexto, según permisos. El libro también enlaza al mismo resultado.
10. Reorganizar `PanelDetalle` como cuatro secciones numeradas: nota/explicación abierta, evidencia, respuestas/puntajes y retroalimentación plegadas. Eliminar la apertura automática de evidencia y respuestas en `xl`, no sus capacidades. Encapsular alertas visibles y acciones de decisión fuera de detalles opcionales. Los enlaces `pregunta`/`hoja`, `openReviewComponent`, edición pendiente y navegación anterior/siguiente activan la sección necesaria y mantienen las guardas actuales. Desplazamiento normal sin paneles sticky nuevos; ampliar evidencia sigue siendo una acción explícita.
11. Usar `activeBreakdown.formula`, componentes/criterios registrados y datos de decisión para el respaldo breve de la nota. No calcular una nueva nota en el cliente, no usar feedback genérico como prueba del cálculo y no inventar explicaciones ausentes. Un ajuste global conserva su motivo y se diferencia de la suma original. La comparación usa «Respuesta de referencia» y alturas de contenido natural para respuestas cortas. Historial, detalles de IA y PQRS permanecen como opciones secundarias accesibles.
12. El wizard contextual ya recibe `initialMateriaId` y una materia; no tiene controles de grado/área en ese recorrido. Sustituir la instrucción «Confirma la materia» por contexto fijo y llamar al primer paso «Evaluación», sin suprimir nombre/modalidad necesarios. Plegar descripción, fecha y opciones complementarias con valores visibles en el resumen; conservar validación, edición de rúbrica, escala/pesos y revisión previa. En la entrada general sin contexto se conserva `MateriaSelect`.
13. `loadWizardDraft` actualmente carga por usuario antes de comprobar la materia. Extender las funciones existentes de borrador con contexto de materia y compatibilidad conservadora: un borrador anterior se ofrece solo en su materia, uno ajeno permanece recuperable y empezar/guardar/descartar en la materia actual no lo sobrescribe. No reasignar preguntas ni criterios. Al editar una evaluación no se restaura un borrador de creación ni cambia su materia. Cubrir apertura A→B→A y el formato local anterior con pruebas antes de ajustar almacenamiento.
14. Las nuevas verificaciones cubrirán las cuatro secciones en celular/escritorio, datos de nota ajustada y legado, alertas, enlaces a pregunta/hoja, cambios sin guardar y contexto A/B del creador. No se necesitan pruebas de modelos de IA ni datos productivos para una reorganización de interfaz.

## Artefactos y siguiente gate

- [Investigación](./research.md), [modelo de estado](./data-model.md), [contratos UI](./contracts/ui.md) y [guía de validación](./quickstart.md).
- Aprobación ampliada registrada. Revisar/ampliar la lista de calidad con autorización del usuario, regenerar tareas y ejecutar Analyze sobre el alcance completo antes de código. Fusión/despliegue se solicitarán por separado.
