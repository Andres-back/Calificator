# Índice de especificaciones de XCalificator

Este índice asigna una única especificación viva a cada superficie del sistema. Un cambio debe
actualizar la especificación propietaria, su plan y sus tareas; no debe crear documentación paralela.

| ID | Dominio | Backend propietario | Frontend / rutas | Tablas o datos principales | Issue |
|---|---|---|---|---|---|
| 001 | [Adopción de Spec Kit](001-adopt-spec-kit/spec.md) | `.specify`, scripts de gobernanza | GitHub Issues, PR y CI | Sin tablas de aplicación | [#2](https://github.com/Andres-back/Calificator/issues/2) |
| 002 | [Arquitectura, roles y seguridad](002-arquitectura-roles-seguridad/spec.md) | `api.py`, shared, auth guards | `router.tsx`, AppShell, RouteGuards | `users`, roles y pertenencias | [#3](https://github.com/Andres-back/Calificator/issues/3) |
| 003 | [Usuarios, materias y matrículas](003-usuarios-materias-matriculas/spec.md) | auth, users, materias, matriculas | Login, Mis materias, detalle e inscripción | `users`, `materias`, `matriculas` | [#4](https://github.com/Andres-back/Calificator/issues/4) |
| 004 | [DBA, asistencia y currículo](004-dba-asistencia-curriculo/spec.md) | dba, asistencia | pestañas DBA y Asistencia | `dba_catalog`, `dba_personalizados`, `asistencia_registros` | [#5](https://github.com/Andres-back/Calificator/issues/5) |
| 005 | [Evaluaciones](005-evaluaciones/spec.md) | evaluaciones | creación, digitalización, edición y resolución | `evaluaciones`, `evaluacion_blueprints` | [#6](https://github.com/Andres-back/Calificator/issues/6) |
| 006 | [Recursos y actividades](006-recursos-actividades/spec.md) | herramientas | herramientas, detalle y recurso estudiante | materiales y evaluaciones vinculadas | [#7](https://github.com/Andres-back/Calificator/issues/7) |
| 007 | [Entregas y experiencia estudiante](007-entregas-estudiante/spec.md) | entregas en calificaciones/evaluaciones | resolver, selector multihoja y ver entrega | `entregas`, metadatos de evidencia | [#8](https://github.com/Andres-back/Calificator/issues/8) |
| 008 | [Calificaciones, PQRS y boletín](008-calificaciones/spec.md) | calificaciones, incidencias | bandeja, workspace, detalle, PQRS y boletín | `calificaciones`, `calificacion_incidencias`, salón | [#9](https://github.com/Andres-back/Calificator/issues/9) |
| 009 | [Xali, RAG y refuerzos](009-xali-rag-refuerzos/spec.md) | xali, rag | tutor y recursos persistentes | `rag_sources`, `rag_chunks`, `xali_*` | [#10](https://github.com/Andres-back/Calificator/issues/10) |
| 010 | [Presentaciones e imágenes](010-presentaciones-imagenes/spec.md) | presentaciones, imagenes | progreso, vista previa y exportación | `presentaciones`, `imagenes_generadas` | [#11](https://github.com/Andres-back/Calificator/issues/11) |
| 011 | [Reportes, analítica e impacto](011-reportes-analitica-impacto/spec.md) | reportes, analytics, impacto_tesis | paneles y exportaciones | `analytics_eventos` y agregados | [#12](https://github.com/Andres-back/Calificator/issues/12) |
| 012 | [IA, jobs y producción](012-ia-jobs-produccion/spec.md) | admin_ai_config, jobs, services, worker | configuración IA y estados de job | jobs, auditoría, Redis y configuración cifrada | [#13](https://github.com/Andres-back/Calificator/issues/13) |
| 014 | [Alineación de autorización y superficies](014-alinear-autorizacion-superficies/spec.md) | autorización por objeto, analítica y contratos | AppShell, actividad estudiante y telemetría | sin tablas nuevas; políticas e inventario canónico | [#17](https://github.com/Andres-back/Calificator/issues/17) |
| 016 | [Calificación explicable y auditable](016-calificacion-explicable/spec.md) | calificaciones, visión, ajustes, publicación y PQRS | workspace docente, ver entrega y resultados | `calificaciones`, `entregas`, historial y desglose | [#20](https://github.com/Andres-back/Calificator/issues/20) |
| 017 | [Decoración visual y orientación contextual](017-decoracion-frontend/spec.md) | sin cambios de backend; gobernanza de controles frontend | AppShell, cabeceras, inicios, recorridos y estados vacíos | preferencia local de recorridos, sin datos de negocio | [#22](https://github.com/Andres-back/Calificator/issues/22) |

| 018 | [Recursos y calificación fluida](018-recursos-calificacion-fluida/spec.md) | herramientas, evaluaciones y calificaciones | recurso en materia, edición contextual y revisión responsive | sin tablas nuevas; estados y jobs existentes | [#24](https://github.com/Andres-back/Calificator/issues/24) |

| 020 | [Extracción visual robusta con DeepSeek](020-deepseek-vision/spec.md) | adaptador de visión, calificaciones, digitalización y workers | estados de calificación/digitalización existentes | extracción visual, respuestas por página y telemetría | [#27](https://github.com/Andres-back/Calificator/issues/27) |
## Reglas de propiedad

- Cada módulo backend, módulo frontend, familia de endpoints y tabla activa pertenece a una fila.
- Los componentes compartidos se documentan en 002; su comportamiento de negocio se documenta en el dominio consumidor.
- Una nueva superficie requiere actualizar este índice dentro del mismo PR.
- Las inconsistencias detectadas se registran como issues; la línea base no cambia funcionalidad silenciosamente.
## Inventario técnico global

- [Inventario canónico JSON](system-inventory/current.json)
- [Especificación del generador y gate de deriva](013-inventario-tecnico-exhaustivo/spec.md)
