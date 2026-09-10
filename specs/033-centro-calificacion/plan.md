# Plan: Centro unificado de calificación

**Rama**: `codex/033-centro-calificacion` | **Fecha**: 2026-09-09 | **Spec**: [spec.md](./spec.md) | **Issue**: [#68](https://github.com/Andres-back/Calificator/issues/68)

**Estado**: Diseño y especificación aprobados por el usuario mediante «adelante» el 2026-09-09, después de presentar el centro propuesto. Implementación autorizada; trazabilidad en #68 con spec-approved y plan-approved. Los resultados de validación se registrarán en quickstart.md.

## Resumen

Evolucionar CalificacionesWorkspace como centro canónico `/app/calificaciones`, reutilizando editor, visor, historial y publicación. Extraer carga de MateriaCalificar como panel contextual. Crear una proyección docente por evaluación con resumen completo de alertas sin depender de la bandeja global de seis casos. [Contrato visual y navegación](contracts/centro.md).

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18.3, Python 3.11; mantener versiones fijadas.
**Dependencias**: React Router, TanStack Query, Tailwind, componentes propios, FastAPI y SQLAlchemy.
**Persistencia**: tablas existentes de matrículas, entregas, calificaciones, desgloses, componentes, incidencias y jobs. Sin tablas ni migraciones nuevas previstas.
**Pruebas**: Vitest de selección/alertas/edición, pytest de proyección autorizada/PQRS, Playwright de flujo/rutas/móvil. Reutilizar suites existentes.
**Plataforma objetivo**: cinco tamaños de 032 y ambos temas; Safari/Brave físicos se registran como pendientes si no se ejecutan.
**Rendimiento y escala**: 30 alumnos, proyección paginada y detalle/evidencia a demanda. Evitar N+1 HTTP/SQL. Esta UI no acredita velocidad del modelo ni ahorro sin medición.

## Verificación de la constitución

- I Roles: endpoint docente con autorización sobre evaluación; lectura, carga, PQRS y publicación conservan permisos independientes.
- II Integridad: reutilizar version_esperada, fórmula, confirmación y publicación. Proyección de alertas no modifica estados.
- III Asincronía: misma cola, idempotencia y recuperación; polling solo con trabajos activos y reintentos aislados.
- IV Datos: sin migraciones. Retiro de pantallas exige ausencia de consumidores; mantener APIs de salón/lote y compatibilidad de enlaces.
- V Accesibilidad: controles principales de 44 px, foco, scroll, teclado virtual y layout del contrato.
- VI IA: modelos/verificadores/configuración intactos; datos y secretos fuera de URL, logs y especificaciones.
- VII Gobernanza: #68, especificación y tareas vinculadas; revisar diseño concreto antes de implementar y verificar requisitos con pruebas proporcionadas.
- VIII Despliegue: PR/CI, activación verificable y reversión de código sin alterar datos.

Revisión posterior al diseño: sin excepciones necesarias. La aprobación del diseño se registra antes de cambios funcionales.

## Estructura del proyecto

- `frontend/src/router.tsx`, `config/routes.ts`, `config/nav.ts`: entrada y adaptadores.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: contexto/lista/detalle; extraer paneles cuando evite duplicación.
- `frontend/src/modules/calificaciones/components/{GradeBreakdown,GradeComponentEditor,GradeFormula,GradeBreakdownHistory}.tsx`: selección/edición preservando vista estudiante.
- `frontend/src/modules/materias/MateriaCalificar.tsx`: extraer carga como panel con asociación multihoja y cola.
- `frontend/src/modules/calificaciones/{gradingJobs,GradingJobMonitor,api}.ts*`, `frontend/src/types/api.ts`: destinos y contratos.
- `frontend/src/modules/materias/{MateriaEvaluaciones,MateriaBoletin,MateriaVistaGeneral}.tsx`, `frontend/src/modules/dashboard/TeacherInbox.tsx`: accesos.
- `backend/app/modules/calificaciones/{router,schemas,service}.py`: proyección y transporte de componente/version de PQRS.
- Suites existentes en `frontend/e2e/`, `frontend/src/modules/calificaciones/`, `backend/tests/unit/test_calificaciones_revision_workspace.py`, `backend/tests/integration/test_explainable_grading_pipeline.py`.

## Decisiones y complejidad

1. Lista/evidencia/pregunta forman una mesa. Pendientes y alertas son filtros; carga/publicación son paneles contextuales. El boletín general sigue como informe transversal.
2. URL con identificadores y filtros; borrador en memoria. Proteger transiciones internas y query, además de rutas. No persistir respuestas ni archivos en URL/localStorage.
3. Proyección aditiva de lectura evita ampliar el endpoint compartido estudiantil. Consultas agrupadas de calificación vigente, último desglose y PQRS; contadores sobre toda la evaluación.
4. Alertas usan bloqueos, cobertura y estados registrados. Desacuerdo usa regla de consenso existente sobre el mismo componente/escala y solo si sigue sin resolver; no inventar umbrales de confianza.
5. Guardar y siguiente captura el orden visible al iniciar la acción para que polling no salte alumnos. Error/conflicto conserva borrador.
6. PQRS: transmitir componente_id/desglose_version en router y servicio. Componentes versionados cambian de ID: conservar referencia original y usar clave estable solo con correspondencia comprobable. Antiguos sin vínculo quedan globales.
7. Auditar importaciones, exports, rutas, tests antes de retirar CalificacionesPage, CalificarFotoPage y SalonPage. Conservar boletinTour y APIs de salón usadas por otros clientes.

## Entrega progresiva y reversión

Primero proyección y adaptadores; después mesa/alertas/carga; finalmente unificar accesos y retirar código sin consumidores. Validar física multihoja, online y nota manual antes de promoción.

La bandera `VITE_GRADING_REVIEW_WORKSPACE_V2_ENABLED` se declara actualmente y no se consume. Cablearla realmente durante transición o retirarla con documentación al promover. La aceptación exige recorrido sobre la versión servida; presencia de texto en bundle no demuestra usabilidad ni activación. Mantener independientes las banderas de investigación.

Reversión a commit frontend anterior; API aditiva no modifica datos. No borrar historial, reprocesar trabajos ni activar estudio.

## Propiedad documental

008 conserva calificaciones y proyección; 016 desglose; 002 navegación/roles; 007 entregas; 012/031 jobs; 011/032 medición. Actualizar propietarios e inventario durante implementación; 033 coordina este cambio sin reasignar tablas.
